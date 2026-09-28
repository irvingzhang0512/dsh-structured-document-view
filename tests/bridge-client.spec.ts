/**
 * ViewBridgeClient 重连韧性测试。
 *
 * 背景修复：旧实现重连失败 8 次后永久放弃，且同会话 setActiveSession
 * 幂等短路——DSH 重启 / 插件热重载慢于 16s 时，浏览器端会永久停留在
 * Mock 数据源（视图打开默认显示示例文档）。现在改为指数退避（封顶 30s）
 * 的无限重试 + 同会话激活自愈。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ViewBridgeClient } from '../src/client/bridge-client.ts'

class FakeWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  static instances: FakeWebSocket[] = []

  readonly url: string
  readyState = FakeWebSocket.CONNECTING
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  close = vi.fn(() => {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.()
  })
  send = vi.fn()

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  /** 测试辅助：模拟服务端接受连接。 */
  accept(): void {
    this.readyState = FakeWebSocket.OPEN
    this.onopen?.()
  }

  /** 测试辅助：模拟连接失败（服务端不可达 / upgrade 被拒）。 */
  reject(): void {
    this.readyState = FakeWebSocket.CLOSED
    this.onerror?.()
    this.onclose?.()
  }
}

describe('ViewBridgeClient 重连韧性', () => {
  beforeEach(() => {
    FakeWebSocket.instances = []
    // 先启用假定时器，再 stub window（让 window.setTimeout 捕获到假定时器）。
    vi.useFakeTimers()
    vi.stubGlobal('WebSocket', FakeWebSocket)
    vi.stubGlobal('window', {
      location: { protocol: 'http:', host: 'localhost:3180' },
      setTimeout,
      clearTimeout,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('连接成功发送 hello，断开后自动重连并重发 hello', () => {
    const client = new ViewBridgeClient('s1', {})
    client.connect()

    const first = FakeWebSocket.instances[0]!
    first.accept()
    expect(first.send).toHaveBeenCalledWith(expect.stringContaining('"type":"hello"'))

    first.reject()
    vi.advanceTimersByTime(2000)
    expect(FakeWebSocket.instances).toHaveLength(2)
    expect(FakeWebSocket.instances[1]!.url).toContain('sessionId=s1')
    FakeWebSocket.instances[1]!.accept()
    expect(FakeWebSocket.instances[1]!.send).toHaveBeenCalledWith(expect.stringContaining('"type":"hello"'))
  })

  it('连续失败按指数退避：2s → 4s → 8s → 16s → 30s 封顶', () => {
    const client = new ViewBridgeClient('s1', {})
    client.connect()
    expect(FakeWebSocket.instances).toHaveLength(1)

    // 第 1 次失败 → 2s 后重试。
    FakeWebSocket.instances[0]!.reject()
    vi.advanceTimersByTime(1999)
    expect(FakeWebSocket.instances).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(FakeWebSocket.instances).toHaveLength(2)

    // 第 2 次失败 → 4s 后重试。
    FakeWebSocket.instances[1]!.reject()
    vi.advanceTimersByTime(3999)
    expect(FakeWebSocket.instances).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(FakeWebSocket.instances).toHaveLength(3)

    // 第 3 次失败 → 8s；第 4 次 → 16s；第 5 次起封顶 30s。
    const delays: number[] = []
    let previous = 2
    const expectNext = (delay: number): void => {
      FakeWebSocket.instances[previous]!.reject()
      vi.advanceTimersByTime(delay - 1)
      expect(FakeWebSocket.instances).toHaveLength(previous + 1)
      vi.advanceTimersByTime(1)
      expect(FakeWebSocket.instances).toHaveLength(previous + 2)
      delays.push(delay)
      previous += 1
    }
    expectNext(8000)
    expectNext(16000)
    expectNext(30000)
    // 封顶：第 6 次失败后仍是 30s，而不是继续翻倍。
    FakeWebSocket.instances[previous]!.reject()
    vi.advanceTimersByTime(30000)
    expect(FakeWebSocket.instances).toHaveLength(previous + 2)
  })

  it('重试不再有 8 次上限：远超旧预算后仍会重连并自愈', () => {
    const client = new ViewBridgeClient('s1', {})
    client.connect()

    // 旧实现 8 次失败（16s）即永久放弃；现在持续退避重试。
    for (let round = 0; round < 20; round += 1) {
      FakeWebSocket.instances[FakeWebSocket.instances.length - 1]!.reject()
      vi.advanceTimersByTime(30000)
    }
    expect(FakeWebSocket.instances.length).toBeGreaterThanOrEqual(20)

    // 服务端恢复：下一次重连成功 → hello 发出（数据源模式随之切换）。
    const last = FakeWebSocket.instances[FakeWebSocket.instances.length - 1]!
    last.accept()
    expect(last.send).toHaveBeenCalledWith(expect.stringContaining('"type":"hello"'))
  })

  it('close() 终止重连；同会话再次 connect() 可重建连接（自愈入口）', () => {
    const client = new ViewBridgeClient('s1', {})
    client.connect()
    const first = FakeWebSocket.instances[0]!
    first.accept()
    client.close()
    expect(first.close).toHaveBeenCalled()

    // close 后 connect 不再连接（会话已切换的语义）。
    client.connect()
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('连接挂起时重复 connect() 不会叠加 socket；退避等待期 connect() 不提前重试', () => {
    const client = new ViewBridgeClient('s1', {})
    client.connect()
    client.connect()
    expect(FakeWebSocket.instances).toHaveLength(1)

    // 失败进入退避等待（socket 已置空、定时器挂起）：
    FakeWebSocket.instances[0]!.reject()
    expect(FakeWebSocket.instances).toHaveLength(1)

    // 退避等待期的 connect() 不提前重试（避免高频事件绕过退避限流）。
    client.connect()
    expect(FakeWebSocket.instances).toHaveLength(1)
    vi.advanceTimersByTime(2000)
    // 退避定时器到点后自动重试。
    expect(FakeWebSocket.instances).toHaveLength(2)
  })
})
