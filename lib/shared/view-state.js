/** 三种视图（V0.1）。 */
export const VIEW_NAMES = ['markdown', 'mindmap', 'table'];
export const READER_MODES = ['section', 'document'];
/** 视图中文名（用于展示与 Skill 文档）。 */
export const VIEW_LABELS = {
    markdown: 'Markdown 视图',
    mindmap: '思维导图视图',
    table: '表格视图',
};
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
export const MIND_MAP_LAYOUTS = ['mind', 'logical', 'down'];
/** 布局中文名。 */
export const LAYOUT_LABELS = {
    mind: '思维导图',
    logical: '逻辑图',
    down: '上下',
};
/** 布局 → mind-elixir direction 常量。 */
export const LAYOUT_DIRECTIONS = {
    mind: 2,
    logical: 1,
    down: 3,
};
/**
 * 生成一份全新的**内置默认**状态（避免共享同一对象导致意外突变）。
 *
 * 这是内置默认的唯一字面量来源：侧边卡片设置的内置默认值
 * （`view-settings.ts` 的 `BUILTIN_VIEW_DEFAULTS`）从本函数的返回值推导，
 * 不再另写一份字面量。SPEC F011 要求的「统一或删除」在这里落地：原
 * `DEFAULT_VIEW_STATE` 常量与本函数重复且零引用，已删除。
 *
 * 注意：侧边卡片配置只影响**新会话／新运行时**的初始状态与 `reset_view`，
 * 本函数始终返回内置默认（`markdown` / `logical` / 导图 2 层）。
 */
export function createDefaultViewState() {
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
    };
}
function without(list, value) {
    return list.filter(item => item !== value);
}
function withUnique(list, value) {
    return list.includes(value) ? [...list] : [...list, value];
}
/** 切换视图。 */
export function setView(state, view) {
    if (state.currentView === view)
        return state;
    return { ...state, currentView: view, depth: state.viewDepths[view] };
}
/** 设置选中节点（当前节点）。 */
export function setSelectedNode(state, nodeId) {
    if (state.selectedNodeId === nodeId)
        return state;
    return { ...state, selectedNodeId: nodeId };
}
/**
 * 聚焦节点：同时设置聚焦节点与选中节点（聚焦隐含"把节点带到眼前并同步
 * 当前节点"）。nodeId 为 null 时仅清除聚焦。
 */
export function setFocusedNode(state, nodeId) {
    const next = { ...state, focusedNodeId: nodeId };
    if (nodeId !== null && nodeId !== state.selectedNodeId) {
        next.selectedNodeId = nodeId;
    }
    return next;
}
/** 展开节点（从收起列表移除，加入显式展开列表）。 */
export function expandNode(state, nodeId) {
    const collapsedNodeIds = without(state.collapsedNodeIds, nodeId);
    const expandedNodeIds = withUnique(state.expandedNodeIds, nodeId);
    if (collapsedNodeIds.length === state.collapsedNodeIds.length && expandedNodeIds.length === state.expandedNodeIds.length) {
        return state;
    }
    return { ...state, collapsedNodeIds, expandedNodeIds };
}
/** 收起节点（加入收起列表，从显式展开列表移除）。 */
export function collapseNode(state, nodeId) {
    const expandedNodeIds = without(state.expandedNodeIds, nodeId);
    const collapsedNodeIds = withUnique(state.collapsedNodeIds, nodeId);
    if (expandedNodeIds.length === state.expandedNodeIds.length && collapsedNodeIds.length === state.collapsedNodeIds.length) {
        return state;
    }
    return { ...state, expandedNodeIds, collapsedNodeIds };
}
/** 设置显示层级；depth 为 null 表示不限。 */
export function setDepth(state, depth) {
    if (state.depth === depth && state.viewDepths[state.currentView] === depth)
        return state;
    return { ...state, depth, viewDepths: { ...state.viewDepths, [state.currentView]: depth } };
}
export function setReaderMode(state, readerMode) {
    return state.readerMode === readerMode ? state : { ...state, readerMode };
}
export function toggleOutlineNode(state, nodeId) {
    const collapsed = state.outlineCollapsedNodeIds.includes(nodeId);
    return {
        ...state,
        outlineCollapsedNodeIds: collapsed
            ? without(state.outlineCollapsedNodeIds, nodeId)
            : withUnique(state.outlineCollapsedNodeIds, nodeId),
    };
}
/** 设置思维导图布局。 */
export function setLayout(state, layout) {
    if (state.layout === layout)
        return state;
    return { ...state, layout };
}
/** 设置缩放比例（仅用于思维导图交互回写）。 */
export function setZoom(state, zoom) {
    if (state.zoom === zoom || !Number.isFinite(zoom) || zoom <= 0)
        return state;
    return { ...state, zoom };
}
/** 设置画布位置（仅用于思维导图交互回写）。 */
export function setPan(state, x, y) {
    if (state.pan.x === x && state.pan.y === y)
        return state;
    return { ...state, pan: { x, y } };
}
/** 设置筛选条件；null 表示清除筛选。 */
export function setFilter(state, filter) {
    return { ...state, filter };
}
/**
 * 恢复默认视图：重置视图类型、展开/收起、层级、缩放、平移、布局、筛选、
 * 聚焦；保留当前选中节点（"恢复默认视图"不应丢失当前节点）。
 *
 * @param initial 采用哪一份初始状态；缺省为内置默认。配置了侧边卡片默认值时，
 * 运行时传入 `view-settings.ts` 的 `initialViewState(defaults)`（SPEC F011／A9）。
 */
export function resetView(state, initial = createDefaultViewState()) {
    return {
        ...initial,
        selectedNodeId: state.selectedNodeId,
    };
}
/**
 * 判断一个节点是否因层级限制而被隐藏。
 *
 * 语义：depth 为 null（不限）时不限制；否则层级 level（根 = 1）大于 depth
 * 的节点隐藏，除非该节点处于"显式展开"链上（underExplicitExpand 为 true）。
 * 显式展开（expanded_node_ids 中的节点或其祖先）会突破层级限制——
 * 这是"只显示两层，但我要展开第二个议题"这类组合指令能生效的关键。
 */
export function isDepthLimited(level, depth, underExplicitExpand) {
    if (depth === null)
        return false;
    if (level <= depth)
        return false;
    return !underExplicitExpand;
}
/**
 * 判断一个节点是否处于收起状态。
 * 优先级：显式收起（collapsed_node_ids） > 层级限制（可被显式展开突破）。
 */
export function isCollapsed(nodeId, level, state, underExplicitExpand = false) {
    if (state.collapsedNodeIds.includes(nodeId))
        return true;
    const explicitlyExpanded = state.expandedNodeIds.includes(nodeId);
    return isDepthLimited(level, state.depth, underExplicitExpand || explicitlyExpanded);
}
/**
 * 判断一个节点是否满足当前筛选条件（自身匹配；树形祖先由调用方处理）。
 *
 * 语义为 AND 组合：role（若指定）必须匹配，且 properties 的每个键值都必须
 * 匹配（全部条件同时满足才显示）。这样「只看张三的进行中任务」可用
 * { role: 'task', properties: { owner: '张三', status: '进行中' } } 表达。
 */
export function nodeMatchesFilter(node, filter) {
    if (filter === null)
        return true;
    if (filter.role !== undefined && filter.role !== '' && node.role !== filter.role)
        return false;
    const props = filter.properties;
    if (props !== undefined) {
        for (const [key, value] of Object.entries(props)) {
            if (node.properties[key] !== value)
                return false;
        }
    }
    return true;
}
