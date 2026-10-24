/**
 * 节点引用（Node Reference）解析。
 *
 * Tool / Skill 里用户说的"某个节点"往往不是严格 ID（如"聚焦算法方案"），
 * 本模块把宽松的自然语言引用解析成文档里的具体节点，遵循明确优先级：
 *
 * 1. `current` / `@selected` / `@current`：当前选中节点。
 * 2. 精确 Node ID（`node_023`）。
 * 3. 标题精确匹配；否则标题包含匹配（多个候选 → MULTIPLE_NODES_FOUND）。
 * 4. 都不匹配 → NODE_NOT_FOUND。
 *
 * 解析结果要么是唯一节点，要么是明确错误（绝不猜一个）。
 */
import type { DocNode, NodeId, StructuredDocument } from '../shared/ir.ts';
/** 节点解析结果。 */
export type NodeResolveResult = {
    ok: true;
    node: DocNode;
} | {
    ok: false;
    code: 'NODE_NOT_FOUND';
    message: string;
    candidates?: DocNode[];
} | {
    ok: false;
    code: 'MULTIPLE_NODES_FOUND';
    message: string;
    candidates: DocNode[];
} | {
    ok: false;
    code: 'NO_SELECTED_NODE';
    message: string;
};
/** 遍历文档全部节点（含根）。 */
export declare function walkDocument(root: DocNode, visit: (node: DocNode) => void): void;
/** 按 ID 查找节点。 */
export declare function findNodeById(root: DocNode, id: NodeId): DocNode | undefined;
/** 按标题包含匹配查找节点（保留遍历顺序）。 */
export declare function findNodesByTitle(root: DocNode, title: string, limit?: number): DocNode[];
/** 节点在文档中的深度（根 = 0）。 */
export declare function nodeDepth(root: DocNode, nodeId: NodeId): number | null;
/** 解析一个用户提供的节点引用（默认引用 current）。 */
export declare function resolveNodeRef(document: StructuredDocument, selectedNodeId: NodeId | null, rawRef: string | undefined): NodeResolveResult;
