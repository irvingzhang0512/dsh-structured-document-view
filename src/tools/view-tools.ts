/**
 * View Tools（视图工具）。
 *
 * 每个工具职责单一（没有万能 command Tool）；返回统一结构信封
 * `{ ok, code, message, delivered, queued, ... }` + 独立文本投影。
 * 工具只修改 **View State**（视图状态），绝不直接修改文档 IR。
 *
 * 会话作用域：工具绑定调用方 Agent 的会话（`exec.agent.session.id`）。
 * 变更类工具把命令派发给该会话的浏览器客户端（View Bridge），客户端执行后
 * ack 并推送新状态回宿主镜像；get_view_state 从镜像读取。
 *
 * 节点参数 `node`（expand/collapse/focus）：接受 Node ID（node_023）、
 * 别名 current（当前选中节点，缺省值）、或标题（客户端按标题包含匹配解析；
 * 多候选返回 MULTIPLE_NODES_FOUND）。Agent 可先 get_view_state 查看
 * outline 拿到准确 Node ID。
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ParameterPropertySpec, ToolRunContext } from '@deepseek-ai/dsh-tools'
import type { DispatchOutcome, ViewCommand, ViewCode, ViewStateWire } from '../shared/types.ts'
import { MIND_MAP_LAYOUTS, VIEW_NAMES } from '../shared/view-state.ts'
import { guideEntries, type GuideLevel } from '../shared/command-guide.ts'
import type { ViewMirrorStore } from '../host/mirror-store.ts'
import type { ViewBridgeServer } from '../host/bridge-server.ts'

/** 全部工具名（SKILL / docs 契约测试用）。 */
export const VIEW_TOOL_NAMES = [
  'set_view',
  'get_view_state',
  'expand_node',
  'collapse_node',
  'focus_node',
  'open_node',
  'set_reader_mode',
  'navigate_section',
  'set_zoom',
  'fit_view',
  'reset_viewport',
  'get_view_help',
  'set_depth',
  'set_layout',
  'set_filter',
  'reset_view',
  'open_view_tab',
] as const

export type ViewToolName = (typeof VIEW_TOOL_NAMES)[number]

/** 桥的最小面（ViewBridgeServer 的子集）。 */
export interface ViewBridge {
  isAttached(sessionId: string): boolean
  dispatch(sessionId: string, command: ViewCommand, waitMs?: number): Promise<DispatchOutcome>
}

/** 工具需要的宿主依赖（可注入测试）。 */
export interface ViewToolDeps {
  mirror: ViewMirrorStore
  bridge: ViewBridge
  /** 命令等待客户端 ack 的超时。 */
  ackTimeoutMs?: number
}

/** 基础结果信封。 */
export interface BaseResult {
  ok: boolean
  code: ViewCode
  message: string
}

function failure(code: ViewCode, message: string): BaseResult {
  return { ok: false, code, message }
}

function success(code: ViewCode, message: string): BaseResult {
  return { ok: true, code, message }
}

/** 提取调用方 Agent 的会话 id（防御性结构读取）。 */
function sessionIdOf(exec: ToolRunContext): string | null {
  const agent = exec.agent as { session?: { id?: string } } | undefined
  const id = agent?.session?.id
  return typeof id === 'string' && id !== '' ? id : null
}

/** 要求调用方会话；否则返回规范的结构错误。 */
function requireSession(exec: ToolRunContext): { sessionId: string } | { error: BaseResult } {
  const sessionId = sessionIdOf(exec)
  if (sessionId === null) {
    return { error: failure('NO_AGENT', '无法确定调用方会话（工具需要由会话中的 Agent 调用）。') }
  }
  return { sessionId }
}

/** 把一次派发结果映射为结构工具结果（ack 为执行确认；权威状态走镜像推送）。 */
function outcomeResult<V extends object>(
  outcome: DispatchOutcome,
  okMessage: string,
  queuedMessage: string,
  value: V,
): BaseResult & V & { delivered: boolean; queued: boolean } {
  if (outcome.ack !== null) {
    if (outcome.ack.ok) {
      return {
        ...success((outcome.ack.code as ViewCode | undefined) ?? 'OK', outcome.ack.message ?? okMessage),
        delivered: true,
        queued: false,
        ...value,
      }
    }
    return {
      ...failure((outcome.ack.code as ViewCode | undefined) ?? 'INTERNAL_ERROR', outcome.ack.message ?? '客户端执行失败。'),
      delivered: true,
      queued: false,
      ...value,
    }
  }
  if (outcome.queued) {
    return {
      ...success('QUEUED', queuedMessage),
      delivered: false,
      queued: true,
      ...value,
    }
  }
  return {
    ...failure('BRIDGE_TIMEOUT', '视图客户端未在预期时间内确认操作，请稍后重试或确认结构化文档视图已打开。'),
    delivered: true,
    queued: false,
    ...value,
  }
}

