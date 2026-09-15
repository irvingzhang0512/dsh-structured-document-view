/**
 * dsh-structured-document-view —— 宿主半区。
 *
 * 职责：
 * - 挂载 View Bridge WebSocket `/structured-document-view/ws?sessionId=…`：
 *   浏览器客户端按活动会话接入，接收 Tool 命令、推送视图状态镜像；
 * - 注册 17 个视图工具（set_view / get_view_state / expand_node /
 *   collapse_node / focus_node / open_node / set_reader_mode /
 *   navigate_section / set_depth / set_layout / set_filter /
 *   reset_view）；
 * - 自注册打包的中文 Skill（skills/structured-document-view/SKILL.md）。
 *
 * 依赖：dsh-better-sidebar 是软依赖（宿主半区与客户端半区均如此）——
 * 宿主半区挂载不依赖它；浏览器客户端仅当 `ctx.betterSidebar` 存在时激活。
 */
import { WebSocketServer } from 'ws'
import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import { BRIDGE_ACK_TIMEOUT_MS, ViewBridgeServer } from './host/bridge-server.ts'
import { HostDocumentIntegrator } from './host/document-integrator.ts'
import { attachSocket } from './host/socket.ts'
import { ViewMirrorStore } from './host/mirror-store.ts'
import { loadBundledSkill } from './host/skill-registration.ts'
import { registerViewTools } from './tools/view-tools.ts'
import { isTrustedApiRequest } from './host/trust-fence.ts'
import { parseClientMessage } from './shared/wire.ts'
import type { ViewCommand } from './shared/types.ts'
import type { Context } from './context-types.ts'

/** cordis.yml 行用的插件标识。 */
export const name = 'dsh-structured-document-view'

/** 挂载前必需的服务：工具注册中心、web 升级面、web 运行时可信主机、技能注册中心。 */
export const inject = ['tools', 'webServer', 'webRuntime', 'skills']

/** 桥升级路径（必须与客户端半区一致）。 */
export const BRIDGE_PATH = '/structured-document-view/ws'

/**
 * 插件主体：挂载桥端点与视图工具。
 * @param ctx - 宿主插件上下文（tools、webServer、webRuntime、skills）。
 */
export function apply(ctx: Context): void {
  const mirror = new ViewMirrorStore()

  // dsh-structured-document 是软依赖（宿主侧经 ctx.get 免 inject 探测）：
  // 服务存在 → 激活文档集成层（文档快照/选中推送到浏览器，当前文件联动）；
  // 服务缺失 → 集成层不激活，视图插件回退 Mock 数据源（独立可用）。
  let documentIntegrator: HostDocumentIntegrator | undefined
  const structuredDocumentService = ctx.get('structuredDocument')
  const bridge = new ViewBridgeServer({
    store: mirror,
    capabilities: { structuredDocument: structuredDocumentService !== undefined },
    onMessage: (sessionId, message) => documentIntegrator?.handleMessage(sessionId, message),
  })
  const removeViewService = ctx.provide('structuredDocumentView', {
    id: 'dsh-structured-document-view' as const,
    getState: (sessionId: string) => mirror.get(sessionId),
    subscribe: (sessionId: string, listener: (state: ReturnType<ViewMirrorStore['get']>) => void) => mirror.subscribe(sessionId, listener),
    dispatch: (sessionId: string, command: ViewCommand) => bridge.dispatch(sessionId, command),
  })
  if (structuredDocumentService !== undefined) {
    documentIntegrator = new HostDocumentIntegrator({
      service: structuredDocumentService as never,
      bridge,
    })
  }

  // 与 /api 网关一致的浏览器信任围栏。
  const fence = (req: IncomingMessage): boolean => isTrustedApiRequest(req, ctx.webRuntime.trustedHosts)

  const wss = new WebSocketServer({ noServer: true })
  ctx.effect(() => ctx.webServer.registerUpgrade({
    path: BRIDGE_PATH,
    handler: (req, socket, head) => {
      const incoming = req as IncomingMessage
      const duplex = socket as unknown as Duplex
      if (!fence(incoming)) {
        duplex.destroy()
        return
      }
      const url = new URL(incoming.url ?? '', 'http://localhost')
      const sessionId = url.searchParams.get('sessionId')
      if (sessionId === null || sessionId === '') {
        duplex.destroy()
        return
      }
      wss.handleUpgrade(incoming, duplex, head as Buffer, (ws) => {
        attachSocket(bridge, ws, sessionId, parseClientMessage)
      })
    },
  }), 'dsh-structured-document-view: bridge WebSocket')

  const toolsDisposer = registerViewTools(ctx, {
    mirror,
    bridge,
    ackTimeoutMs: BRIDGE_ACK_TIMEOUT_MS,
  })

  // 自注册打包的 SKILL.md 到 ctx.skills（安装插件即安装技能）。注册是
  // 异步（读文件），effect 清理是同步且竞态安全的。
  ctx.effect(() => {
    const skills = ctx.skills
    let disposed = false
    let skillDisposer: (() => void) | undefined
    if (skills?.register !== undefined) {
      void loadBundledSkill().then((skill) => {
        if (disposed || skill === undefined) return
        skillDisposer = skills.register(skill)
      })
    }
    return () => {
      disposed = true
      skillDisposer?.()
    }
  }, 'dsh-structured-document-view: bundled skill')

  ctx.effect(() => () => {
    removeViewService()
    documentIntegrator?.dispose()
    toolsDisposer()
    mirror.clear()
    bridge.dispose()
    wss.close()
  }, 'dsh-structured-document-view: teardown')
}
