/**
 * ViewRuntime（视图会话运行时）：一个会话的"文档 + 视图状态"聚合体。
 *
 * 组装 MockDocumentProvider → DocumentBridge → ViewStateStore，并承担：
 * - 执行来自宿主 Tool 的 ViewCommand（只改 View State，不改文档 IR）；
 * - 回应用户在视图中的交互（点击节点 → select_node 同步给文档侧；
 *   展开/收起 → 更新视图状态）；
 * - 把"视图状态 + 文档大纲 + 选中节点"推送到宿主镜像。
 *
 * 未来替换数据源：仅换 Provider 实现，本运行时其余逻辑不变。
 */
import { MockDocumentProvider } from '../document/mock-provider.ts'
import { DocumentBridge } from '../document/document-bridge.ts'
import { HostBackedDocumentProvider, type HostDocumentPush } from './document/host-backed-provider.ts'
import type { DocNode, NodeId } from '../shared/ir.ts'
import type { ClientToHostMessage, CommandAck, ViewCommand, ViewStateWire } from '../shared/types.ts'
import {
  collapseNode as reducerCollapseNode,
  expandNode as reducerExpandNode,
  resetView as reducerResetView,
  setDepth as reducerSetDepth,
  setFilter as reducerSetFilter,
  setFocusedNode as reducerSetFocusedNode,
  setLayout as reducerSetLayout,
  setSelectedNode as reducerSetSelectedNode,
  setView as reducerSetView,
  type ViewState,
} from '../shared/view-state.ts'
import { toOutline } from './adapters/outline.ts'
import { ViewStateStore } from './view-state-store.ts'

/** 命令执行结果（ack 载荷）。 */
export interface CommandAckPayload {
  ok: boolean
  code: string
  message: string
  value?: Record<string, unknown>
}

/** 状态推送目标（宿主桥连接）。 */
export interface RuntimePushTarget {
  (wire: ViewStateWire): void
}

/** 桥消息发送目标（select-node / current-file 等上行消息）。 */
export interface RuntimeBridgeSend {
  (message: ClientToHostMessage): void
}

/** 由已挂载的思维导图提供；命令完成代表画布已经实际更新。 */
export interface MindMapViewportController {
  focusNode(nodeId: NodeId, mode: 'visible' | 'center'): Promise<CommandAckPayload>
  setZoom(command: { zoom?: number; factor?: number }): Promise<CommandAckPayload>
  fitView(): Promise<CommandAckPayload>
  resetViewport(): Promise<CommandAckPayload>
}

/** 状态推送去抖间隔（ms），避免缩放/平移高频事件刷爆桥。 */
const PUSH_DEBOUNCE_MS = 80

/** 视图会话运行时。 */
export class ViewRuntime {
  readonly mockProvider: MockDocumentProvider
  readonly hostProvider: HostBackedDocumentProvider
  bridge: DocumentBridge
  readonly store: ViewStateStore
  private readonly sessionId: string
  private readonly pushTarget: RuntimePushTarget
  private readonly sendBridgeMessage: RuntimeBridgeSend | undefined
  /** 打开「结构化文档」侧边栏页签的回调（由客户端 apply 注入）。 */
  private readonly openTab: (() => void) | undefined
  private hostMode = false
  private pushTimer: ReturnType<typeof setTimeout> | undefined
  private disposed = false
  private readonly unsubscribers: Array<() => void> = []
  private readonly runtimeListeners = new Set<() => void>()
  private viewportController: MindMapViewportController | null = null
  private viewportWaiters: Array<(controller: MindMapViewportController | null) => void> = []

  constructor(sessionId: string, pushTarget: RuntimePushTarget, sendBridgeMessage?: RuntimeBridgeSend, activeDocumentId?: string, openTab?: () => void) {
    this.sessionId = sessionId
    this.pushTarget = pushTarget
    this.sendBridgeMessage = sendBridgeMessage
    this.openTab = openTab
    this.mockProvider = new MockDocumentProvider(activeDocumentId === undefined ? undefined : { activeDocumentId })
    this.hostProvider = new HostBackedDocumentProvider({
      sendSelectNode: (nodeId) => this.sendBridgeMessage?.({ type: 'select-node', nodeId }),
    })
    this.bridge = new DocumentBridge(this.mockProvider)
    this.store = new ViewStateStore()

    // 文档/选中变化 → 重新对齐状态并推送。
    this.attachBridge(this.bridge)
    this.unsubscribers.push(
      this.store.subscribe(() => {
        if (this.disposed) return
        this.schedulePush()
      }),
    )
  }