/** 结果文本投影（规范值保持结构化）。 */
function textOf(result: BaseResult & Record<string, unknown>): string {
  const lines: string[] = [`[${result.code}] ${result.message}`]
  if (result.currentView !== undefined) lines.push(`当前视图: ${String(result.currentView)}`)
  if (result.selectedNodeTitle !== undefined) lines.push(`当前节点: ${String(result.selectedNodeTitle)}`)
  if (result.delivered === true && result.queued === false) lines.push('（已应用）')
  if (result.queued === true) lines.push('（操作已排队，将在视图打开时自动应用）')
  return lines.join('\n')
}

/** 信封公共字段。 */
const baseEnvelope = {
  ok: { type: 'boolean' as const, required: true as const, description: '是否成功。' },
  code: { type: 'string' as const, required: true as const, description: '状态 / 错误码。' },
  message: { type: 'string' as const, required: true as const, description: '人类可读的结果说明。' },
} satisfies Record<string, ParameterPropertySpec>

/** 通用额外字段：投递结果。 */
const deliveryEnvelope = {
  delivered: { type: 'boolean' as const, required: true as const, description: '命令是否已送达视图客户端。' },
  queued: { type: 'boolean' as const, required: true as const, description: '是否已排队（客户端未连接，将在视图打开时自动应用）。' },
} satisfies Record<string, ParameterPropertySpec>

function outputWith<const E extends Record<string, ParameterPropertySpec>>(extra: E): {
  type: 'object'
  additionalProperties: false
  properties: typeof baseEnvelope & E
} {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      ...baseEnvelope,
      ...extra,
    },
  }
}

/** 节点参数 schema（expand/collapse/focus 共用）。 */
const nodeParameter: ParameterPropertySpec = {
  type: 'string',
  description:
    '要操作的节点：Node ID（如 node_023）、别名 current（当前选中节点，缺省值）、或节点标题（按标题包含匹配解析）。'
    + '可用 get_view_state 的 outline 查看节点与 Node ID。',
}

/** 视图枚举。 */
const viewEnum: ParameterPropertySpec = {
  type: 'string',
  enum: [...VIEW_NAMES],
  description: '目标视图：markdown（Markdown 视图）/ mindmap（思维导图视图）/ table（表格视图）。',
}

/** 布局枚举。 */
const layoutEnum: ParameterPropertySpec = {
  type: 'string',
  enum: [...MIND_MAP_LAYOUTS],
  description: '思维导图布局：mind（思维导图，两侧）/ logical（逻辑图，右侧）/ down（上下）。',
}

/** 大纲节点 schema。 */
const outlineNodeSchema: ParameterPropertySpec = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', required: true, description: 'Node ID。' },
    title: { type: 'string', required: true, description: '标题。' },
    role: { type: 'string', required: true, description: '角色。' },
    // 嵌套子节点:输出 DSL 不支持递归 schema,故放宽为 additionalProperties: true;
    // 若写成 additionalProperties:false 且无允许属性,任何深度 ≥2 的
    // 大纲都会导致 get_view_state 输出校验失败(matched 0)。
    children: { type: 'array', items: { type: 'object', additionalProperties: true }, description: '子节点。' },
  },
  description: '大纲节点。',
}

/** 筛选条件 schema（参数 / 输出 / 视图状态共用）。 */
const filterObjectSchema: ParameterPropertySpec = {
  type: 'object',
  additionalProperties: false,
  description: '筛选条件；省略 filter 或传空对象 {} 表示清除筛选。role 与 properties 之间、properties 各键之间均为 AND(全部条件同时满足才显示)。',
  properties: {
    role: { type: 'string', description: '按角色筛选(如 task / risk / action_item / idea)。' },
    properties: { type: 'object', additionalProperties: false, description: '按属性筛选(如 { owner: "张三", status: "进行中" }，键值都要匹配)。' },
  },
}

/** 输出 schema 的可空包装（value DSL 的 oneOf(null, T)；仅用于输出，参数不支持）。 */
function nullableSchema(schema: ParameterPropertySpec): ParameterPropertySpec {
  return { oneOf: [{ type: 'null' }, schema] } as unknown as ParameterPropertySpec
}

