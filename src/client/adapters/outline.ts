/**
 * 大纲适配层：把文档 IR 折叠成紧凑大纲（供 `get_view_state` 返回给 Agent，
 * 以便 Agent 从大纲中解析 Node ID 再调用 expand/collapse/focus 等工具）。
 */
import type { DocNode, StructuredDocument } from '../../shared/ir.ts'
import type { OutlineNode } from '../../shared/types.ts'

/** 大纲最大深度与最大节点数（防止输出过大撑爆工具结果）。 */
export const OUTLINE_MAX_DEPTH = 8
export const OUTLINE_MAX_NODES = 200

function mapOutlineNode(node: DocNode, depth: number, budget: { count: number; truncated: boolean }): OutlineNode | null {
  if (depth > OUTLINE_MAX_DEPTH || budget.count >= OUTLINE_MAX_NODES) {
    budget.truncated = true
    return null
  }
  budget.count += 1
  return {
    id: node.id,
    title: node.title.trim() !== '' ? node.title : '（未命名）',
    role: node.role,
    children: node.children
      .map(child => mapOutlineNode(child, depth + 1, budget))
      .filter((child): child is OutlineNode => child !== null),
  }
}

/** 计算大纲。 */
export function toOutline(document: StructuredDocument): { outline: OutlineNode[]; truncated: boolean } {
  const budget = { count: 0, truncated: false }
  const root = mapOutlineNode(document.root, 1, budget)
  return {
    outline: root === null ? [] : [root],
    truncated: budget.truncated,
  }
}
