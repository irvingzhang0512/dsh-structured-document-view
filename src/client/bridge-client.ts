/**
 * 视图桥客户端（浏览器侧）：连接宿主 `/structured-document-view/ws`，
 * 接收 ViewCommand、宿主文档/选中推送，回执执行结果、推送状态镜像。
 *
 * 仅连接当前活动会话；连接断开后按退避策略重连（拒绝的端点不会无限重试）。
 */
import type { BridgeClientHandlerSet, ClientToHostMessage, ViewStateWire } from '../shared/types.ts'
import { encodeAck, encodeClientCurrentFile, encodeClientSelectNode, encodeClientState, encodeHello, parseHostMessage } from '../shared/wire.ts'

/** 桥升级路径（必须与宿主半区一致）。 */
const BRIDGE_PATH = '/structured-document-view/ws'

/** 重连失败上限与间隔。 */
const RECONNECT_FAILURE_LIMIT = 8
const RECONNECT_DELAY_MS = 2000

/** 桥客户端处理器。 */
export type BridgeClientHandlers = BridgeClientHandlerSet

/** 视图桥客户端。 */
export class ViewBridgeClient {
  private socket: WebSocket | null = null
  private retryTimer: number | undefined
  private closed = false
  private failures = 0
  private attached = false

  constructor(
    private readonly sessionId: string,
    private readonly handlers: BridgeClientHandlers,
  ) {}

  /** 开始连接（幂等）。 */
  connect(): void {
    if (this.closed || this.socket !== null) return
    this.open()
  }

  /** 推送一条状态镜像到宿主。 */
  sendWire(wire: ViewStateWire): void {
    this.send(encodeClientState(wire))
  }

  /** 推送选中节点同步到宿主（select-node）。 */
  sendSelectNode(nodeId: string | null): void {
    this.send(encodeClientSelectNode(nodeId))
  }

  /** 推送当前文件同步到宿主（current-file）。 */
  sendCurrentFile(path: string | null): void {
    this.send(encodeClientCurrentFile(path))
  }

  /** 发送任意客户端 → 宿主消息（测试/扩展用）。 */
  sendMessage(message: ClientToHostMessage): void {
    this.send(JSON.stringify(message))
  }

  /** 是否已连接。 */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN
  }

  /** 关闭连接（不再重连）。 */
  close(): void {
    this.closed = true
    if (this.retryTimer !== undefined) {
      window.clearTimeout(this.retryTimer)
      this.retryTimer = undefined
    }
    if (this.socket !== null) {
      this.socket.close()
      this.socket = null
    }
  }

  private open(): void {
    if (this.closed) return
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${proto}//${window.location.host}${BRIDGE_PATH}?sessionId=${encodeURIComponent(this.sessionId)}`
    let socket: WebSocket
    try {
      socket = new WebSocket(url)
    } catch {
      this.scheduleReconnect()
      return
    }
    this.socket = socket
    socket.onopen = () => {
      this.failures = 0
      this.attached = true
      this.send(encodeHello(this.sessionId))
    }
    socket.onmessage = (event) => {
      const text = typeof event.data === 'string' ? event.data : String(event.data)
      try {
        const message = parseHostMessage(text)
        if (message.type === 'command') {
          const result = this.handlers.onCommand(message.id, message.command)
          const sendAck = (ack: Awaited<typeof result>): void => {
            this.send(encodeAck({ id: message.id, ok: ack.ok, code: ack.code, message: ack.message, ...(ack.value !== undefined ? { value: ack.value } : {}) }))
          }
          if (result instanceof Promise) void result.then(sendAck).catch(() => sendAck({ ok: false, code: 'INTERNAL_ERROR', message: '客户端执行命令失败。' }))
          else sendAck(result)
        } else if (message.type === 'hello-ack') {
          this.handlers.onCapabilities?.(message.capabilities)
        } else if (message.type === 'document') {
          this.handlers.onDocument?.(message)
        } else {
          this.handlers.onSelection?.(message)
        }
      } catch {
        // 畸形消息：丢弃，保持连接。
      }
    }
    socket.onclose = () => {
      if (this.socket === socket) this.socket = null
      if (!this.closed) this.scheduleReconnect()
    }
    socket.onerror = () => {
      // 由 onclose 统一处理重连。
    }
  }

  private send(text: string): void {
    if (this.socket !== null && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(text)
    }
  }

  private scheduleReconnect(): void {
    if (this.closed || this.retryTimer !== undefined) return
    this.failures += 1
    if (this.failures > RECONNECT_FAILURE_LIMIT) return
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = undefined
      this.open()
    }, RECONNECT_DELAY_MS)
  }

  /** 供宿主判断（测试用）。 */
  get attachedSession(): string {
    return this.sessionId
  }
}
