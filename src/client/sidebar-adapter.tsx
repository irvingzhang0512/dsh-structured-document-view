/**
 * SidebarAdapter（Sidebar 适配层）：隔离 dsh-better-sidebar 的公开 API。
 *
 * 本插件所有对 `ctx.betterSidebar` 的接触都收敛在这里——未来 better-sidebar
 * 升级、换用其它宿主时，只改本文件，Renderer / Runtime / Skill 不受影响。
 *
 * 当前仅使用 better-sidebar 的公开扩展点（见 dsh-better-sidebar 的
 * BetterSidebarService）：
 * - `registerTab`（注册一个新的侧边栏页）；
 * - `subscribeState` / `getSnapshot`（跟随当前活动会话）；
 * - `openTab`（按需打开视图页）。
 */
import type { ReactNode } from 'react'
import type { BetterSidebarService, TabComponentProps } from 'dsh-better-sidebar'

/** 本插件注册的侧边栏页标识。 */
export const VIEW_TAB_TYPE = 'structured-document-view'

/** 本插件侧边栏页的展示名。 */
export const VIEW_TAB_TITLE = '结构化文档'

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
 * 注册视图页、订阅状态变化（活动会话跟踪）、按需打开视图页。
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
    })
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
