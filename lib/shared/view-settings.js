/**
 * 视图默认值配置（SPEC F011）：把 better-sidebar 的侧边卡片设置解析成
 * 可用的视图默认值，并投影到新的视图状态。
 *
 * 分工：
 * - 本模块只做**纯解析与投影**，不接触 better-sidebar（读取 prefs 的职责留在
 *   客户端适配层 `src/client/sidebar-adapter.tsx`，保持「只有适配层接触
 *   better-sidebar」的既有约定）；
 * - 合法取值只有一处定义：解析用 `view-state.ts` 的 `VIEW_NAMES` /
 *   `MIND_MAP_LAYOUTS`，设置行的 `VIEW_OPTIONS` / `LAYOUT_OPTIONS` 与之逐项对应
 *   （测试断言两者同源），避免界面选项与合法取值各写一份。
 *
 * 依赖方向：本模块单向依赖 `view-state.ts`；`view-state.ts` 不反向依赖本模块
 * （`resetView` 通过接收「初始状态」参数来采用配置默认值）。
 */
import { MIND_MAP_LAYOUTS, VIEW_NAMES, createDefaultViewState, } from "./view-state.js";
/**
 * 内置默认值：即本变更前的硬编码行为，同时是 better-sidebar 缺失、
 * 版本过低（无 `pluginToggles`）或取值非法时的回退。
 *
 * 视图／布局／导图层级三项**从 `createDefaultViewState()` 推导**（内置默认状态的
 * 唯一字面量来源），只有 `autoOpenTab` 是本模块新增的默认（它不属于视图状态）。
 * 这样内置默认只有一处定义，不会留下第二份互相漂移的默认来源。
 */
export const BUILTIN_VIEW_DEFAULTS = builtinViewDefaults();
/** 从内置默认视图状态推导配置层的内置默认值。 */
function builtinViewDefaults() {
    const state = createDefaultViewState();
    return {
        autoOpenTab: true,
        defaultView: state.currentView,
        defaultLayout: state.layout,
        // 内部 `null` = 不限层级，配置层用 `0` 表达同一含义（见 mindmapDepthToInternal）。
        defaultMindmapDepth: state.viewDepths.mindmap ?? 0,
    };
}
/** 设置行里 `defaultView` 的选项（与 {@link VIEW_NAMES} 同源校验见测试）。 */
export const VIEW_OPTIONS = [
    { value: 'markdown', title: 'Markdown' },
    { value: 'mindmap', title: '思维导图' },
    { value: 'table', title: '表格' },
];
/** 设置行里 `defaultLayout` 的选项（与 {@link MIND_MAP_LAYOUTS} 同源校验见测试）。 */
export const LAYOUT_OPTIONS = [
    { value: 'mind', title: '思维导图（两侧）' },
    { value: 'logical', title: '逻辑图（右侧）' },
    { value: 'down', title: '上下' },
];
/** 取值是否在给定字面量集合内。 */
function oneOf(values, raw) {
    return typeof raw === 'string' && values.includes(raw);
}
/**
 * 解析侧边卡片设置。逐字段独立判定：键缺失、类型不符或取值不在枚举内时
 * **只回退该字段**的内置默认，不做隐式转换、不抛错（A6／A7）。
 */
export function parseViewDefaults(raw) {
    const source = (typeof raw === 'object' && raw !== null ? raw : {});
    return {
        autoOpenTab: typeof source.autoOpenTab === 'boolean' ? source.autoOpenTab : BUILTIN_VIEW_DEFAULTS.autoOpenTab,
        defaultView: oneOf(VIEW_NAMES, source.defaultView) ? source.defaultView : BUILTIN_VIEW_DEFAULTS.defaultView,
        defaultLayout: oneOf(MIND_MAP_LAYOUTS, source.defaultLayout) ? source.defaultLayout : BUILTIN_VIEW_DEFAULTS.defaultLayout,
        defaultMindmapDepth: parseDepth(source.defaultMindmapDepth),
    };
}
/**
 * 层级取值：只接受 `>= 0` 的整数（控件声明的 `min: 0`）；越界、非整数、
 * `NaN`／`Infinity` 一律回退默认。
 */
function parseDepth(raw) {
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0)
        return BUILTIN_VIEW_DEFAULTS.defaultMindmapDepth;
    return raw;
}
/**
 * 把配置里的层级映射为视图状态内部的层级：`0` 表示不限层级，
 * 而内部用 `null` 表达「不限」（`ViewState.viewDepths` 是 `number | null`）。
 */
export function mindmapDepthToInternal(depth) {
    return depth === 0 ? null : depth;
}
/**
 * 按配置默认值生成一份新的初始视图状态：在内置默认状态之上只覆盖
 * 视图、布局与思维导图层级三个字段（其余字段保持内置默认）。
 *
 * `depth` 必须与 `viewDepths[currentView]` 一致（`setView` 维护的既有不变式）：
 * 渲染层与状态镜像读的是 `state.depth`（导图适配器额外用
 * `viewDepths.mindmap`），只改 `viewDepths` 会让工具栏层级控件与
 * `get_view_state` 把「已配置的层级」报告成「不限」，与画面不一致。
 */
export function initialViewState(defaults = BUILTIN_VIEW_DEFAULTS) {
    const base = createDefaultViewState();
    const viewDepths = { ...base.viewDepths, mindmap: mindmapDepthToInternal(defaults.defaultMindmapDepth) };
    return {
        ...base,
        currentView: defaults.defaultView,
        layout: defaults.defaultLayout,
        viewDepths,
        depth: viewDepths[defaults.defaultView],
    };
}