/** 视图状态 schema（get_view_state 的核心，null 字段省略）。 */
const viewStateSchema: ParameterPropertySpec = {
  type: 'object',
  additionalProperties: false,
  properties: {
    currentView: { type: 'string', required: true, description: '当前视图：markdown / mindmap / table。' },
    selectedNodeId: { type: 'string', description: '当前选中节点 Node ID（无则省略）。' },
    selectedNodeTitle: { type: 'string', description: '当前选中节点标题（无则省略）。' },
    focusedNodeId: { type: 'string', description: '聚焦节点 Node ID（无则省略）。' },
    expandedNodeIds: { type: 'array', items: { type: 'string' }, required: true, description: '显式展开的节点列表。' },
    collapsedNodeIds: { type: 'array', items: { type: 'string' }, required: true, description: '显式收起的节点列表。' },
    depth: { type: 'integer', required: true, description: '显示层级（0 表示不限；根为第 1 层）。' },
    viewDepths: { type: 'object', required: true, additionalProperties: false, properties: { markdown: nullableSchema({ type: 'integer' }), mindmap: nullableSchema({ type: 'integer' }), table: nullableSchema({ type: 'integer' }) }, description: '三个视图各自的显示层级。' },
    readerMode: { type: 'string', required: true, description: 'Markdown 阅读模式：section / document。' },
    outlineCollapsedNodeIds: { type: 'array', items: { type: 'string' }, required: true, description: '仅在大纲中收起的节点。' },
    selectedNodePath: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { id: { type: 'string' }, title: { type: 'string' } } }, description: '当前节点从文档根开始的路径。' },
    zoom: { type: 'number', required: true, description: '缩放比例。' },
    pan: { type: 'object', required: true, additionalProperties: false, properties: { x: { type: 'number' }, y: { type: 'number' } }, description: '画布位置。' },
    layout: { type: 'string', required: true, description: '思维导图布局。' },
    filter: filterObjectSchema,
    document: { type: 'object', additionalProperties: false, properties: { id: { type: 'string' }, title: { type: 'string' }, profile: { type: 'string' }, revision: { type: 'integer' }, providerId: { type: 'string' }, providerName: { type: 'string' } }, description: '当前文档信息（无则省略）。' },
    outline: { type: 'array', items: outlineNodeSchema, required: true, description: '文档大纲（用于定位 Node ID）。' },
    outlineTruncated: { type: 'boolean', description: '大纲是否因过大被截断。' },
    updatedAt: { type: 'integer', required: true, description: '状态更新时间（epoch ms）。' },
  },
  description: '当前视图状态；客户端未连接或无状态时为 null。',
}

/** 把镜像 wire 转成 get_view_state 的输出视图（null 字段省略）。 */
function wireToView(wire: ViewStateWire): Record<string, unknown> {
  const view: Record<string, unknown> = {
    currentView: wire.currentView,
    expandedNodeIds: wire.expandedNodeIds,
    collapsedNodeIds: wire.collapsedNodeIds,
    depth: wire.depth ?? 0,
    viewDepths: wire.viewDepths,
    readerMode: wire.readerMode,
    outlineCollapsedNodeIds: wire.outlineCollapsedNodeIds,
    zoom: wire.zoom,
    pan: wire.pan,
    layout: wire.layout,
    outline: wire.outline,
    updatedAt: wire.updatedAt,
  }
  if (wire.selectedNodeId !== undefined) view.selectedNodeId = wire.selectedNodeId
  if (wire.selectedNodeTitle !== undefined) view.selectedNodeTitle = wire.selectedNodeTitle
  if (wire.focusedNodeId !== undefined) view.focusedNodeId = wire.focusedNodeId
  if (wire.selectedNodePath !== undefined) view.selectedNodePath = wire.selectedNodePath
  if (wire.filter !== null && wire.filter !== undefined) view.filter = wire.filter
  if (wire.document !== undefined) view.document = wire.document
  if (wire.outlineTruncated === true) view.outlineTruncated = true
  return view
}

