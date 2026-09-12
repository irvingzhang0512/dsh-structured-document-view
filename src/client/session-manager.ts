/**
 * ViewSessionManager（会话管理器）：按会话维护 {@link ViewRuntime} 与
 * {@link ViewBridgeClient}。
 *
 * - 每个会话懒创建独立运行时（各自的 Mock 文档与视图状态，互不串扰）；
 * - 只连接"当前活动会话"的桥（与 controller 的桥接模式一致），
 *   切换会话时关闭旧连接、打开新连接。
 */
import { ViewRuntime } from './runtime.ts'
import { ViewBridgeClient } from './bridge-client.ts'

/** 会话管理器（模块级单例，由客户端 apply 初始化）。 */
export class ViewSessionManager {
  private readonly runtimes = new Map<string, ViewRuntime>()
  private readonly clients = new Map<string, ViewBridgeClient>()
  private activeSessionId: string | null = null
  private disposed = false
  /** 「打开结构化文档页签」回调（open_tab 命令执行时调用；由 apply 注入）。 */
  private openTabHandler: (() => void) | undefined = undefined

  /** 注入打开视图页签的回调（客户端 apply 创建 adapter 后设置）。 */
  setOpenTabHandler(handler: () => void): void {
    this.openTabHandler = handler
  }

  /** 获取（必要时创建）某会话的运行时。 */
  ensureRuntime(sessionId: string): ViewRuntime {
    let runtime = this.runtimes.get(sessionId)
    if (runtime === undefined) {
      runtime = new ViewRuntime(
        sessionId,
        (wire) => this.clientFor(sessionId)?.sendWire(wire),
        (message) => this.clientFor(sessionId)?.sendMessage(message),
        undefined,
        () => this.openTabHandler?.(),
      )
      this.runtimes.set(sessionId, runtime)
    }
    return runtime
  }

  /** 获取某会话的运行时；不存在返回 undefined。 */
  getRuntime(sessionId: string): ViewRuntime | undefined {
    return this.runtimes.get(sessionId)
  }

  /** 设置当前活动会话：连接其桥（幂等）。 */
  setActiveSession(sessionId: string): void {
    if (this.disposed || sessionId === this.activeSessionId) return
    // 关闭旧会话的连接（运行时保留，切换回来可继续用）。
    if (this.activeSessionId !== null) {
      const oldSessionId = this.activeSessionId
      const old = this.clients.get(oldSessionId)
      old?.close()
      // close() 后 client 不允许再次 connect；移除它，切回该会话时重建连接。
      this.clients.delete(oldSessionId)
    }
    this.activeSessionId = sessionId
    this.ensureRuntime(sessionId)
    this.clientFor(sessionId)?.connect()
  }

  /** 释放某会话的运行时与连接。 */
  disposeSession(sessionId: string): void {
    this.clients.get(sessionId)?.close()
    this.clients.delete(sessionId)
    const runtime = this.runtimes.get(sessionId)
    runtime?.dispose()
    this.runtimes.delete(sessionId)
    if (this.activeSessionId === sessionId) this.activeSessionId = null
  }

  /** 释放全部。 */
  disposeAll(): void {
    if (this.disposed) return
    this.disposed = true
    for (const client of this.clients.values()) client.close()
    for (const runtime of this.runtimes.values()) runtime.dispose()
    this.clients.clear()
    this.runtimes.clear()
    this.activeSessionId = null
  }

  private clientFor(sessionId: string): ViewBridgeClient | undefined {
    let client = this.clients.get(sessionId)
    if (client === undefined) {
      const runtime = this.ensureRuntime(sessionId)
      client = new ViewBridgeClient(sessionId, {
        onCommand: (id, command) => {
          void id
          return runtime.applyCommand(command)
        },
        onCapabilities: (capabilities) => runtime.applyCapabilities(capabilities),
        onDocument: (message) => runtime.applyHostDocument(message),
        onSelection: (message) => runtime.applyHostSelection(message.selectedNodeId),
      })
      this.clients.set(sessionId, client)
    }
    return client
  }
}
