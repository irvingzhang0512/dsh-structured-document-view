import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ViewSessionManager } from '../src/client/session-manager.ts'
import { TabView } from '../src/client/views/tab-view.tsx'

class FakeWebSocket {
  static readonly OPEN = 1
  static instances: FakeWebSocket[] = []

  readonly url: string
  readyState = 0
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  close = vi.fn(() => { this.readyState = 3 })
  send = vi.fn()

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }
}

describe('ViewSessionManager session 生命周期', () => {
  beforeEach(() => {
    FakeWebSocket.instances = []
    vi.stubGlobal('WebSocket', FakeWebSocket)
    vi.stubGlobal('window', {
      location: { protocol: 'http:', host: 'localhost:3180' },
      setTimeout,
      clearTimeout,
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('幂等创建每个 session 的 runtime', () => {
    const manager = new ViewSessionManager()
    expect(manager.ensureRuntime('s1')).toBe(manager.ensureRuntime('s1'))
    expect(manager.ensureRuntime('s2')).not.toBe(manager.ensureRuntime('s1'))
    manager.disposeAll()
  })

  it('切换 session 时关闭旧连接，切回时建立新连接', () => {
    const manager = new ViewSessionManager()
    manager.setActiveSession('s1')
    manager.setActiveSession('s1')
    expect(FakeWebSocket.instances).toHaveLength(1)

    manager.setActiveSession('s2')
    expect(FakeWebSocket.instances).toHaveLength(2)
    expect(FakeWebSocket.instances[0]?.close).toHaveBeenCalledOnce()

    manager.setActiveSession('s1')
    expect(FakeWebSocket.instances).toHaveLength(3)
    expect(FakeWebSocket.instances[2]?.url).toContain('sessionId=s1')
    manager.disposeAll()
  })

  it('Tab 先于全局快照渲染时也会同步创建并显示 runtime', () => {
    const manager = new ViewSessionManager()
    const html = renderToStaticMarkup(createElement(TabView, {
      manager,
      scope: { sessionId: 'restored-session' },
      visible: true,
    } as never))

    expect(manager.getRuntime('restored-session')).toBeDefined()
    expect(html).toContain('sdv-toolbar')
    expect(html).not.toContain('正在连接视图会话')
    manager.disposeAll()
  })

  it('隐藏的恢复 Tab 先准备 runtime，重新打开时显示同一会话内容', () => {
    const manager = new ViewSessionManager()
    const baseProps = {
      manager,
      scope: { sessionId: 'hidden-session' },
    }

    const hiddenHtml = renderToStaticMarkup(createElement(TabView, {
      ...baseProps,
      visible: false,
    } as never))
    const runtime = manager.getRuntime('hidden-session')
    const visibleHtml = renderToStaticMarkup(createElement(TabView, {
      ...baseProps,
      visible: true,
    } as never))

    expect(runtime).toBeDefined()
    expect(manager.getRuntime('hidden-session')).toBe(runtime)
    expect(hiddenHtml).not.toContain('sdv-toolbar')
    expect(visibleHtml).toContain('sdv-toolbar')
    manager.disposeAll()
  })
})