  /** 订阅运行时级变化（文档源切换等）；返回退订函数。 */
  subscribe(listener: () => void): () => void {
    this.runtimeListeners.add(listener)
    return () => this.runtimeListeners.delete(listener)
  }

  /** 是否使用宿主文档数据源（dsh-structured-document 集成激活）。 */
  isHostMode(): boolean {
    return this.hostMode
  }

  /** 宿主能力声明（hello 应答）：structuredDocument 为 true 时立即切宿主模式。 */
  applyCapabilities(capabilities: { structuredDocument: boolean }): void {
    if (this.disposed) return
    if (capabilities.structuredDocument && !this.hostMode) {
      this.switchToHost()
      this.emitRuntimeChange()
    }
  }

  /** 宿主文档快照推送：切换数据源（Mock → 宿主）并刷新视图。 */
  applyHostDocument(push: HostDocumentPush): void {
    if (this.disposed) return
    this.hostProvider.applyDocument(push)
    if (!this.hostMode) {
      this.switchToHost()
    } else {
      // 已切换：applyDocument 的 emit 已驱动 bridge → reconcile + 推送。
      this.reconcileSelection()
      this.pushNow()
    }
    this.emitRuntimeChange()
  }

  /** 宿主选中变化推送。 */
  applyHostSelection(nodeId: NodeId | null): void {
    if (this.disposed) return
    this.hostProvider.applySelection(nodeId)
    // bridge 订阅会 reconcile 视图选中并推送镜像。
  }

  /** 当前文件联动：把 better-sidebar 快照的当前文件同步给宿主文档服务。 */
  sendCurrentFile(path: string | null): void {
    if (this.disposed) return
    this.sendBridgeMessage?.({ type: 'current-file', path })
  }

  /** 当前文件（宿主模式）；未绑定 null。 */
  get currentFile(): string | null {
    return this.hostProvider.currentFile
  }

  private switchToHost(): void {
    if (this.hostMode) return
    this.hostMode = true
    this.bridge.dispose()
    this.bridge = new DocumentBridge(this.hostProvider)
    this.attachBridge(this.bridge)
    this.reconcileSelection()
    this.pushNow()
  }

  private attachBridge(bridge: DocumentBridge): void {
    this.unsubscribers.push(
      bridge.subscribe(() => {
        if (this.disposed) return
        this.reconcileSelection()
        this.schedulePush()
      }),
    )
  }

  private emitRuntimeChange(): void {
    for (const listener of [...this.runtimeListeners]) {
      try {
        listener()
      } catch {
        // 监听器异常不阻断运行时。
      }
    }
  }

  // ── 命令执行（来自宿主 Tool）────────────────────────────────────────────

  /** 执行一条 ViewCommand；返回 ack 载荷。 */
  applyCommand(command: ViewCommand): CommandAckPayload {
    if (this.disposed) return { ok: false, code: 'INTERNAL_ERROR', message: '运行时已释放。' }
    switch (command.name) {
      case 'set_view':
        return this.applySetView(command.view)
      case 'expand_node':
        return this.applyNodeToggle(command, 'expand')
      case 'collapse_node':
        return this.applyNodeToggle(command, 'collapse')
      case 'focus_node':
        return this.applyFocus(command.node)
      case 'set_zoom':
      case 'fit_view':
      case 'reset_viewport':
        return { ok: false, code: 'VIEW_NOT_READY', message: '思维导图画布尚未准备好。' }
      case 'set_depth':
        return this.applySetDepth(command.depth)
      case 'set_layout':
        return this.applySetLayout(command.layout)
      case 'set_filter':
        return this.applySetFilter(command.filter)
      case 'reset_view':
        return this.applyReset()
      case 'open_tab':
        // 打开视图页签是 better-sidebar 侧操作（由注入回调执行），
        // 不改变视图状态，无需推送镜像。
        this.openTab?.()
        return { ok: true, code: 'OK', message: '已打开「结构化文档」视图页签。' }
      case 'sync_state':
        this.pushNow()
        return { ok: true, code: 'OK', message: '已同步视图状态。' }
      default:
        return { ok: false, code: 'UNKNOWN_COMMAND', message: `未知命令：${(command as { name?: string }).name ?? '?'}` }
    }
  }

