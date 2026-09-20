/**
 * 视图状态（View State）类型与纯函数 reducer。
 *
 * 原则：View State 只影响"怎么看"，绝不修改文档 IR。所有变更都通过
 * 纯函数产生新状态（不可变更新），便于测试与镜像同步。
 *
 * 本模块同时被宿主（Node）与客户端（浏览器）共享：客户端持有权威状态
 * 并镜像到宿主；宿主 Tool 通过镜像读取、通过命令派发变更。
 */
import type { NodeId, NodeProperties } from './ir.ts'

/** 三种视图（V0.1）。 */
export const VIEW_NAMES = ['markdown', 'mindmap', 'table'] as const
export type ViewName = (typeof VIEW_NAMES)[number]

export const READER_MODES = ['section', 'document'] as const
export type ReaderMode = (typeof READER_MODES)[number]
export type ViewDepths = Record<ViewName, number | null>

/** 视图中文名（用于展示与 Skill 文档）。 */
export const VIEW_LABELS: Record<ViewName, string> = {
  markdown: 'Markdown 视图',
  mindmap: '思维导图视图',
  table: '表格视图',
}

/**
 * 思维导图布局。取值与 mind-elixir 的 direction 对齐：
 * - 'mind'    思维导图（根节点左右两侧展开；direction=2）
 * - 'logical' 逻辑图（右侧单侧展开；direction=1）
 * - 'down'    上下（自上而下展开；direction=3）
 *
 * 备注：需求文档提到过的"鱼骨图"在 mind-elixir v5 中无对应布局，
 * 因此 V0.1 提供 mind / logical / down 三种布局（见 docs/architecture.md
 * 的设计决策 D4）。
 */
export const MIND_MAP_LAYOUTS = ['mind', 'logical', 'down'] as const
export type MindMapLayout = (typeof MIND_MAP_LAYOUTS)[number]

/** 布局中文名。 */
export const LAYOUT_LABELS: Record<MindMapLayout, string> = {
  mind: '思维导图',
  logical: '逻辑图',
  down: '上下',
}

/** 布局 → mind-elixir direction 常量。 */
export const LAYOUT_DIRECTIONS: Record<MindMapLayout, 0 | 1 | 2 | 3> = {
  mind: 2,
  logical: 1,
  down: 3,
}

/**
 * 筛选条件。满足条件 = 角色匹配 或 任一属性匹配。
 * 树形展示时，路径上祖先始终可见（祖先不满足条件但后代满足时保留）。
 */
export interface ViewFilter {
  /** 按角色筛选（如 task / risk / action_item）。 */
  role?: string
  /** 按属性筛选（键与值都要匹配，可多属性"且"关系）。 */
  properties?: NodeProperties
}

/** 视图状态（与文档内容分离）。 */
export interface ViewState {
  /** 当前视图。 */
  currentView: ViewName
  /** 当前选中节点（来自文档侧 Selected Node）。 */
  selectedNodeId: NodeId | null
  /** 聚焦节点（思维导图居中定位目标）。 */
  focusedNodeId: NodeId | null
  /** 显式展开的节点。 */
  expandedNodeIds: NodeId[]
  /** 显式收起的节点。 */
  collapsedNodeIds: NodeId[]
  /** 显示层级；null 表示不限。 */
  depth: number | null
  /** 各视图独立的显示层级；depth 始终镜像当前视图的值。 */
  viewDepths: ViewDepths
  /** Markdown 阅读范围：当前章节或整篇文档。 */
  readerMode: ReaderMode
  /** 大纲自身的收起状态，不影响正文或思维导图。 */
  outlineCollapsedNodeIds: NodeId[]
  /** 缩放比例（思维导图）。 */
  zoom: number
  /** 画布位置（思维导图）。 */
  pan: { x: number; y: number }
  /** 思维导图布局。 */
  layout: MindMapLayout
  /** 筛选条件；null 表示不过滤。 */
  filter: ViewFilter | null
}

/** 默认视图状态。 */
export const DEFAULT_VIEW_STATE: ViewState = {
  currentView: 'markdown',
  selectedNodeId: null,
  focusedNodeId: null,
  expandedNodeIds: [],
  collapsedNodeIds: [],
  depth: null,
  viewDepths: { markdown: null, mindmap: 2, table: null },
  readerMode: 'section',
  outlineCollapsedNodeIds: [],
  zoom: 1,
  pan: { x: 0, y: 0 },
  layout: 'logical',
  filter: null,
}

/** 生成一份全新的默认状态（避免共享同一对象导致意外突变）。 */
export function createDefaultViewState(): ViewState {
  return {
    currentView: 'markdown',
    selectedNodeId: null,
    focusedNodeId: null,
    expandedNodeIds: [],
    collapsedNodeIds: [],
    depth: null,
    viewDepths: { markdown: null, mindmap: 2, table: null },
    readerMode: 'section',
    outlineCollapsedNodeIds: [],
    zoom: 1,
    pan: { x: 0, y: 0 },
    layout: 'logical',
    filter: null,
  }
}

function without<T>(list: readonly T[], value: T): T[] {
  return list.filter(item => item !== value)
}

function withUnique<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? [...list] : [...list, value]
}

/** 切换视图。 */
export function setView(state: ViewState, view: ViewName): ViewState {
  if (state.currentView === view) return state
  return { ...state, currentView: view, depth: state.viewDepths[view] }
}

/** 设置选中节点（当前节点）。 */
export function setSelectedNode(state: ViewState, nodeId: NodeId | null): ViewState {
  if (state.selectedNodeId === nodeId) return state
  return { ...state, selectedNodeId: nodeId }
}

