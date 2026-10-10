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
import type { ReactNode } from 'react'
import type { BetterSidebarService, TabComponentProps, TabDescriptor } from 'dsh-better-sidebar'
import { LAYOUT_OPTIONS, VIEW_OPTIONS, parseViewDefaults, type ViewDefaults } from '../shared/view-settings.ts'

/**
 * 设置行类型：从描述符本身推导。
 * 根入口 `dsh-better-sidebar` 只导出 `BetterSidebarService` / `TabDescriptor` /
 * `TabComponentProps`（`SidebarSettingToggle` 只在 `./client/service` 子路径下），
 * 从描述符推导既避免依赖额外的入口点，也保证与宿主声明的字段始终一致。
 */
type SidebarSettingToggle = NonNullable<NonNullable<TabDescriptor['settings']>['pluginToggles']>[number]

/** 本插件注册的侧边栏页标识。 */
export const VIEW_TAB_TYPE = 'structured-document-view'

/** 本插件侧边栏页的展示名。 */
export const VIEW_TAB_TITLE = '结构化文档'

/**
 * 四项设置行（键与 `pluginSettings['structured-document-view']` 逐字一致）。
 *
 * 说明：better-sidebar 的行渲染器把「键未设置」显示为关／空（switch 取
 * `value === true`，select 无选中值显示占位符，number 显示空输入），因此每行
 * 的说明里写明「未设置时按哪个默认处理」，避免用户把「未设置」误读成「关闭」。
 */
const SETTING_ROWS: readonly SidebarSettingToggle[] = [
  {
    key: 'autoOpenTab',
    type: 'switch',
    title: '自动打开视图页签',
    desc: '会话首次激活时自动打开「结构化文档」页签。未设置时按开启处理（内置默认）。',
  },
  {
    key: 'defaultView',
    type: 'select',
    title: '新会话默认视图',
    desc: '新建会话／新运行时的初始视图。未设置时按 Markdown 处理（内置默认）。',
    options: VIEW_OPTIONS.map(option => ({ value: option.value, title: option.title })),
  },
  {
    key: 'defaultLayout',
    type: 'select',
    title: '新会话默认导图布局',
    desc: '新建会话／新运行时思维导图的初始布局。未设置时按逻辑图（右侧）处理（内置默认）。',
    options: LAYOUT_OPTIONS.map(option => ({ value: option.value, title: option.title })),
  },
  {
    key: 'defaultMindmapDepth',
    type: 'number',
    title: '新会话导图默认层级',
    desc: '新建会话／新运行时思维导图的初始层级；0 表示不限层级。未设置时按 2 层处理（内置默认）。',
    min: 0,
  },
]

/** SidebarAdapter 构造参数。 */
export interface SidebarAdapterOptions {
  /** better-sidebar 的客户端服务（ctx.betterSidebar）。 */
  service: BetterSidebarService
  /** 标签页组件（懒引用，避免与运行时循环依赖）。 */
  component: () => (props: TabComponentProps) => ReactNode
}

/** 页图标（文档/树风）。 */
function tabIcon(size: number): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1.5" y="2" width="13" height="12" rx="1.5" />
      <circle cx="5.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <path d="M8.5 5.2h3.2M8.5 7.4h3.2" />
      <circle cx="5.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <path d="M8.5 9.2h3.2M8.5 11.4h3.2" />
    </svg>
  )
}

/**
 * Sidebar 适配层。仅通过它访问 better-sidebar：
 * 注册视图页（含四项侧边卡片设置声明）、订阅状态变化（活动会话跟踪）、
 * 按需打开视图页、读回本插件的侧边卡片设置。
 */
export class SidebarAdapter {
  constructor(private readonly options: SidebarAdapterOptions) {}

  /** 注册结构化文档视图页；返回 disposer。 */
  registerTab(): () => void {
    const service = this.options.service
    return service.registerTab({
      id: VIEW_TAB_TYPE,
      single: true,
      title: () => VIEW_TAB_TITLE,
      icon: (size: number) => tabIcon(size),
      order: 90,
      component: (props) => this.options.component()(props),
      // F011：四项侧边卡片设置。只在宿主支持 `pluginToggles` 时声明，
      // 老版本（< 0.12.0）拿到的描述符与本次改动前完全一致（软依赖 A7）。
      ...(this.supportsPluginSettings() ? { settings: { pluginToggles: SETTING_ROWS } } : {}),
    })
  }

  /**
   * 宿主是否支持插件本地设置（`pluginToggles`，better-sidebar v0.12.0+）。
   * `features` 本身也是 v0.12.0+ 才有的字段，缺失即视为不支持。
   */
  supportsPluginSettings(): boolean {
    const features = (this.options.service as { features?: unknown }).features
    return Array.isArray(features) && features.includes('pluginSettings')
  }

  /**
   * 读回本插件的设置原始值（未设置／无设置能力时为 undefined）。
   * 只用公开快照：`getSnapshot().prefs.pluginSettings['structured-document-view']`。
   */
  private readPluginSettings(): unknown {
    if (!this.supportsPluginSettings()) return undefined
    const snapshot = this.options.service.getSnapshot() as { prefs?: unknown }
    const prefs = snapshot?.prefs
    if (typeof prefs !== 'object' || prefs === null) return undefined
    const pluginSettings = (prefs as { pluginSettings?: unknown }).pluginSettings
    if (typeof pluginSettings !== 'object' || pluginSettings === null) return undefined
    return (pluginSettings as Record<string, unknown>)[VIEW_TAB_TYPE]
  }

  /**
   * 解析当前侧边卡片设置为本插件的视图默认值（SPEC F011）。
   * 键缺失、类型不符、枚举外取值一律回退内置默认，不抛错；
   * 宿主不支持该机制时四项全部为内置默认。
   */
  readViewDefaults(): ViewDefaults {
    try {
      return parseViewDefaults(this.readPluginSettings())
    } catch {
      // 第三方的 prefs 形状意外时不阻断插件：回退内置默认。
      return parseViewDefaults(undefined)
    }
  }

  /** `autoOpenTab`（缺省 true）：会话首次激活时是否自动打开本插件页签。 */
  shouldAutoOpenTab(): boolean {
    return this.readViewDefaults().autoOpenTab
  }

  /** 订阅侧边栏状态（活动会话变化）；返回退订函数。 */
  subscribeState(listener: () => void): () => void {
    return this.options.service.subscribeState(listener)
  }

  /** 读取当前快照（sessionId 等）。 */
  getSnapshot(): { sessionId?: string } {
    return this.options.service.getSnapshot()
  }

  /** 打开（激活）本插件视图页。 */
  openViewTab(): void {
    this.options.service.openTab({ type: VIEW_TAB_TYPE, id: VIEW_TAB_TYPE, title: VIEW_TAB_TITLE })
  }
}
