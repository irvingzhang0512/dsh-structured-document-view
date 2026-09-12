/**
 * View 桥接的共享类型：命令、消息、镜像、错误码。
 *
 * 宿主（Node）与客户端（浏览器）共享本模块。客户端持有权威 View State
 * 与文档，镜像到宿主；宿主 Tool 通过命令派发变更、读取镜像。
 */
import type { NodeId, StructuredDocument } from './ir.ts'
import type { MindMapLayout, ViewFilter, ViewName } from './view-state.ts'

/** 文档大纲节点（get_view_state 返回给 Agent 的紧凑结构）。 */
export interface OutlineNode {
  id: NodeId
  title: string
  role: string
  children: OutlineNode[]
}

/** 客户端推送给宿主的视图状态快照（wire 形式，null 字段省略）。 */
export interface ViewStateWire {
  sessionId: string
  currentView: ViewName
  selectedNodeId?: NodeId
  selectedNodeTitle?: string
  focusedNodeId?: NodeId
  expandedNodeIds: NodeId[]
  collapsedNodeIds: NodeId[]
  depth: number | null
  zoom: number
  pan: { x: number; y: number }
  layout: MindMapLayout
  filter: ViewFilter | null
  /** 当前文档信息（用于 Agent 定位节点）。 */
  document?: {
    id: string
    title: string
    profile: string
    revision: number
    providerId: string
    providerName: string
  }
  /** 文档大纲（压缩层级，用于 Agent 解析 node id）。 */
  outline: OutlineNode[]
  outlineTruncated?: boolean
  updatedAt: number
}

/** 宿主镜像：每会话最近一次客户端推送的状态。 */
export interface ViewStateMirror {
  sessionId: string
  connected: boolean
  state: ViewStateWire | null
  updatedAt: number
}

/** 一方向客户端派发的命令（Tool → View State）。 */
export type ViewCommand =
  | { name: 'set_view'; view: ViewName }
  | { name: 'expand_node'; node?: string }
  | { name: 'collapse_node'; node?: string }
  | { name: 'focus_node'; node?: string }
  | { name: 'set_depth'; depth: number | null }
  | { name: 'set_layout'; layout: MindMapLayout }
  | { name: 'set_filter'; filter: ViewFilter | null }
  | { name: 'reset_view' }
  | { name: 'open_tab' }
  | { name: 'sync_state' }

/** 命令名集合（wire 校验用）。 */
export const VIEW_COMMAND_NAMES: readonly string[] = [
  'set_view',
  'expand_node',
  'collapse_node',
  'focus_node',
  'set_depth',
  'set_layout',
  'set_filter',
  'reset_view',
  'open_tab',
  'sync_state',
]

/** 客户端 → 宿主消息。 */
export type ClientToHostMessage =
  | { type: 'hello'; sessionId: string }
  | { type: 'state'; state: ViewStateWire }
  | { type: 'command-result'; result: CommandAck }
  | /** 用户在视图点击节点：把选中同步给宿主文档数据源。 */
    { type: 'select-node'; nodeId: string | null }
  | /** 当前文件变化（better-sidebar 快照联动，宿主转交结构化文档服务）。 */
    { type: 'current-file'; path: string | null }

/** 宿主能力声明（握手时下发）。 */
export interface HostCapabilities {
  /** 宿主侧是否激活了 dsh-structured-document 文档集成。 */
  structuredDocument: boolean
}

/** 宿主 → 客户端：hello 应答（能力协商；客户端据此决定数据源模式）。 */
export interface HostHelloAckMessage {
  type: 'hello-ack'
  capabilities: HostCapabilities
}

/** 宿主推送的文档快照（dsh-structured-document 集成；document 为 null 表示无文档）。 */
export interface HostDocumentMessage {
  type: 'document'
  document: StructuredDocument | null
  selectedNodeId: string | null
  currentFile: string | null
}

/** 宿主推送的选中变化。 */
export interface HostSelectionMessage {
  type: 'selection'
  selectedNodeId: string | null
}

/** 宿主 → 客户端消息。 */
export type HostToClientMessage =
  | { type: 'command'; id: string; command: ViewCommand }
  | HostHelloAckMessage
  | HostDocumentMessage
  | HostSelectionMessage

/** 客户端桥处理器（含宿主文档推送）。 */
export interface BridgeClientHandlerSet {
  /** 处理一条命令并返回 ack 载荷。 */
  onCommand(id: string, command: ViewCommand): { ok: boolean; code: string; message: string; value?: Record<string, unknown> }
  /** 宿主能力声明（hello 应答）。 */
  onCapabilities?(capabilities: HostCapabilities): void
  /** 宿主文档快照推送。 */
  onDocument?(message: HostDocumentMessage): void
  /** 宿主选中变化推送。 */
  onSelection?(message: HostSelectionMessage): void
}

/** 命令确认（含可选的返回值）。 */
export interface CommandAck {
  id: string
  ok: boolean
  code: string
  message: string
  /** 可选的结构化返回值（如操作后的视图状态快照）。 */
  value?: Record<string, unknown>
}

/** 派发结果（宿主 Tool 视角）。 */
export interface DispatchOutcome {
  delivered: boolean
  queued: boolean
  ack: CommandAck | null
}

/** View 相关错误码。 */
export type ViewCode =
  | 'OK'
  | 'QUEUED'
  | 'BRIDGE_TIMEOUT'
  | 'VIEW_UNAVAILABLE'
  | 'NO_AGENT'
  | 'NO_SESSION'
  | 'NO_SELECTED_NODE'
  | 'NODE_NOT_FOUND'
  | 'MULTIPLE_NODES_FOUND'
  | 'INVALID_VIEW'
  | 'INVALID_LAYOUT'
  | 'INVALID_DEPTH'
  | 'INVALID_FILTER'
  | 'DOCUMENT_UNAVAILABLE'
  | 'UNKNOWN_COMMAND'
  | 'INTERNAL_ERROR'

/** 已知错误码（wire 校验用）。 */
export const KNOWN_VIEW_CODES: Record<ViewCode, true> = {
  OK: true,
  QUEUED: true,
  BRIDGE_TIMEOUT: true,
  VIEW_UNAVAILABLE: true,
  NO_AGENT: true,
  NO_SESSION: true,
  NO_SELECTED_NODE: true,
  NODE_NOT_FOUND: true,
  MULTIPLE_NODES_FOUND: true,
  INVALID_VIEW: true,
  INVALID_LAYOUT: true,
  INVALID_DEPTH: true,
  INVALID_FILTER: true,
  DOCUMENT_UNAVAILABLE: true,
  UNKNOWN_COMMAND: true,
  INTERNAL_ERROR: true,
}
