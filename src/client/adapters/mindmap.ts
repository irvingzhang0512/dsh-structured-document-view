/**
 * 思维导图适配层：把"文档 IR + 视图状态"转换为思维导图的数据模型。
 *
 * 设计要点：
 * - 输出是**框架无关**的 {@link MindMapViewModel}（只含 id/topic/expanded/children），
 *   真正的 mind-elixir 转换在组件层（mindmap-view.tsx）进行，这样本适配层
 *   可以在 Node 测试中直接验证，不依赖 mind-elixir 安装。
 * - **Node ID 保持一致**：导出节点的 `id` 就是结构化文档的原始 Node ID
 *   （如 `node_023`），保证"点击节点 → 知道对应哪个文档节点"。
 * - 收起（collapsed / depth）的节点仍保留子节点数据并标记 expanded:false，
 *   这样 mind-elixir 能显示展开器；展开/收起由视图状态驱动（事件回流见
 *   mindmap-view.tsx）。
 * - 筛选（filter）会裁剪不匹配的子树，但保留"自身不匹配、后代匹配"的祖先。
 */
import type { DocNode, StructuredDocument } from '../../shared/ir.ts'
import { isCollapsed, isDepthLimited, LAYOUT_DIRECTIONS, nodeMatchesFilter, type MindMapLayout, type ViewState } from '../../shared/view-state.ts'
import { nodeDisplayTitle } from './markdown.ts'

/** 思维导图节点模型（框架无关）。 */
export interface MindMapNodeModel {
  id: string
  /** 节点展示文本（标题或内容摘要）。 */
  topic: string
  /** 是否展开子节点（false = 收起，mind-elixir 显示展开器）。 */
  expanded: boolean
  /** 文档角色（用于组件层图标/样式）。 */
  role: string
  children: MindMapNodeModel[]
}

/** 思维导图数据模型（框架无关）。 */
export interface MindMapViewModel {
  /** 根节点。 */
  root: MindMapNodeModel
  /** mind-elixir direction：0 左 / 1 右 / 2 两侧 / 3 上下。 */
  direction: 0 | 1 | 2 | 3
  /** 当前布局（视图状态原样，供组件层展示）。 */
  layout: MindMapLayout
  /** 文档标题。 */
  title: string
  /** 文档角色 → 展示图标（可选）。 */
  roleIcons: Record<string, string>
}

/** 常见角色的展示图标（需求第 8 章的 ☑ / ⚠ / ? 风格）。 */
export const ROLE_ICONS: Record<string, string> = {
  task: '☑',
  action_item: '☑',
  risk: '⚠',
  problem: '⚠',
  question: '?',
  idea: '✦',
  solution: '➤',
  topic: '◆',
  decision: '✔',
  conclusion: '★',
  milestone: '◉',
  objective: '◎',
  key_result: '▣',
  discussion: '•',
  note: '·',
}

function mapNode(
  node: DocNode,
  level: number,
  state: ViewState,
  underExplicitExpand: boolean,
): MindMapNodeModel | null {
  // 深度限制：level 超过 depth 且不在显式展开链上 → 整枝隐藏（与
  // view-tree 语义一致：三种视图对"层级限制"的解释必须相同）。
  const depthLimited = isDepthLimited(level, state.depth, underExplicitExpand)
  if (depthLimited && level > 1) return null

  const childUnderExpand = underExplicitExpand || state.expandedNodeIds.includes(node.id)
  const mappedChildren: MindMapNodeModel[] = []
  let subtreeMatches = false
  for (const child of node.children) {
    const mapped = mapNode(child, level + 1, state, childUnderExpand)
    if (mapped !== null) {
      subtreeMatches = true
      mappedChildren.push(mapped)
    }
  }
  const matches = nodeMatchesFilter(node, state.filter)
  if (!matches && !subtreeMatches && level > 1) return null // 筛选裁剪（根与匹配祖先保留）
  const expanded = !isCollapsed(node.id, level, state, underExplicitExpand)
  return {
    id: node.id,
    topic: nodeDisplayTitle(node),
    expanded,
    role: node.role,
    children: mappedChildren,
  }
}

/** 计算思维导图数据模型。 */
export function toMindMapViewModel(document: StructuredDocument, state: ViewState): MindMapViewModel {
  const mindmapState = { ...state, depth: state.viewDepths.mindmap }
  const root = mapNode(document.root, 1, mindmapState, false)
  if (root === null) {
    // 理论不可达：根恒可见。
    return {
      root: { id: document.root.id, topic: nodeDisplayTitle(document.root), expanded: true, role: document.root.role, children: [] },
      direction: LAYOUT_DIRECTIONS[state.layout],
      layout: state.layout,
      title: document.title,
      roleIcons: { ...ROLE_ICONS },
    }
  }
  return {
    root,
    direction: LAYOUT_DIRECTIONS[state.layout],
    layout: state.layout,
    title: document.title,
    roleIcons: { ...ROLE_ICONS },
  }
}
