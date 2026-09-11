/**
 * View 状态镜像存储（宿主侧）。
 *
 * 客户端把权威 View State / 文档大纲 / 选中节点镜像到宿主；Tool 从这里
 * 读取状态、判读连接情况。与 dsh-better-sidebar-controller 的
 * ControllerStateStore 同一模式。
 */
import type { ViewStateMirror, ViewStateWire } from '../shared/types.ts'

/** View 状态镜像存储。 */
export class ViewMirrorStore {
  private mirrors = new Map<string, ViewStateMirror>()

  /** 客户端推送新状态。 */
  apply(wire: ViewStateWire, now = Date.now()): void {
    const existing = this.mirrors.get(wire.sessionId)
    if (existing !== undefined) {
      existing.state = wire
      existing.connected = true
      existing.updatedAt = now
    } else {
      this.mirrors.set(wire.sessionId, {
        sessionId: wire.sessionId,
        connected: true,
        state: wire,
        updatedAt: now,
      })
    }
  }

  /** 会话失去连接。 */
  markDisconnected(sessionId: string, now = Date.now()): void {
    const mirror = this.mirrors.get(sessionId)
    if (mirror !== undefined) {
      mirror.connected = false
      mirror.updatedAt = now
    }
  }

  /** 读取某会话的最新镜像；无镜像返回 undefined。 */
  get(sessionId: string): ViewStateMirror | undefined {
    return this.mirrors.get(sessionId)
  }

  /** 全部镜像（调试 / 测试用）。 */
  snapshot(): ViewStateMirror[] {
    return [...this.mirrors.values()]
  }

  /** 清空（teardown）。 */
  clear(): void {
    this.mirrors.clear()
  }
}