/**
 * 聚焦节点：同时设置聚焦节点与选中节点（聚焦隐含"把节点带到眼前并同步
 * 当前节点"）。nodeId 为 null 时仅清除聚焦。
 */
export function setFocusedNode(state: ViewState, nodeId: NodeId | null): ViewState {
  const next: ViewState = { ...state, focusedNodeId: nodeId }
  if (nodeId !== null && nodeId !== state.selectedNodeId) {
    next.selectedNodeId = nodeId
  }
  return next
}

/** 展开节点（从收起列表移除，加入显式展开列表）。 */
export function expandNode(state: ViewState, nodeId: NodeId): ViewState {
  const collapsedNodeIds = without(state.collapsedNodeIds, nodeId)
  const expandedNodeIds = withUnique(state.expandedNodeIds, nodeId)
  if (collapsedNodeIds.length === state.collapsedNodeIds.length && expandedNodeIds.length === state.expandedNodeIds.length) {
    return state
  }
  return { ...state, collapsedNodeIds, expandedNodeIds }
}

/** 收起节点（加入收起列表，从显式展开列表移除）。 */
export function collapseNode(state: ViewState, nodeId: NodeId): ViewState {
  const expandedNodeIds = without(state.expandedNodeIds, nodeId)
  const collapsedNodeIds = withUnique(state.collapsedNodeIds, nodeId)
  if (expandedNodeIds.length === state.expandedNodeIds.length && collapsedNodeIds.length === state.collapsedNodeIds.length) {
    return state
  }
  return { ...state, expandedNodeIds, collapsedNodeIds }
}

/** 设置显示层级；depth 为 null 表示不限。 */
export function setDepth(state: ViewState, depth: number | null): ViewState {
  if (state.depth === depth && state.viewDepths[state.currentView] === depth) return state
  return { ...state, depth, viewDepths: { ...state.viewDepths, [state.currentView]: depth } }
}

export function setReaderMode(state: ViewState, readerMode: ReaderMode): ViewState {
  return state.readerMode === readerMode ? state : { ...state, readerMode }
}

export function toggleOutlineNode(state: ViewState, nodeId: NodeId): ViewState {
  const collapsed = state.outlineCollapsedNodeIds.includes(nodeId)
  return {
    ...state,
    outlineCollapsedNodeIds: collapsed
      ? without(state.outlineCollapsedNodeIds, nodeId)
      : withUnique(state.outlineCollapsedNodeIds, nodeId),
  }
}

/** 设置思维导图布局。 */
export function setLayout(state: ViewState, layout: MindMapLayout): ViewState {
  if (state.layout === layout) return state
  return { ...state, layout }
}

/** 设置缩放比例（仅用于思维导图交互回写）。 */
export function setZoom(state: ViewState, zoom: number): ViewState {
  if (state.zoom === zoom || !Number.isFinite(zoom) || zoom <= 0) return state
  return { ...state, zoom }
}

/** 设置画布位置（仅用于思维导图交互回写）。 */
export function setPan(state: ViewState, x: number, y: number): ViewState {
  if (state.pan.x === x && state.pan.y === y) return state
  return { ...state, pan: { x, y } }
}

/** 设置筛选条件；null 表示清除筛选。 */
export function setFilter(state: ViewState, filter: ViewFilter | null): ViewState {
  return { ...state, filter }
}

/**
 * 恢复默认视图：重置视图类型、展开/收起、层级、缩放、平移、布局、筛选、
 * 聚焦；保留当前选中节点（"恢复默认视图"不应丢失当前节点）。
 */
export function resetView(state: ViewState): ViewState {
  return {
    ...createDefaultViewState(),
    selectedNodeId: state.selectedNodeId,
  }
}

/**
 * 判断一个节点是否因层级限制而被隐藏。
 *
 * 语义：depth 为 null（不限）时不限制；否则层级 level（根 = 1）大于 depth
 * 的节点隐藏，除非该节点处于"显式展开"链上（underExplicitExpand 为 true）。
 * 显式展开（expanded_node_ids 中的节点或其祖先）会突破层级限制——
 * 这是"只显示两层，但我要展开第二个议题"这类组合指令能生效的关键。
 */
export function isDepthLimited(level: number, depth: number | null, underExplicitExpand: boolean): boolean {
  if (depth === null) return false
  if (level <= depth) return false
  return !underExplicitExpand
}

/**
 * 判断一个节点是否处于收起状态。
 * 优先级：显式收起（collapsed_node_ids） > 层级限制（可被显式展开突破）。
 */
export function isCollapsed(
  nodeId: NodeId,
  level: number,
  state: ViewState,
  underExplicitExpand = false,
): boolean {
  if (state.collapsedNodeIds.includes(nodeId)) return true
  const explicitlyExpanded = state.expandedNodeIds.includes(nodeId)
  return isDepthLimited(level, state.depth, underExplicitExpand || explicitlyExpanded)
}

/**
 * 判断一个节点是否满足当前筛选条件（自身匹配；树形祖先由调用方处理）。
 *
 * 语义为 AND 组合：role（若指定）必须匹配，且 properties 的每个键值都必须
 * 匹配（全部条件同时满足才显示）。这样「只看张三的进行中任务」可用
 * { role: 'task', properties: { owner: '张三', status: '进行中' } } 表达。
 */
export function nodeMatchesFilter(node: { role: string; properties: NodeProperties }, filter: ViewFilter | null): boolean {
  if (filter === null) return true
  if (filter.role !== undefined && filter.role !== '' && node.role !== filter.role) return false
  const props = filter.properties
  if (props !== undefined) {
    for (const [key, value] of Object.entries(props)) {
      if (node.properties[key] !== value) return false
    }
  }
  return true
}
