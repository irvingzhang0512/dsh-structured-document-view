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
import type { DocNode, StructuredDocument } from '../../shared/ir.ts';
import type { ViewState } from '../../shared/view-state.ts';
/** 把一行正文拆成摘要（思维导图/表格用）。 */
export declare function summarize(text: string, maxLength?: number): string;
/** 节点展示标题：优先标题，缺省用正文摘要。 */
export declare function nodeDisplayTitle(node: DocNode): string;
/**
 * 把文档序列化为 Markdown 文本。
 * @returns Markdown 字符串（末尾无多余换行）。
 */
export declare function toMarkdown(document: StructuredDocument, state: ViewState): string;
