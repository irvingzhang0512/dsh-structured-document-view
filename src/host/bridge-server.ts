/**
 * 桥接服务器（宿主侧）：把 Tool 的命令投递给会话的客户端（浏览器），
 * 吸收客户端的状态推送进镜像。
 *
 * 投递语义与 dsh-better-sidebar-controller 的 BridgeServer 一致：
 * - 会话有客户端连接时：发送命令并等待 ack（有界超时）；
 * - 无连接时：命令入队，等该会话下次连接时重放；
 * - 镜像保留每会话最近一次推送的状态并标记断连。
 */
import { randomUUID } from 'node:crypto'
import type { ClientToHostMessage, CommandAck, DispatchOutcome, HostToClientMessage, ViewCommand, ViewStateWire } from '../shared/types.ts'
import { ViewMirrorStore } from './mirror-store.ts'

/** 一条命令等待 ack 的默认超时。 */
export const BRIDGE_ACK_TIMEOUT_MS = 4000

/** 最小消息发送器（生产为 WebSocket，测试为桩）。 */
export type Sender = (message: string) => void

export interface ViewBridgeOptions {
  /** 状态镜像。 */
  store: ViewMirrorStore
  /** 时钟注入（测试用）。 */
  now?: () => number
  /**
   * 宿主能力声明（hello 应答时下发）：`structuredDocument` 为 true 表示
   * dsh-structured-document 集成已激活。客户端据此决定数据源模式。
   */
  capabilities?: { structuredDocument?: boolean }
  /**
   * 客户端消息钩子（hello / select-node / current-file）：宿主集成层
   * （如 HostDocumentIntegrator）在此订阅会话事件。
   */
  onMessage?: (sessionId: string, message: ClientToHostMessage) => void
}

export class ViewBridgeServer {
  readonly store: ViewMirrorStore
  private sockets = new Map<string, Set<Sender>>()
  private queues = new Map<string, Array<{ id: string; command: ViewCommand }>>()
  private pending = new Map<string, { resolve: (ack: CommandAck | null) => void; timer: ReturnType<typeof setTimeout> }>()

  constructor(private options: ViewBridgeOptions) {
    this.store = options.store
  }

  /** 会话是否至少有一个客户端连接。 */
  isAttached(sessionId: string): boolean {
    return (this.sockets.get(sessionId)?.size ?? 0) > 0
  }

  /** 为会话附加一个客户端发送器；返回解除函数。 */
  attach(sessionId: string, sender: Sender): () => void {
    let set = this.sockets.get(sessionId)
    if (set === undefined) {
      set = new Set()
      this.sockets.set(sessionId, set)
    }
    set.add(sender)
    return () => this.detach(sessionId, sender)
  }

  /** 解除一个发送器（幂等）。 */
  detach(sessionId: string, sender: Sender): void {
    const set = this.sockets.get(sessionId)
    if (set === undefined) return
    set.delete(sender)
    if (set.size === 0) {
      this.sockets.delete(sessionId)
      this.store.markDisconnected(sessionId, this.options.now?.() ?? Date.now())
    }
  }

  /** 路由一条客户端消息。 */
  handleClientMessage(sessionId: string, message: { type: string; state?: ViewStateWire; result?: CommandAck }, origin?: Sender): void {
    switch (message.type) {
      case 'hello':
        // 先协商能力（客户端据此定数据源模式），再重放排队命令。
        this.sendHelloAck(sessionId, origin)
        this.replay(sessionId)
        break
      case 'state':
        if (message.state !== undefined) {
          this.store.apply(message.state, this.options.now?.() ?? Date.now())
        }
        break
      case 'command-result':
        if (message.result !== undefined) this.onAck(message.result)
        break
    }
    // 集成层钩子（hello / select-node / current-file 等）。
    this.options.onMessage?.(sessionId, message as ClientToHostMessage)
  }

  /** 宿主 → 客户端单向推送（文档快照 / 选中变化，不等 ack）。 */
  push(sessionId: string, message: HostToClientMessage): void {
    this.broadcast(sessionId, JSON.stringify(message))
  }

  /**
   * 派发一条命令给会话客户端。有连接时等待 ack（`waitMs` 有界超时）；
   * 无连接时入队并立即返回 `{ delivered: false, queued: true }`。
   */
  async dispatch(
    sessionId: string,
    command: ViewCommand,
    waitMs: number = BRIDGE_ACK_TIMEOUT_MS,
  ): Promise<DispatchOutcome> {
    if (!this.isAttached(sessionId)) {
      this.enqueue(sessionId, { id: randomUUID(), command })
      return { delivered: false, queued: true, ack: null }
    }
    const id = randomUUID()
    const ackPromise = this.expectAck(id, waitMs)
    this.broadcast(sessionId, JSON.stringify({ type: 'command', id, command }))
    const ack = await ackPromise
    return { delivered: true, queued: false, ack }
  }

  /** 丢弃某会话的排队命令（teardown）。 */
  drain(sessionId: string): void {
    this.queues.delete(sessionId)
  }

  /** 拒绝并清空所有挂起 ack 等待者与队列（teardown）。 */
  dispose(): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.resolve(null)
    }
    this.pending.clear()
    this.queues.clear()
    this.sockets.clear()
  }

  // ── 内部 ────────────────────────────────────────────────────────────────

  private broadcast(sessionId: string, message: string): void {
    const set = this.sockets.get(sessionId)
    if (set === undefined) return
    for (const sender of [...set]) {
      try {
        sender(message)
      } catch {
        // 死掉的发送器会在 close/error 上清理；这里忽略。
      }
    }
  }

  private sendHelloAck(sessionId: string, origin?: Sender): void {
    const ack = JSON.stringify({
      type: 'hello-ack',
      capabilities: { structuredDocument: this.options.capabilities?.structuredDocument === true },
    })
    if (origin !== undefined) {
      try {
        origin(ack)
      } catch {
        // 发送失败：忽略（socket 清理流程会处理）。
      }
      return
    }
    this.broadcast(sessionId, ack)
  }

  private enqueue(sessionId: string, entry: { id: string; command: ViewCommand }): void {
    const list = this.queues.get(sessionId)
    if (list === undefined) {
      this.queues.set(sessionId, [entry])
      return
    }
    if (list.length >= 64) return // 有界队列，防止无限积压
    list.push(entry)
  }

  private replay(sessionId: string): void {
    const list = this.queues.get(sessionId)
    if (list === undefined || list.length === 0) return
    this.queues.delete(sessionId)
    for (const entry of list) {
      this.broadcast(sessionId, JSON.stringify({ type: 'command', id: entry.id, command: entry.command }))
    }
  }

  private expectAck(id: string, waitMs: number): Promise<CommandAck | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        resolve(null)
      }, waitMs)
      this.pending.set(id, { resolve, timer })
    })
  }

  private onAck(ack: CommandAck): void {
    const pending = this.pending.get(ack.id)
    if (pending === undefined) return
    clearTimeout(pending.timer)
    this.pending.delete(ack.id)
    pending.resolve(ack)
  }
}