  /** 桥和界面使用的异步入口：视口类命令等待实际画布操作完成。 */
  async applyCommandAsync(command: ViewCommand): Promise<CommandAckPayload> {
    if (command.name === 'focus_node') {
      const prepared = this.applyFocus(command.node)
      if (!prepared.ok) return prepared
      const nodeId = String(prepared.value?.nodeId ?? '')
      const controller = await this.waitForViewport()
      if (controller === null || this.store.getState().currentView !== 'mindmap') {
        return { ok: false, code: 'VIEW_NOT_READY', message: '请先打开并切换到思维导图视图。', value: prepared.value }
      }
      const located = await controller.focusNode(nodeId, command.mode ?? 'center')
      if (!located.ok && located.code === 'NODE_HIDDEN') {
        return { ...located, message: this.hiddenNodeMessage(nodeId), value: prepared.value }
      }
      return { ...located, value: { ...prepared.value, ...located.value } }
    }
    const controller = await this.waitForViewport()
    if (command.name === 'set_zoom' || command.name === 'fit_view' || command.name === 'reset_viewport') {
      if (controller === null || this.store.getState().currentView !== 'mindmap') {
        return { ok: false, code: 'VIEW_NOT_READY', message: '请先打开并切换到思维导图视图。' }
      }
      if (command.name === 'set_zoom') return controller.setZoom(command)
      if (command.name === 'fit_view') return controller.fitView()
      return controller.resetViewport()
    }
    return this.applyCommand(command)
  }

  registerViewportController(controller: MindMapViewportController): () => void {
    this.viewportController = controller
    for (const resolve of this.viewportWaiters.splice(0)) resolve(controller)
    return () => {
      if (this.viewportController === controller) this.viewportController = null
    }
  }

  private waitForViewport(timeoutMs = 1000): Promise<MindMapViewportController | null> {
    if (this.viewportController !== null) return Promise.resolve(this.viewportController)
    if (this.store.getState().currentView !== 'mindmap') return Promise.resolve(null)
    return new Promise(resolve => {
      const done = (controller: MindMapViewportController | null): void => {
        clearTimeout(timer)
        const index = this.viewportWaiters.indexOf(done)
        if (index >= 0) this.viewportWaiters.splice(index, 1)
        resolve(controller)
      }
      const timer = setTimeout(() => done(null), timeoutMs)
      this.viewportWaiters.push(done)
    })
  }

  private hiddenNodeMessage(nodeId: NodeId): string {
    const state = this.store.getState()
    const document = this.bridge.getDocument()
    const path: DocNode[] = []
    const find = (node: DocNode): boolean => {
      path.push(node)
      if (node.id === nodeId) return true
      for (const child of node.children) if (find(child)) return true
      path.pop()
      return false
    }
    if (document !== null) find(document.root)
    const collapsed = path.slice(0, -1).find(node => state.collapsedNodeIds.includes(node.id))
    if (collapsed !== undefined) return `目标节点被已收起的上级节点「${nodeTitle(collapsed)}」隐藏，请先展开该节点。`
    if (state.filter !== null) return '目标节点不在当前筛选结果中，请先清除或调整筛选。'
    if (state.depth !== null) return `目标节点超出当前 ${state.depth} 层显示限制，请增加层级或展开其上级节点。`
    return '目标节点当前未渲染，可能被收起、层级限制或筛选隐藏。'
  }

  private applySetView(view: 'markdown' | 'mindmap' | 'table'): CommandAckPayload {
    this.store.update(state => reducerSetView(state, view))
    this.pushNow()
    return { ok: true, code: 'OK', message: `已切换为 ${view} 视图。`, value: { currentView: view } }
  }

