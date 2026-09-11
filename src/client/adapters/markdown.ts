/**
 * Markdown 适配层：把"文档 IR + 视图状态"序列化为 Markdown 文本。
 *
 * 规则：
 * - 根节点 → `# 标题`；逐层降级 `##` / `###` …（最多 `######`，更深用列表）；
 * - 节点正文（content）作为段落追加；属性（properties）渲染为 `- 键：值` 列表；
 * - 角色展示为小标签（如 `（议题）`）便于阅读；
 * - 展示范围遵循视图状态：depth 限制层级、filter 过滤、collapsed 收起子树
 *   （本视图忽略 collapsed 的"收起"含义之外的部分，仅受视图树约束）。
 *
 * 纯函数，可在 Node 测试中直接验证。
 */
import type { DocNode, StructuredDocument } from '../../shared/ir.ts'
import { buildViewTree, type ViewTreeNode } from '../../shared/view-tree.ts'
import type { ViewState } from '../../shared/view-state.ts'
import { PROFILE_LABELS } from '../../shared/ir.ts'

/** 把一行正文拆成摘要（思维导图/表格用）。 */
export function summarize(text: string, maxLength = 60): string {
  const line = text.replace(/\s+/g, ' ').trim()
  if (line.length <= maxLength) return line
  return `${line.slice(0, maxLength)}…`
}

/** 节点展示标题：优先标题，缺省用正文摘要。 */
export function nodeDisplayTitle(node: DocNode): string {
  if (node.title.trim() !== '') return node.title.trim()
  const summary = summarize(node.content, 40)
  return summary !== '' ? summary : `（未命名节点 ${node.id}）`
}

function escapeMarkdownInline(text: string): string {
  return text.replace(/([\\`*_#])/g, '\\$1')
}

function renderProperties(node: DocNode): string {
  const entries = Object.entries(node.properties)
  if (entries.length === 0) return ''
  return entries
    .map(([key, value]) => `- ${escapeMarkdownInline(key)}：${String(value)}`)
    .join('\n')
}

function renderNodeContent(node: DocNode): string {
  const content = node.content.trim()
  if (content === '') return ''
  return content
}

function renderNode(tree: ViewTreeNode, lines: string[]): void {
  const { node, level } = tree
  const roleLabel = node.role
  const title = nodeDisplayTitle(node)
  const headingLevel = Math.min(level, 6)
  const heading = '#'.repeat(headingLevel)
  const roleTag = roleLabel !== '' ? `　（${roleLabel}）` : ''
  lines.push(`${heading} ${title}${roleTag}`)

  const content = renderNodeContent(node)
  if (content !== '') lines.push(content)

  const props = renderProperties(node)
  if (props !== '') lines.push(props)

  if (level >= 6) {
    // 超过六级标题的深度用嵌套无序列表表示。
    renderNodeAsList(tree, 0, lines)
    return
  }

  for (const child of tree.children) {
    renderNode(child, lines)
  }
}

function renderNodeAsList(tree: ViewTreeNode, depth: number, lines: string[]): void {
  const indent = '  '.repeat(depth)
  const content = renderNodeContent(tree.node)
  const props = renderProperties(tree.node)
  lines.push(`${indent}- ${nodeDisplayTitle(tree.node)}${content !== '' ? `：${content}` : ''}`)
  if (props !== '') lines.push(indentLines(props, `${indent}  `))
  for (const child of tree.children) {
    renderNodeAsList(child, depth + 1, lines)
  }
}

function indentLines(text: string, indent: string): string {
  return text.split('\n').map(line => `${indent}${line}`).join('\n')
}

/**
 * 把文档序列化为 Markdown 文本。
 * @returns Markdown 字符串（末尾无多余换行）。
 */
export function toMarkdown(document: StructuredDocument, state: ViewState): string {
  const tree = buildViewTree(document, state)
  const lines: string[] = []
  lines.push(`<!-- ${PROFILE_LABELS[document.profile] ?? document.profile} · revision ${document.revision} · 结构化文档视图 V0.1 -->`)
  lines.push('')
  renderNode(tree, lines)
  return lines.join('\n').replace(/\s+$/, '') + '\n'
}
