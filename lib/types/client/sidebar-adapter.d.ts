/**
 * SidebarAdapter（Sidebar 适配层）：隔离 dsh-better-sidebar 的公开 API。
 *
 * 本插件所有对 `ctx.betterSidebar` 的接触都收敛在这里——未来 better-sidebar
 * 升级、换用其它宿主时，只改本文件，Renderer / Runtime / Skill 不受影响。
 *
 * 当前仅使用 better-sidebar 的公开扩展点（见 dsh-better-sidebar 的
 * BetterSidebarService）：
 * - `registerTab`（注册一个新的侧边栏页，含 `settings.pluginToggles` 设置行）；
 * - `subscribeState` / `getSnapshot`（跟随当前活动会话 + 读回插件设置）；
 * - `openTab`（按需打开视图页）；
 * - `features`（能力清单，判断是否支持 `pluginSettings`）。
 *
 * 侧边卡片设置（SPEC F011 ／ docs/sidebar-integration.md「配置契约」）：
 * 四项设置声明为 `pluginToggles`，值落在 better-sidebar 自己的 prefs
 * `pluginSettings['structured-document-view']`；本层只读公开快照，不碰它的私有 store。
 */
import type { ReactNode } from 'react';
import type { BetterSidebarService, TabComponentProps } from 'dsh-better-sidebar';
import { type ViewDefaults } from '../shared/view-settings.ts';
/** 本插件注册的侧边栏页标识。 */
export declare const VIEW_TAB_TYPE = "structured-document-view";
/** 本插件侧边栏页的展示名。 */
export declare const VIEW_TAB_TITLE = "Irving \u00B7 \u7ED3\u6784\u5316\u6587\u6863\u89C6\u56FE";
/** SidebarAdapter 构造参数。 */
export interface SidebarAdapterOptions {
    /** better-sidebar 的客户端服务（ctx.betterSidebar）。 */
    service: BetterSidebarService;
    /** 标签页组件（懒引用，避免与运行时循环依赖）。 */
    component: () => (props: TabComponentProps) => ReactNode;
}
/**
 * Sidebar 适配层。仅通过它访问 better-sidebar：
 * 注册视图页（含四项侧边卡片设置声明）、订阅状态变化（活动会话跟踪）、
 * 按需打开视图页、读回本插件的侧边卡片设置。
 */
export declare class SidebarAdapter {
    private readonly options;
    constructor(options: SidebarAdapterOptions);
    /** 注册结构化文档视图页；返回 disposer。 */
    registerTab(): () => void;
    /**
     * 宿主是否支持插件本地设置（`pluginToggles`，better-sidebar v0.12.0+）。
     * `features` 本身也是 v0.12.0+ 才有的字段，缺失即视为不支持。
     */
    supportsPluginSettings(): boolean;
    /**
     * 读回本插件的设置原始值（未设置／无设置能力时为 undefined）。
     * 只用公开快照：`getSnapshot().prefs.pluginSettings['structured-document-view']`。
     */
    private readPluginSettings;
    /**
     * 解析当前侧边卡片设置为本插件的视图默认值（SPEC F011）。
     * 键缺失、类型不符、枚举外取值一律回退内置默认，不抛错；
     * 宿主不支持该机制时四项全部为内置默认。
     */
    readViewDefaults(): ViewDefaults;
    /** `autoOpenTab`（缺省 true）：会话首次激活时是否自动打开本插件页签。 */
    shouldAutoOpenTab(): boolean;
    /** 订阅侧边栏状态（活动会话变化）；返回退订函数。 */
    subscribeState(listener: () => void): () => void;
    /** 读取当前快照（sessionId 等）。 */
    getSnapshot(): {
        sessionId?: string;
    };
    /** 打开（激活）本插件视图页。 */
    openViewTab(): void;
}
