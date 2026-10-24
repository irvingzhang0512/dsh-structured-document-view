/**
 * 视图树（View Tree）计算。
 *
 * 把"文档 IR + 视图状态"折叠成一棵"应该被展示的树"，是三种视图
 * （Markdown / Mind Map / Table）共用的唯一可见性来源：
 *
 * - 层级限制（depth）：level 超过 depth 的节点隐藏，除非处于显式展开链上；
 * - 收起（collapsed / expanded）：显式收起隐藏整个子树，显式展开突破层级；
 * - 筛选（filter）：不匹配的节点隐藏，但"自身不匹配、后代匹配"的祖先
 *   保留（树形筛选的标准做法，保证匹配节点可见）。
 *
 * 本模块是纯函数，可在 Node 测试中直接验证。
 */
import type { DocNode, StructuredDocument } from './ir.ts';
import { type ViewState } from './view-state.ts';
/** 视图树节点。 */
export interface ViewTreeNode {
    /** 对应的文档节点。 */
    node: DocNode;
    /** 层级（根 = 1）。 */
    level: number;
    /** 自身是否可见（筛选后仍可见）。 */
    visible: boolean;
    /** 子节点是否被收起（收起或层级限制）。 */
    collapsed: boolean;
    /** 可见的子节点。 */
    children: ViewTreeNode[];
    /** 祖先链上是否有显式展开节点（突破层级限制用）。 */
    underExplicitExpand: boolean;
}
/** 计算整棵视图树（根节点恒可见）。 */
export declare function buildViewTree(document: StructuredDocument, state: ViewState, options?: {
    ignoreCollapse?: boolean;
}): ViewTreeNode;
/** 为指定视图计算可见树，避免一个视图的层级设置污染另一个视图。 */
export declare function buildViewTreeFor(document: StructuredDocument, state: ViewState, view: ViewState['currentView'], options?: {
    ignoreCollapse?: boolean;
}): ViewTreeNode;
/** 以先序扁平化视图树（返回所有节点的引用，含折叠隐藏的节点本身）。 */
export declare function flattenViewTree(root: ViewTreeNode): ViewTreeNode[];
