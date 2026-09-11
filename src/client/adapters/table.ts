/**
 * 表格适配层：把"文档 IR + 视图状态"转换为按角色分组的表格数据。
 *
 * 规则：
 * - 一行 = 一个可见节点；按角色（role）分组展示（同一角色共用一个表头）；
 * - 列 = 标题 + 该角色出现过的属性键（并集）+ 内容摘要；
 * - 展示范围遵循视图状态：filter 过滤；depth 限制层级；
 *   （表格是扁平视图，不应用"收起/展开"语义，见 docs/views.md）。
 *
 * 纯函数，可在 Node 测试中直接验证。
 */
import type { StructuredDocument } from '../../shared/ir.ts'
import { buildViewTree, flattenViewTree } from '../../shared/view-tree.ts'
import type { ViewState } from '../../shared/view-state.ts'
import { nodeDisplayTitle, summarize } from './markdown.ts'

/** 表格行。 */
export interface TableRow {
  id: string
  role: string
  title: string
  content: string
  properties: Record<string, string | number | boolean>
  /** 层级（根 = 1）。 */
  level: number
}

/** 按角色分组的表格。 */
export interface TableGroup {
  role: string
  rows: TableRow[]
  /** 该角色出现过的属性键（列）。 */
  propertyKeys: string[]
}

/** 表格数据模型。 */
export interface TableViewModel {
  title: string
  profile: string
  groups: TableGroup[]
  /** 行总数（去重后的全部可见节点）。 */
  totalRows: number
}

/** 角色名 → 中文标签（V0.1 内置；未来可由 Profile 定义驱动）。 */
const ROLE_LABELS: Record<string, string> = {
  note: '笔记',
  topic: '议题',
  discussion: '讨论',
  problem: '问题',
  conclusion: '结论',
  decision: '决定',
  action_item: '待办',
  objective: '目标',
  key_result: '关键结果',
  milestone: '阶段',
  task: '任务',
  issue: '问题',
  risk: '风险',
  idea: '想法',
  solution: '方案',
  question: '疑问',
}

/** 角色展示名。 */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}

/** 把属性转成便于展示的值。 */
function propertyDisplay(value: string | number | boolean): string | number | boolean {
  if (typeof value === 'boolean') return value ? '是' : '否'
  return value
}

/** 计算表格数据。 */
export function toTableViewModel(document: StructuredDocument, state: ViewState): TableViewModel {
  const tree = buildViewTree(document, state, { ignoreCollapse: true })
  const nodes = flattenViewTree(tree).filter(node => node.visible)

  const rows: TableRow[] = nodes.map(node => {
    const { node: docNode, level } = node
    return {
      id: docNode.id,
      role: docNode.role,
      title: nodeDisplayTitle(docNode),
      content: summarize(docNode.content, 80),
      properties: { ...docNode.properties },
      level,
    }
  })

  // 按角色分组，保持文档中首次出现顺序。
  const groups: TableGroup[] = []
  const groupByRole = new Map<string, TableGroup>()
  for (const row of rows) {
    let group = groupByRole.get(row.role)
    if (group === undefined) {
      group = { role: row.role, rows: [], propertyKeys: [] }
      groupByRole.set(row.role, group)
      groups.push(group)
    }
    group.rows.push(row)
    for (const key of Object.keys(row.properties)) {
      if (!group.propertyKeys.includes(key)) group.propertyKeys.push(key)
    }
  }

  return {
    title: document.title,
    profile: document.profile,
    groups,
    totalRows: rows.length,
  }
}

/** 导出（供测试与工具输出）。 */
export function rowProperty(row: TableRow, key: string): string | number | boolean | undefined {
  const value = row.properties[key]
  return value === undefined ? undefined : propertyDisplay(value)
}
