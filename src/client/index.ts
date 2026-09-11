/**
 * dsh-structured-document-view —— 客户端半区（浏览器）。
 *
 * 仅在 `ctx.betterSidebar` 可用时激活（即 dsh-better-sidebar 已安装）：
 * 软依赖，否则本模块根本不会挂载。
 *
 * 职责：
 * 1. 注册「结构化文档」侧边栏页（通过 SidebarAdapter，复用 better-sidebar
 *    的 Tab / 展示区域 / 生命周期）；
 * 2. 跟随当前活动会话：为该会话创建 ViewRuntime（Mock 文档 + 视图状态），
 *    并连接宿主桥（接收 Tool 命令、推送状态镜像）；
 * 3. 侧边栏页组件渲染当前视图（Markdown / 思维导图 / 表格），
 *    并把用户交互（点击节点、展开收起、缩放平移）写回运行时。
 */
import type { Context } from 'dsh-better-sidebar'
import { SidebarAdapter, VIEW_TAB_TYPE } from './sidebar-adapter.tsx'
import { ViewSessionManager } from './session-manager.ts'
import { TabView } from './views/tab-view.tsx'
import { injectPluginStyle } from './plugin-style.ts'
import { activeFileOf } from './sidebar-file.ts'

/**
 * 客户端半区的服务依赖：仅在 `ctx.betterSidebar` 可用时激活（软依赖，
 * 与 dsh-better-sidebar-controller 客户端入口同款模式）。
 */
export const inject = ['betterSidebar']

/** 会话管理器（模块级单例，供组件层查询）。 */
let sessionManager: ViewSessionManager | undefined

/** 获取会话管理器（组件层使用）。 */
export function getSessionManager(): ViewSessionManager | undefined {
  return sessionManager
}

/** 会话是否合法（非空字符串）。 */
function validSessionId(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}

/** 是否为结构化文档源文件（Markdown；仅此类文件联动 dsh-structured-document）。 */
function isMarkdownFile(path: unknown): path is string {
  return typeof path === 'string' && /\.(md|markdown)$/i.test(path)
}

/** 客户端插件主体。 */
export function apply(ctx: Context): void {
  ctx.effect(() => {
    const service = ctx.betterSidebar
    const manager = new ViewSessionManager()
    sessionManager = manager
    let lastSessionId: string | undefined

    injectPluginStyle()

    // 注册侧边栏页。组件懒引用 TabView，避免循环依赖。
    const adapter = new SidebarAdapter({
      service,
      component: () => (props) => TabView(props),
    })
    const disposers: Array<() => void> = [adapter.registerTab()]

    // 跟随活动会话：会话变化时切换桥连接（运行时按会话保留），并把
    // better-sidebar 的"当前文件"联动给宿主文档服务（dsh-structured-document）。
    const onChange = (): void => {
      const snapshot = service.getSnapshot()
      const nextSession = snapshot.sessionId
      if (validSessionId(nextSession)) {
        if (nextSession !== lastSessionId) {
          lastSessionId = nextSession
          manager.setActiveSession(nextSession)
        }
        const runtime = manager.getRuntime(nextSession)
        if (runtime !== undefined) {
          const currentFile = activeFileOf(snapshot.state)
          const path = isMarkdownFile(currentFile) ? currentFile : null
          runtime.sendCurrentFile(path)
        }
      }
    }
    disposers.push(adapter.subscribeState(onChange))
    onChange()

    return () => {
      for (const dispose of disposers) {
        try {
          dispose()
        } catch {
          // 忽略退订异常。
        }
      }
      manager.disposeAll()
      if (sessionManager === manager) sessionManager = undefined
    }
  }, 'dsh-structured-document-view: client')
}

/** 导出（文档 / 测试用）。 */
export { VIEW_TAB_TYPE }
