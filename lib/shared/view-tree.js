import { isCollapsed, isDepthLimited, nodeMatchesFilter } from "./view-state.js";
/** 节点自身的筛选匹配结果。 */
function selfMatches(node, state) {
    return nodeMatchesFilter(node, state.filter);
}
/** 递归折叠视图树。 */
function buildNode(node, level, state, underExplicitExpand, ignoreCollapse) {
    const childUnderExpand = underExplicitExpand || state.expandedNodeIds.includes(node.id);
    const childrenResult = [];
    let subtreeVisible = false;
    for (const child of node.children) {
        const result = buildNode(child, level + 1, state, childUnderExpand, ignoreCollapse);
        if (result.subtreeVisible)
            subtreeVisible = true;
        childrenResult.push(result);
    }
    // 深度限制：level 超过 depth 的节点隐藏（除非处于显式展开链上）——
    // 无论是否有子节点都生效（叶子节点同样会被隐藏，修复 V0.1 早期只
    // 对"有子节点"的节点判定的问题）。
    const depthLimited = isDepthLimited(level, state.depth, underExplicitExpand);
    const visible = !depthLimited && (selfMatches(node, state) || subtreeVisible);
    const collapsed = !ignoreCollapse && node.children.length > 0 && isCollapsed(node.id, level, state, underExplicitExpand);
    // 收起时子节点不展示；未收起时仅展示"可见"的子节点。
    const children = collapsed
        ? []
        : childrenResult.filter(result => result.subtreeVisible).map(result => result.tree);
    return {
        tree: {
            node,
            level,
            visible,
            collapsed,
            children,
            underExplicitExpand,
        },
        subtreeVisible: visible,
    };
}
/** 计算整棵视图树（根节点恒可见）。 */
export function buildViewTree(document, state, options = {}) {
    const ignoreCollapse = options.ignoreCollapse === true;
    const root = document.root;
    const result = buildNode(root, 1, state, false, ignoreCollapse);
    // 根节点强制可见（即使筛选不匹配——根是文档标题）。
    const rootTree = {
        ...result.tree,
        visible: true,
    };
    return rootTree;
}
/** 为指定视图计算可见树，避免一个视图的层级设置污染另一个视图。 */
export function buildViewTreeFor(document, state, view, options = {}) {
    return buildViewTree(document, { ...state, depth: state.viewDepths[view] }, options);
}
/** 以先序扁平化视图树（返回所有节点的引用，含折叠隐藏的节点本身）。 */
export function flattenViewTree(root) {
    const results = [];
    const walk = (tree) => {
        results.push(tree);
        for (const child of tree.children)
            walk(child);
    };
    walk(root);
    return results;
}