/** 注册全部视图工具；返回组合 disposer。 */
export function registerViewTools(ctx: { tools: { register(tool: unknown): () => void } }, deps: ViewToolDeps): () => void {
  const disposers: Array<() => void> = []
  const ackTimeoutMs = deps.ackTimeoutMs

  // ── 1. set_view ────────────────────────────────────────────────────────
  disposers.push(ctx.tools.register(defineTool({
    name: 'set_view',
    description:
      '切换视图：markdown（大纲与章节阅读）/ mindmap（思维导图总览）/ table（表格查看角色与属性）。'
      + '适合「切成思维导图」「用表格看一下」「切成 Markdown」。',
    parameters: { view: viewEnum },
    output: {
      schema: outputWith({
        ...deliveryEnvelope,
        currentView: { type: 'string', required: true, description: '切换后的视图。' },
      }),
      render: (_args, value) => [{ type: 'text', text: textOf(value as never) }],
    },
    execute: async (args, exec) => {
      exec.signal.throwIfAborted()
      const session = requireSession(exec)
      if ('error' in session) return session.error as never
      const view = String((args as { view?: unknown }).view ?? '')
      if (!(VIEW_NAMES as readonly string[]).includes(view)) {
        return { ...failure('INVALID_VIEW', `未知视图：${view}（可用：${VIEW_NAMES.join(' / ')}）。`), delivered: false, queued: false, currentView: view }
      }
      const outcome = await deps.bridge.dispatch(session.sessionId, { name: 'set_view', view: view as typeof VIEW_NAMES[number] }, ackTimeoutMs)
      return outcomeResult(outcome, `已切换为${view}视图。`, '视图客户端未连接，切换操作已排队。', { currentView: view })
    },
  })))

  // ── 2. get_view_state ─────────────────────────────────────────────────
  disposers.push(ctx.tools.register(defineTool({
    name: 'get_view_state',
    description:
      '获取当前结构化文档视图状态：当前视图、当前节点、聚焦节点、展开/收起节点、显示层级、缩放、平移、布局、筛选、'
      + '当前文档信息与完整大纲（含 Node ID）。适合「现在是什么视图」「展开到第几层」「当前节点是什么」。'
      + '需要定位节点（expand/collapse/focus）时，先调用本工具从 outline 拿到准确 Node ID。',
    parameters: {},
    output: {
      schema: outputWith({
        connected: { type: 'boolean', required: true, description: '视图客户端是否已连接。' },
        viewState: nullableSchema(viewStateSchema),
      }),
      render: (_args, value) => [{ type: 'text', text: renderViewState(value as never) }],
    },
    execute: async (_args, exec) => {
      exec.signal.throwIfAborted()
      const session = requireSession(exec)
      if ('error' in session) return session.error as never
      const { sessionId } = session
      if (deps.bridge.isAttached(sessionId)) {
        await deps.bridge.dispatch(sessionId, { name: 'sync_state' }, ackTimeoutMs)
      }
      const mirror = deps.mirror.get(sessionId)
      if (mirror === undefined || mirror.state === null) {
        return {
          ...failure('VIEW_UNAVAILABLE', '尚未获取到视图状态：该会话的视图客户端未连接。请确认已安装 dsh-better-sidebar 与 dsh-structured-document-view，且已打开「结构化文档」视图页。'),
          connected: false,
          viewState: null,
        }
      }
      return {
        ...success('OK', '已获取当前视图状态。'),
        connected: mirror.connected,
        viewState: wireToView(mirror.state) as never,
      }
    },
  })))

  // ── 3/4/5. expand_node / collapse_node / focus_node ───────────────────
  const nodeMutationTool = (name: 'expand_node' | 'collapse_node' | 'focus_node'): void => {
    const labels: Record<typeof name, { description: string; ok: string; queued: string }> = {
      expand_node: {
        description: '展开节点：显示该节点的子节点（显式展开可突破层级限制）。node 缺省为当前选中节点。适合「把这个节点展开」「展开第二个议题」。',
        ok: '节点已展开。',
        queued: '视图客户端未连接，展开操作已排队。',
      },
      collapse_node: {
        description: '收起节点：隐藏该节点的子节点。node 缺省为当前选中节点。适合「把其他部分收起来」「收起这个分支」。',
        ok: '节点已收起。',
        queued: '视图客户端未连接，收起操作已排队。',
      },
      focus_node: {
        description: '聚焦节点：把指定节点设为当前节点并在视图中居中定位（思维导图会滚到该节点）。node 缺省为当前选中节点。适合「聚焦当前节点」「聚焦算法方案这一块」。',
        ok: '节点已聚焦。',
        queued: '视图客户端未连接，聚焦操作已排队。',
      },
    }
    disposers.push(ctx.tools.register(defineTool({
      name,
      description: labels[name].description,
      parameters: {
        node: nodeParameter,
        ...(name === 'focus_node' ? { mode: { type: 'string', enum: ['visible', 'center'], description: 'visible=仅在看不全时移动；center=移到中央（默认）。' } as ParameterPropertySpec } : {}),
      },
      output: {
        schema: outputWith({
          ...deliveryEnvelope,
          nodeId: { type: 'string', required: true, description: '实际操作的节点 Node ID。' },
          nodeTitle: { type: 'string', required: true, description: '实际操作的节点标题。' },
        }),
        render: (_args, value) => [{ type: 'text', text: textOf(value as never) }],
      },
      execute: async (args, exec) => {
        exec.signal.throwIfAborted()
        const session = requireSession(exec)
        if ('error' in session) return session.error as never
        const node = typeof (args as { node?: unknown }).node === 'string' ? (args as { node: string }).node : undefined
        const mode = name === 'focus_node' && ((args as { mode?: unknown }).mode === 'visible' || (args as { mode?: unknown }).mode === 'center')
          ? (args as { mode: 'visible' | 'center' }).mode
          : undefined
        const command = (node === undefined
          ? { name, ...(mode !== undefined ? { mode } : {}) }
          : { name, node, ...(mode !== undefined ? { mode } : {}) }) as ViewCommand
        const outcome = await deps.bridge.dispatch(session.sessionId, command, ackTimeoutMs)
        const ackValue = (outcome.ack?.value ?? {}) as Record<string, unknown>
        return outcomeResult(
          outcome,
          labels[name].ok,
          labels[name].queued,
          {
            nodeId: String(ackValue.nodeId ?? ''),
            nodeTitle: String(ackValue.nodeTitle ?? ''),
            ...(outcome.ack?.ok === true ? { selectedNodeTitle: ackValue.selectedNodeTitle } : {}),
          },
        )
      },
    })))
  }
  nodeMutationTool('expand_node')
  nodeMutationTool('collapse_node')
  nodeMutationTool('focus_node')

  disposers.push(ctx.tools.register(defineTool({
    name: 'open_node',
    description: '在 Markdown 章节阅读器中打开节点及其全部子节点，并把它设为当前节点。适合「打开第二技术路线」「看这个章节」。同名节点会返回候选，不会猜测。',
    parameters: { node: nodeParameter },
    output: { schema: outputWith({ ...deliveryEnvelope, nodeId: { type: 'string', required: true }, nodeTitle: { type: 'string', required: true }, currentView: { type: 'string', required: true }, readerMode: { type: 'string', required: true } }), render: (_args, value) => [{ type: 'text', text: textOf(value as never) }] },
    execute: async (args, exec) => {
      exec.signal.throwIfAborted()
      const session = requireSession(exec)
      if ('error' in session) return session.error as never
      const node = typeof (args as { node?: unknown }).node === 'string' ? (args as { node: string }).node : undefined
      const outcome = await deps.bridge.dispatch(session.sessionId, { name: 'open_node', ...(node === undefined ? {} : { node }) }, ackTimeoutMs)
      const value = outcome.ack?.value ?? {}
      return outcomeResult(outcome, '已打开章节。', '视图客户端未连接，打开章节操作已排队。', { nodeId: String(value.nodeId ?? ''), nodeTitle: String(value.nodeTitle ?? ''), currentView: 'markdown', readerMode: 'section' })
    },
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'set_reader_mode',
    description: '切换 Markdown 阅读范围。section 只看当前章节及其全部子节点；document 查看整篇并定位当前节点。适合「只看当前章节」「查看全文」。',
    parameters: { mode: { type: 'string', enum: ['section', 'document'], description: 'section / document。' } },
    output: { schema: outputWith({ ...deliveryEnvelope, currentView: { type: 'string', required: true }, readerMode: { type: 'string', required: true } }), render: (_args, value) => [{ type: 'text', text: textOf(value as never) }] },
    execute: async (args, exec) => {
      exec.signal.throwIfAborted()
      const session = requireSession(exec)
      if ('error' in session) return session.error as never
      const mode = (args as { mode?: unknown }).mode
      if (mode !== 'section' && mode !== 'document') return { ...failure('INVALID_VIEW', 'mode 必须是 section 或 document。'), delivered: false, queued: false, currentView: 'markdown', readerMode: String(mode ?? '') }
      const outcome = await deps.bridge.dispatch(session.sessionId, { name: 'set_reader_mode', mode }, ackTimeoutMs)
      return outcomeResult(outcome, '已切换阅读范围。', '视图客户端未连接，阅读范围操作已排队。', { currentView: 'markdown', readerMode: mode })
    },
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'navigate_section',
    description: '在当前节点的同级章节间移动。适合「上一节」「下一节」。到达本组边界时明确返回，不跨层级猜测。',
    parameters: { direction: { type: 'string', enum: ['previous', 'next'], description: 'previous / next。' } },
    output: { schema: outputWith({ ...deliveryEnvelope, direction: { type: 'string', required: true }, nodeId: { type: 'string', required: true }, nodeTitle: { type: 'string', required: true } }), render: (_args, value) => [{ type: 'text', text: textOf(value as never) }] },
    execute: async (args, exec) => {
      exec.signal.throwIfAborted()
      const session = requireSession(exec)
      if ('error' in session) return session.error as never
      const direction = (args as { direction?: unknown }).direction
      if (direction !== 'previous' && direction !== 'next') return { ...failure('INVALID_VIEW', 'direction 必须是 previous 或 next。'), delivered: false, queued: false, direction: String(direction ?? ''), nodeId: '', nodeTitle: '' }
      const outcome = await deps.bridge.dispatch(session.sessionId, { name: 'navigate_section', direction }, ackTimeoutMs)
      const value = outcome.ack?.value ?? {}
      return outcomeResult(outcome, '已切换章节。', '视图客户端未连接，章节导航操作已排队。', { direction, nodeId: String(value.nodeId ?? ''), nodeTitle: String(value.nodeTitle ?? '') })
    },
  })))

  // ── 思维导图视口工具 ─────────────────────────────────────────────────
  disposers.push(ctx.tools.register(defineTool({
    name: 'set_zoom',
    description: '调整思维导图缩放。zoom 指定 0.3-3 的比例；factor 按当前比例缩放，二者只能提供一个。适合「放大一点」「缩小一点」「缩放到 80%」。',
    parameters: {
      zoom: { type: 'number', description: '目标缩放比例，0.3-3（如 0.8 表示 80%）。' },
      factor: { type: 'number', description: '相对缩放倍数（如 1.25 放大，0.8 缩小）。' },
    },
    output: { schema: outputWith({ ...deliveryEnvelope, zoom: { type: 'number', required: true, description: '实际缩放比例。' } }), render: (_args, value) => [{ type: 'text', text: textOf(value as never) }] },
    execute: async (args, exec) => {
      const session = requireSession(exec)
      if ('error' in session) return session.error as never
      const zoom = (args as { zoom?: unknown }).zoom
      const factor = (args as { factor?: unknown }).factor
      if ((typeof zoom === 'number') === (typeof factor === 'number') || (typeof zoom === 'number' && (zoom < 0.3 || zoom > 3)) || (typeof factor === 'number' && factor <= 0)) {
        return { ...failure('INVALID_ZOOM', 'zoom 与 factor 必须且只能提供一个；zoom 范围为 0.3-3，factor 必须大于 0。'), delivered: false, queued: false, zoom: 0 }
      }
      const command: ViewCommand = typeof zoom === 'number' ? { name: 'set_zoom', zoom } : { name: 'set_zoom', factor: factor as number }
      const outcome = await deps.bridge.dispatch(session.sessionId, command, ackTimeoutMs)
      const actual = Number(outcome.ack?.value?.zoom ?? zoom ?? 0)
      return outcomeResult(outcome, '已调整缩放。', '缩放操作已排队。', { zoom: actual })
    },
  })))

  const viewportTool = (name: 'fit_view' | 'reset_viewport', description: string, ok: string): void => {
    disposers.push(ctx.tools.register(defineTool({
      name,
      description,
      parameters: {},
      output: { schema: outputWith({ ...deliveryEnvelope, zoom: { type: 'number', description: '操作后的缩放比例。' } }), render: (_args, value) => [{ type: 'text', text: textOf(value as never) }] },
      execute: async (_args, exec) => {
        const session = requireSession(exec)
        if ('error' in session) return session.error as never
        const outcome = await deps.bridge.dispatch(session.sessionId, { name }, ackTimeoutMs)
        return outcomeResult(outcome, ok, `${ok}操作已排队。`, { zoom: Number(outcome.ack?.value?.zoom ?? 0) })
      },
    })))
  }
  viewportTool('fit_view', '让当前已经显示的思维导图内容适配画布，不改变展开或筛选。适合「显示全图」。', '已显示全图。')
  viewportTool('reset_viewport', '恢复 100% 缩放并居中根节点，保留布局、展开和筛选。适合「重置视口」。', '已重置视口。')

  disposers.push(ctx.tools.register(defineTool({
    name: 'get_view_help',
    description: '获取用户可以直接说出的中文视图指令。level=simple 返回常用短句，combined 返回组合指令。适合「我可以怎么说」「有哪些语音指令」。',
    parameters: { level: { type: 'string', enum: ['simple', 'combined'], description: '帮助级别，默认 simple。' } },
    output: {
      schema: outputWith({ level: { type: 'string', required: true, description: '帮助级别。' }, entries: { type: 'array', required: true, items: { type: 'object', additionalProperties: true }, description: '自然语言指令。' } }),
      render: (_args, value) => {
        const result = value as unknown as BaseResult & { entries?: Array<{ phrase?: string; description?: string }> }
        const lines = [`[${result.code}] ${result.message}`]
        for (const entry of result.entries ?? []) lines.push(`- ${entry.phrase ?? ''}：${entry.description ?? ''}`)
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    execute: async (args) => {
      const level: GuideLevel = (args as { level?: unknown }).level === 'combined' ? 'combined' : 'simple'
      return { ...success('OK', level === 'simple' ? '这些常用指令可以直接说。' : '这些组合指令可以直接说。'), level, entries: guideEntries(level).map(({ id, phrase, description, needsSelection, needsTarget }) => ({ id, phrase, description, needsSelection: needsSelection === true, needsTarget: needsTarget === true })) }
    },
  })))

  // ── 6. set_depth ──────────────────────────────────────────────────────
  disposers.push(ctx.tools.register(defineTool({
    name: 'set_depth',
    description:
      '设置显示层级：只显示前 N 层（根节点为第 1 层）。depth=0 表示不限层级。'
      + '适合「只显示两层」「只显示三层」。注意：显式展开的节点可突破层级限制。',
    parameters: {
      depth: {
        type: 'integer',
        required: true,
        description: '显示的最大层级（根=1；0 表示不限）。范围 0-20。',
      },
    },
    output: {
      schema: outputWith({
        ...deliveryEnvelope,
        depth: { type: 'integer', required: true, description: '设置后的层级（0 表示不限）。' },
      }),
      render: (_args, value) => [{ type: 'text', text: textOf(value as never) }],
    },
    execute: async (args, exec) => {
      exec.signal.throwIfAborted()
      const session = requireSession(exec)
      if ('error' in session) return session.error as never
      const depth = (args as { depth?: unknown }).depth
      if (typeof depth !== 'number' || !Number.isInteger(depth) || depth < 0 || depth > 20) {
        return { ...failure('INVALID_DEPTH', 'depth 必须是 0-20 的整数（0 表示不限层级）。'), delivered: false, queued: false, depth: 0 }
      }
      const outcome = await deps.bridge.dispatch(session.sessionId, { name: 'set_depth', depth: depth === 0 ? null : depth }, ackTimeoutMs)
      return outcomeResult(outcome, depth === 0 ? '已取消层级限制。' : `已设置只显示 ${depth} 层。`, '视图客户端未连接，层级设置已排队。', { depth })
    },
  })))

  // ── 7. set_layout ─────────────────────────────────────────────────────
  disposers.push(ctx.tools.register(defineTool({
    name: 'set_layout',
    description:
      '设置思维导图布局：mind（思维导图，根两侧展开）/ logical（逻辑图，右侧单侧）/ down（上下）。'
      + '适合「改成从左到右布局」（logical）「改成思维导图布局」。',
    parameters: { layout: layoutEnum },
    output: {
      schema: outputWith({
        ...deliveryEnvelope,
        layout: { type: 'string', required: true, description: '设置后的布局。' },
      }),
      render: (_args, value) => [{ type: 'text', text: textOf(value as never) }],
    },
    execute: async (args, exec) => {
      exec.signal.throwIfAborted()
      const session = requireSession(exec)
      if ('error' in session) return session.error as never
      const layout = String((args as { layout?: unknown }).layout ?? '')
      if (!(MIND_MAP_LAYOUTS as readonly string[]).includes(layout)) {
        return { ...failure('INVALID_LAYOUT', `未知布局：${layout}（可用：${MIND_MAP_LAYOUTS.join(' / ')}）。`), delivered: false, queued: false, layout }
      }
      const outcome = await deps.bridge.dispatch(session.sessionId, { name: 'set_layout', layout: layout as typeof MIND_MAP_LAYOUTS[number] }, ackTimeoutMs)
      return outcomeResult(outcome, `已切换为 ${layout} 布局。`, '视图客户端未连接，布局切换已排队。', { layout })
    },
  })))

  // ── 8. set_filter ─────────────────────────────────────────────────────
  disposers.push(ctx.tools.register(defineTool({
    name: 'set_filter',
    description:
      '设置筛选条件（展示过滤，不修改文档）：按角色（role）和属性（properties）筛选可见节点，各条件之间为 AND(全部满足才显示，如「只看张三的进行中任务」→ { role: "task", properties: { owner: "张三", status: "进行中" } })。'
      + '省略 filter 或传空对象 {} 表示清除筛选。树形展示时"自身不匹配但后代匹配"的祖先会保留。'
      + '适合「只看任务」「只看风险」「只看进行中的任务」「清除筛选」。',
    parameters: { filter: filterObjectSchema },
    output: {
      schema: outputWith({
        ...deliveryEnvelope,
        filter: nullableSchema(filterObjectSchema),
      }),
      render: (_args, value) => [{ type: 'text', text: textOf(value as never) }],
    },
    execute: async (args, exec) => {
      exec.signal.throwIfAborted()
      const session = requireSession(exec)
      if ('error' in session) return session.error as never
      const rawFilter = (args as { filter?: unknown }).filter
      // 清除 = 省略 filter / null / 空对象 {}
      const isClear = rawFilter === undefined
        || rawFilter === null
        || (typeof rawFilter === 'object' && !Array.isArray(rawFilter) && Object.keys(rawFilter).length === 0)
      if (!isClear) {
        if (typeof rawFilter !== 'object' || Array.isArray(rawFilter)) {
          return { ...failure('INVALID_FILTER', 'filter 必须是对象；传空对象 {} 表示清除筛选。'), delivered: false, queued: false }
        }
        const record = rawFilter as Record<string, unknown>
        if (record.role !== undefined && typeof record.role !== 'string') {
          return { ...failure('INVALID_FILTER', 'filter.role 必须是字符串。'), delivered: false, queued: false }
        }
        if (record.properties !== undefined && (typeof record.properties !== 'object' || record.properties === null || Array.isArray(record.properties))) {
          return { ...failure('INVALID_FILTER', 'filter.properties 必须是对象。'), delivered: false, queued: false }
        }
      }
      const dispatchFilter = isClear ? null : (rawFilter as Record<string, unknown>)
      const outcome = await deps.bridge.dispatch(session.sessionId, { name: 'set_filter', filter: dispatchFilter as never }, ackTimeoutMs)
      return outcomeResult(outcome, isClear ? '已清除筛选。' : '已设置筛选条件。', '视图客户端未连接，筛选设置已排队。', { filter: dispatchFilter as never })
    },
  })))

  // ── 9. reset_view ─────────────────────────────────────────────────────
  disposers.push(ctx.tools.register(defineTool({
    name: 'reset_view',
    description:
      '恢复默认视图：切换回 Markdown 章节阅读、思维导图默认两层、默认布局、清除筛选与聚焦（保留当前选中节点）。'
      + '适合「恢复默认视图」「回到初始状态」。',
    parameters: {},
    output: {
      schema: outputWith({
        ...deliveryEnvelope,
        currentView: { type: 'string', required: true, description: '重置后的视图（markdown）。' },
      }),
      render: (_args, value) => [{ type: 'text', text: textOf(value as never) }],
    },
    execute: async (_args, exec) => {
      exec.signal.throwIfAborted()
      const session = requireSession(exec)
      if ('error' in session) return session.error as never
      const outcome = await deps.bridge.dispatch(session.sessionId, { name: 'reset_view' }, ackTimeoutMs)
      return outcomeResult(outcome, '已恢复默认视图。', '视图客户端未连接，重置操作已排队。', { currentView: 'markdown' })
    },
  })))

  // ── 10. open_view_tab ─────────────────────────────────────────────────
  disposers.push(ctx.tools.register(defineTool({
    name: 'open_view_tab',
    description:
      '打开侧边栏的「结构化文档」视图页签（已打开则激活它），适合「打开结构化文档」「打开视图页」「打开思维导图页签」。',
    parameters: {},
    output: {
      schema: outputWith({
        ...deliveryEnvelope,
      }),
      render: (_args, value) => [{ type: 'text', text: textOf(value as never) }],
    },
    execute: async (_args, exec) => {
      exec.signal.throwIfAborted()
      const session = requireSession(exec)
      if ('error' in session) return session.error as never
      const outcome = await deps.bridge.dispatch(session.sessionId, { name: 'open_tab' }, ackTimeoutMs)
      return outcomeResult(outcome, '已打开「结构化文档」视图页签。', '视图客户端未连接，打开操作已排队。', {})
    },
  })))

  return () => {
    for (const dispose of disposers) {
      try {
        dispose()
      } catch {
        // 忽略退订异常。
      }
    }
  }
}

/** get_view_state 结果的文本投影。 */
function renderViewState(value: Record<string, unknown>): string {
  if (value.connected !== true || value.viewState === null || value.viewState === undefined) {
    return `[${String(value.code ?? 'VIEW_UNAVAILABLE')}] ${String(value.message ?? '视图客户端未连接。')}`
  }
  const view = value.viewState as Record<string, unknown>
  const lines: string[] = []
  lines.push(`[OK] 视图: ${String(view.currentView ?? '?')}`)
  lines.push(`文档: ${String((view.document as Record<string, unknown> | undefined)?.title ?? '?')}（provider: ${String((view.document as Record<string, unknown> | undefined)?.providerId ?? '?')}）`)
  lines.push(`当前节点: ${view.selectedNodeTitle !== undefined ? String(view.selectedNodeTitle) : '（无）'}${view.selectedNodeId !== undefined ? ` (${String(view.selectedNodeId)})` : ''}`)
  lines.push(`聚焦节点: ${view.focusedNodeId !== undefined ? String(view.focusedNodeId) : '（无）'}`)
  lines.push(`展开节点: ${(view.expandedNodeIds as unknown[] | undefined)?.length ?? 0} 个 / 收起节点: ${(view.collapsedNodeIds as unknown[] | undefined)?.length ?? 0} 个`)
  lines.push(`层级: ${view.depth === 0 ? '不限' : `前 ${String(view.depth)} 层`} · 布局: ${String(view.layout ?? '?')} · 缩放: ${String(view.zoom ?? 1)}`)
  lines.push(`阅读模式: ${String(view.readerMode ?? 'section')} · 节点路径: ${Array.isArray(view.selectedNodePath) ? view.selectedNodePath.map(item => String((item as Record<string, unknown>).title ?? '')).join(' / ') : '（无）'}`)
  lines.push(`筛选: ${view.filter !== undefined ? JSON.stringify(view.filter) : '无'}`)
  const outline = view.outline as unknown[] | undefined
  if (Array.isArray(outline)) {
    lines.push(`大纲节点数: ${outline.length}${view.outlineTruncated === true ? '（已截断）' : ''}`)
  }
  return lines.join('\n')
}
