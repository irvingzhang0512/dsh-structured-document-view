/**
 * 本插件的宿主 Context 类型：vendored cordis Context 与所需服务面的
 * 结构镜像的交叉类型（与 dsh-better-sidebar-controller 同一做法——
 * 不重复 declare module 避免 TS2717）。
 */
import type { Context as CordisContext } from '@deepseek-ai/cordis'
import type { SkillRegistration } from '@deepseek-ai/dsh-skill'
import type { IncomingMessage } from 'node:http'

/** webServer 服务面（本插件用到的最小集合）。 */
export interface ViewWebServer {
  registerUpgrade(options: {
    path: string
    handler: (req: IncomingMessage, socket: unknown, head: Buffer) => void
  }): () => void
}

/** webRuntime 服务面（可信主机列表）。 */
export interface ViewWebRuntime {
  readonly trustedHosts: readonly string[]
}

/** skills 服务面（技能注册中心，可选）。 */
export interface ViewSkills {
  register(skill: SkillRegistration): () => void
}

/** tools 服务面。 */
export interface ViewTools {
  register(tool: unknown): () => void
}

/** 本插件看到的 Context。 */
export interface ViewContextShape {
  webServer: ViewWebServer
  webRuntime: ViewWebRuntime
  skills?: ViewSkills
  tools: ViewTools
  /** cordis 生命周期工具。 */
  effect(fn: () => (() => void) | void, label?: string): void
}

/** 结构镜像 + vendored cordis Context 的交叉类型。 */
export type Context = CordisContext & ViewContextShape