  private applyNodeToggle(command: { node?: string }, action: 'expand' | 'collapse'): CommandAckPayload {
    const resolved = this.bridge.resolveNode(command.node)
    if (!resolved.ok) return { ok: false, code: resolved.code, message: resolved.message }
    const node = resolved.node
    const hasChildren = node.children.length > 0
    if (!hasChildren) {
      return {
        ok: true,
        code: 'OK',
        message: `节点「${nodeTitle(node)}」没有子节点，${action === 'expand' ? '无需展开' : '无需收起'}。`,
        value: { nodeId: node.id, nodeTitle: nodeTitle(node) },
      }
    }
    this.store.update(state => (action === 'expand' ? reducerExpandNode(state, node.id) : reducerCollapseNode(state, node.id)))
    this.pushNow()
    return {
      ok: true,
      code: 'OK',
      message: action === 'expand' ? `已展开节点「${nodeTitle(node)}」。` : `已收起节点「${nodeTitle(node)}」。`,
      value: { nodeId: node.id, nodeTitle: nodeTitle(node), selectedNodeTitle: this.selectedTitle() },
    }
  }

  private applyFocus(rawRef: string | undefined): CommandAckPayload {
    const resolved = this.bridge.resolveNode(rawRef)
    if (!resolved.ok) return { ok: false, code: resolved.code, message: resolved.message }
    const node = resolved.node
    this.store.update(state => reducerSetFocusedNode(state, node.id))
    // 聚焦隐含"当前节点"同步到文档侧。
    const selectResult = this.bridge.selectNode(node.id)
    if (!selectResult.ok) {
      return { ok: false, code: selectResult.code, message: selectResult.message }
    }
    this.pushNow()
    return {
      ok: true,
      code: 'OK',
      message: `已聚焦节点「${nodeTitle(node)}」。`,
      value: { nodeId: node.id, nodeTitle: nodeTitle(node), selectedNodeTitle: nodeTitle(node) },
    }
  }

  private applySetDepth(depth: number | null): CommandAckPayload {
    this.store.update(state => reducerSetDepth(state, depth))
    this.pushNow()
    return {
      ok: true,
      code: 'OK',
      message: depth === null ? '已取消层级限制。' : `已设置只显示 ${depth} 层。`,
      value: { depth: depth ?? 0 },
    }
  }

  private applySetLayout(layout: 'mind' | 'logical' | 'down'): CommandAckPayload {
    this.store.update(state => reducerSetLayout(state, layout))
    this.pushNow()
    return { ok: true, code: 'OK', message: `已切换为 ${layout} 布局。`, value: { layout } }
  }

  private applySetFilter(filter: { role?: string; properties?: Record<string, string | number | boolean> } | null): CommandAckPayload {
    if (filter !== null && filter.role === undefined && filter.properties === undefined) {
      return { ok: false, code: 'INVALID_FILTER', message: '筛选条件为空：请至少提供 role 或 properties。' }
    }
    this.store.update(state => reducerSetFilter(state, filter))
    this.pushNow()
    return {
      ok: true,
      code: 'OK',
      message: filter === null ? '已清除筛选。' : '已设置筛选条件。',
      value: { filter: filter ?? null },
    }
  }

  private applyReset(): CommandAckPayload {
    this.store.update(state => reducerResetView(state))
    this.pushNow()
    return { ok: true, code: 'OK', message: '已恢复默认视图。', value: { currentView: 'markdown' } }
  }

  // ── 用户交互（来自视图组件）──────────────────────────────────────────────

  /** 用户点击节点：同步给文档侧（select_node）并更新视图状态。 */
  handleUserSelectNode(nodeId: NodeId): void {
    if (this.disposed) return
    const selectResult = this.bridge.selectNode(nodeId)
    if (!selectResult.ok) return
    this.store.update(state => reducerSetSelectedNode(state, nodeId))
    this.pushNow()
  }

  /** 用户在思维导图点击展开/收起按钮：更新视图状态。 */
  handleUserToggleNode(nodeId: NodeId): void {
    if (this.disposed) return
    const state = this.store.getState()
    const currentlyCollapsed = state.collapsedNodeIds.includes(nodeId)
    this.store.update(s => (currentlyCollapsed ? reducerExpandNode(s, nodeId) : reducerCollapseNode(s, nodeId)))
    this.pushNow()
  }

