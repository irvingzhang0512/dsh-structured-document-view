/** 当前节点别名。 */
const CURRENT_ALIASES = new Set(['current', '@selected', '@current', '@focused']);
/** 遍历文档全部节点（含根）。 */
export function walkDocument(root, visit) {
    visit(root);
    for (const child of root.children)
        walkDocument(child, visit);
}
/** 按 ID 查找节点。 */
export function findNodeById(root, id) {
    let found;
    walkDocument(root, (node) => {
        if (found === undefined && node.id === id)
            found = node;
    });
    return found;
}
/** 按标题包含匹配查找节点（保留遍历顺序）。 */
export function findNodesByTitle(root, title, limit = 20) {
    const results = [];
    const needle = title.trim().toLowerCase();
    walkDocument(root, (node) => {
        if (results.length >= limit)
            return;
        if (node.title.toLowerCase().includes(needle))
            results.push(node);
    });
    return results;
}
/** 节点在文档中的深度（根 = 0）。 */
export function nodeDepth(root, nodeId) {
    let depth = null;
    const visit = (node, level) => {
        if (depth !== null)
            return;
        if (node.id === nodeId) {
            depth = level;
            return;
        }
        for (const child of node.children)
            visit(child, level + 1);
    };
    visit(root, 0);
    return depth;
}
/** 解析一个用户提供的节点引用（默认引用 current）。 */
export function resolveNodeRef(document, selectedNodeId, rawRef) {
    const root = document.root;
    const ref = rawRef === undefined || rawRef.trim() === '' ? 'current' : rawRef.trim();
    if (CURRENT_ALIASES.has(ref.toLowerCase())) {
        if (selectedNodeId === null) {
            return { ok: false, code: 'NO_SELECTED_NODE', message: '当前没有选中节点，请先选择或指定一个节点。' };
        }
        const node = findNodeById(root, selectedNodeId);
        if (node === undefined) {
            return { ok: false, code: 'NODE_NOT_FOUND', message: `选中的节点已不存在（${selectedNodeId}）。` };
        }
        return { ok: true, node };
    }
    const byId = findNodeById(root, ref);
    if (byId !== undefined)
        return { ok: true, node: byId };
    const byExact = findNodesByTitle(root, ref).filter(node => node.title === ref);
    if (byExact.length === 1)
        return { ok: true, node: byExact[0] };
    const matches = findNodesByTitle(root, ref);
    if (matches.length === 0) {
        return { ok: false, code: 'NODE_NOT_FOUND', message: `没有找到标题包含「${ref}」的节点。` };
    }
    if (matches.length === 1)
        return { ok: true, node: matches[0] };
    return {
        ok: false,
        code: 'MULTIPLE_NODES_FOUND',
        message: `有 ${matches.length} 个节点标题包含「${ref}」，请用更具体的标题或 Node ID 指定。`,
        candidates: matches,
    };
}
