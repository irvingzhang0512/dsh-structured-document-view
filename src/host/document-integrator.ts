/**
 * HostDocumentIntegrator（宿主文档集成层）：把 dsh-structured-document 的
 * `ctx.structuredDocument` 服务接到 View 桥（ViewBridgeServer）上。
 *
 * 数据流：
 * - 客户端 hello → 订阅该会话工作区变化 + 推送当前文档快照；
 * - 工作区变化（bound/document/selection/unbound）→ 推送 document /
 *   selection 消息给该会话的浏览器端（HostBackedDocumentProvider 消费）；
 * - 客户端 select-node → 同步选中到工作区（SessionWorkspace.selectNode）；
 * - 客户端 current-file → 设置会话当前文件（触发懒绑定/重绑）。
 *
 * 依赖是**结构类型**（不 import dsh-structured-document 的任何代码）：
 * 宿主通过 `ctx.get('structuredDocument')` 拿到服务实例；服务缺失时
 * 本集成层不激活（视图插件回退 Mock 数据源）。
 */
import type { StructuredDocument } from '../shared/ir.ts'
import type { ClientToHostMessage } from '../shared/types.ts'
import type { ViewBridgeServer } from './bridge-server.ts'

/** 工作区变化（结构取型自 dsh-structured-document 的 WorkspaceChange）。 */
export interface WorkspaceChangeLike {
  kind: 'bound' | 'unbound' | 'document' | 'selection'
}

/** 文档快照（结构取型自 dsh-structured-document 的 DocumentSnapshot）。 */
export interface DocumentSnapshotLike {
  document: StructuredDocument
  selectedNodeId: string | null
  currentFile: string | null
}

/** 结构化文档服务的最小结构面（宿主软依赖）。 */
export interface StructuredDocumentServiceLike {
  selectNode(sessionId: string, nodeId: string | null): void
  setCurrentFile(sessionId: string, filePath: string | null): void
  subscribe(sessionId: string, listener: (change: WorkspaceChangeLike) => void): () => void
  getDocumentSnapshot(sessionId: string): DocumentSnapshotLike | null
}

/** 构造选项。 */
export interface HostDocumentIntegratorOptions {
  service: StructuredDocumentServiceLike
  bridge: ViewBridgeServer
}

/** 宿主文档集成层。 */
export class HostDocumentIntegrator {
  private readonly service: StructuredDocumentServiceLike
  private readonly bridge: ViewBridgeServer
  private readonly subscriptions = new Map<string, () => void>()
  /** 每会话最近一次推送的 (revision, selectedNodeId, currentFile)；用于去重。 */
  private readonly lastPushed = new Map<string, { revision: number; selectedNodeId: string | null; currentFile: string | null }>()
  private disposed = false

  constructor(options: HostDocumentIntegratorOptions) {
    this.service = options.service
    this.bridge = options.bridge
  }

  /** 处理一条客户端消息（hello / select-node / current-file）。 */
  handleMessage(sessionId: string, message: ClientToHostMessage): void {
    if (this.disposed) return
    switch (message.type) {
      case 'hello':
        this.syncSession(sessionId)
        break
      case 'select-node':
        this.service.selectNode(sessionId, message.nodeId)
        break
      case 'current-file':
        this.service.setCurrentFile(sessionId, message.path)
        break
      default:
        break
    }
  }

  /** 同步会话：订阅工作区变化并推送当前快照。 */
  syncSession(sessionId: string): void {
    if (this.disposed) return
    if (!this.subscriptions.has(sessionId)) {
      const unsubscribe = this.service.subscribe(sessionId, (change) => this.onChange(sessionId, change))
      this.subscriptions.set(sessionId, unsubscribe)
    }
    this.pushDocument(sessionId)
  }

  /** 释放：退订全部会话。 */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const unsubscribe of this.subscriptions.values()) {
      try {
        unsubscribe()
      } catch {
        // 忽略退订异常。
      }
    }
    this.subscriptions.clear()
    this.lastPushed.clear()
  }

  private onChange(sessionId: string, change: WorkspaceChangeLike): void {
    if (this.disposed) return
    switch (change.kind) {
      case 'bound':
      case 'document':
        this.pushDocument(sessionId)
        break
      case 'selection':
        this.pushSelection(sessionId)
        break
      case 'unbound':
        this.lastPushed.delete(sessionId)
        this.bridge.push(sessionId, { type: 'document', document: null, selectedNodeId: null, currentFile: null })
        break
    }
  }

  private pushDocument(sessionId: string): void {
    const snapshot = this.service.getDocumentSnapshot(sessionId)
    if (snapshot === null) {
      // 服务无该会话快照（未绑定）：推空文档并清去重记录。
      const last = this.lastPushed.get(sessionId)
      this.lastPushed.delete(sessionId)
      if (last !== undefined) {
        this.bridge.push(sessionId, { type: 'document', document: null, selectedNodeId: null, currentFile: null })
      }
      return
    }
    const key = { revision: snapshot.document.revision, selectedNodeId: snapshot.selectedNodeId, currentFile: snapshot.currentFile }
    const last = this.lastPushed.get(sessionId)
    if (
      last !== undefined &&
      last.revision === key.revision &&
      last.selectedNodeId === key.selectedNodeId &&
      last.currentFile === key.currentFile
    ) {
      // 无实质变化（Agent 连续操作或重复事件）：跳过，避免重复全量推送。
      return
    }
    this.lastPushed.set(sessionId, key)
    this.bridge.push(sessionId, {
      type: 'document',
      document: snapshot.document,
      selectedNodeId: snapshot.selectedNodeId,
      currentFile: snapshot.currentFile,
    })
  }

  private pushSelection(sessionId: string): void {
    const snapshot = this.service.getDocumentSnapshot(sessionId)
    this.bridge.push(sessionId, { type: 'selection', selectedNodeId: snapshot?.selectedNodeId ?? null })
  }
}