  /** 用户缩放/平移思维导图：回写视图状态（pan 为增量）。 */
  applyViewStateChange(patch: { zoom?: number; pan?: { x: number; y: number } }): void {
    if (this.disposed) return
    this.store.update((state) => {
      let next = state
      if (patch.zoom !== undefined) {
        next = { ...next, zoom: patch.zoom }
      }
      if (patch.pan !== undefined) {
        next = { ...next, pan: { x: next.pan.x + patch.pan.x, y: next.pan.y + patch.pan.y } }
      }
      return next
    })
    this.schedulePush()
  }

  /** 切换 Mock 文档（Mock 专属；宿主模式下禁用）。 */
  setActiveDocument(documentId: string): { ok: boolean; message: string } {
    if (this.disposed) return { ok: false, message: '运行时已释放。' }
    if (this.hostMode) return { ok: false, message: '当前使用结构化文档数据源，不支持切换示例文档。' }
    try {
      this.mockProvider.setActiveDocument(documentId)
      return { ok: true, message: `已切换为「${this.mockProvider.getActiveDocumentLabel()}」。` }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : String(error) }
    }
  }

  // ── 状态推送 ─────────────────────────────────────────────────────────────

  /** 构建状态 wire（视图状态 + 文档信息 + 大纲 + 选中）。 */
  buildWire(): ViewStateWire {
    const state = this.store.getState()
    const document = this.bridge.getDocument()
    const selected = this.bridge.getSelectedNode()
    const { outline, truncated } = document === null ? { outline: [], truncated: false } : toOutline(document)
    const wire: ViewStateWire = {
      sessionId: this.sessionId,
      currentView: state.currentView,
      expandedNodeIds: state.expandedNodeIds,
      collapsedNodeIds: state.collapsedNodeIds,
      depth: state.depth,
      zoom: state.zoom,
      pan: state.pan,
      layout: state.layout,
      filter: state.filter,
      outline,
      updatedAt: Date.now(),
    }
    if (selected !== null) {
      wire.selectedNodeId = selected.id
      wire.selectedNodeTitle = selected.title
    }
    if (state.focusedNodeId !== null) wire.focusedNodeId = state.focusedNodeId
    if (document !== null) {
      const provider = this.bridge.getProvider()
      wire.document = {
        id: document.id,
        title: document.title,
        profile: document.profile,
        revision: document.revision,
        providerId: provider.id,
        providerName: provider.displayName,
      }
    }
    if (truncated) wire.outlineTruncated = true
    return wire
  }

  /** 立即推送（命令执行后）。 */
  pushNow(): void {
    if (this.disposed) return
    if (this.pushTimer !== undefined) {
      globalThis.clearTimeout(this.pushTimer)
      this.pushTimer = undefined
    }
    this.pushTarget(this.buildWire())
  }

  /** 去抖推送（文档/交互高频变化）。 */
  private schedulePush(): void {
    if (this.disposed) return
    if (this.pushTimer !== undefined) return
    this.pushTimer = globalThis.setTimeout(() => {
      this.pushTimer = undefined
      if (this.disposed) return
      this.pushTarget(this.buildWire())
    }, PUSH_DEBOUNCE_MS)
  }

  /** 选中失效时清理（文档变化后选中节点可能不存在）。 */
  private reconcileSelection(): void {
    const state = this.store.getState()
    const current = this.bridge.getSelectedNodeId()
    if (state.selectedNodeId !== current) {
      this.store.update(s => reducerSetSelectedNode(s, current))
    }
  }

  private selectedTitle(): string | undefined {
    return this.bridge.getSelectedNode()?.title
  }

  /** 释放运行时。 */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const resolve of this.viewportWaiters.splice(0)) resolve(null)
    this.viewportController = null
    if (this.pushTimer !== undefined) {
      globalThis.clearTimeout(this.pushTimer)
      this.pushTimer = undefined
    }
    for (const unsubscribe of this.unsubscribers) {
      try {
        unsubscribe()
      } catch {
        // 忽略。
      }
    }
    this.runtimeListeners.clear()
    this.bridge.dispose()
    this.mockProvider.dispose()
    this.hostProvider.dispose()
  }
}

function nodeTitle(node: DocNode): string {
  return node.title.trim() !== '' ? node.title : `（未命名节点 ${node.id}）`
}

/** 导出类型（工具输出用）。 */
export type { NodeId, ViewState }
