/**
 * 构建产物冒烟（lib/client.js）：DSH 客户端 bundle 形态与首屏挂载。
 *
 * 直接跑构建产物（不是 src），验证：
 * 1. `window.__ModuleLoader__.load({ id, factory })` 的 id 就是 npm 包名
 *    （client-modules 以包名为 compose key，写错会静默失效）；
 * 2. 工厂可执行、导出 inject/apply，`apply()` 能注册「结构化文档」页并
 *    不抛异常；
 * 3. 未握手时注册页不影响运行（会话切换只打开页签，不预置任何文档）。
 *
 * lib/client.js 是构建产物：未构建时跳过（不把「没构建」当测试失败）。
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createContext, runInContext } from 'node:vm'
import * as React from 'react'
import * as ReactJsxRuntime from 'react/jsx-runtime'
import type { Context } from 'dsh-better-sidebar'

const BUNDLE_PATH = fileURLToPath(new URL('../lib/client.js', import.meta.url))
const BUNDLE_ID = 'dsh-structured-document-view'

interface CapturedModule {
  id: string
  factory: (require: (id: string) => unknown) => Record<string, unknown>
}

/** 最小 DOM / window 桩：只提供插件 apply 需要的表面。 */
function makeEnvironment(): { captured: CapturedModule[], tabs: Record<string, unknown>[], opened: unknown[], context: ReturnType<typeof createContext> } {
  const captured: CapturedModule[] = []
  const tabs: Record<string, unknown>[] = []
  const opened: unknown[] = []
  const styleStub = { id: '', textContent: '' }
  const windowStub: Record<string, unknown> = {
    __ModuleLoader__: { load: (module: CapturedModule) => { captured.push(module) } },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    location: { protocol: 'http:', host: '127.0.0.1:3080' },
    // 未握手场景不需要真实定时器：退避与去抖在此用例中不阻塞退出。
    setTimeout: () => 0,
    clearTimeout: () => undefined,
    setInterval: () => 0,
    clearInterval: () => undefined,
  }
  const documentStub = {
    getElementById: () => null,
    createElement: () => styleStub,
    head: { appendChild: () => undefined },
  }
  const context = createContext({
    window: windowStub,
    document: documentStub,
    console,
    setTimeout: () => 0,
    clearTimeout: () => undefined,
    // 浏览器宿主提供、Node VM 裸上下文没有的全局能力。
    structuredClone: (value: unknown) => structuredClone(value),
    require: (id: string) => {
      if (id === 'react') return React
      if (id === 'react/jsx-runtime') return ReactJsxRuntime
      throw new Error(`unexpected require("${id}") in client bundle`)
    },
  })
  return { captured, tabs, opened, context }
}

/** 加载构建产物并返回其导出（apply/inject）。 */
function loadBundle(context: ReturnType<typeof createContext>, captured: CapturedModule[]): Record<string, unknown> {
  runInContext(readFileSync(BUNDLE_PATH, 'utf8'), context)

  expect(captured).toHaveLength(1)
  const module = captured[0]!
  expect(module.id).toBe(BUNDLE_ID)
  return module.factory((id) => (context as unknown as { require: (id: string) => unknown }).require(id))
}

/**
 * 挂载客户端半区：fake ctx + fake betterSidebar service（按需给 `features`
 * 与 `prefs.pluginSettings`），返回注册到的页签描述符与打开记录。
 */
function mountClient(
  exports: Record<string, unknown>,
  options: { features?: string[], pluginSettings?: unknown } = {},
): { tabs: Record<string, unknown>[], opened: unknown[], disposers: Array<() => void> } {
  const tabs: Record<string, unknown>[] = []
  const opened: unknown[] = []
  const prefs: Record<string, unknown> = options.pluginSettings === undefined
    ? {}
    : { pluginSettings: { 'structured-document-view': options.pluginSettings } }
  const disposers: Array<() => void> = []
  const service: Record<string, unknown> = {
    registerTab: (descriptor: Record<string, unknown>) => {
      tabs.push(descriptor)
      return () => undefined
    },
    getSnapshot: () => ({ sessionId: 's1', state: undefined, prefs }),
    subscribeState: () => () => undefined,
    openTab: (seed: unknown) => { opened.push(seed) },
  }
  if (options.features !== undefined) service.features = options.features
  const fakeCtx = {
    effect: (fn: () => (() => void) | void) => {
      const dispose = fn()
      if (typeof dispose === 'function') disposers.push(dispose)
      return () => undefined
    },
    betterSidebar: service,
  }
  ;(exports.apply as (ctx: Context) => void)(fakeCtx as unknown as Context)
  return { tabs, opened, disposers }
}

describe.skipIf(!existsSync(BUNDLE_PATH))('lib/client.js 构建产物冒烟', () => {
  it('以包名注册，apply 注册「结构化文档」页且不抛异常', () => {
    const { captured, context } = makeEnvironment()
    const exports = loadBundle(context, captured)
    expect(exports.inject).toEqual(['betterSidebar'])
    expect(typeof exports.apply).toBe('function')

    const { tabs, opened, disposers } = mountClient(exports)

    // 注册了唯一的视图页，并在会话激活时打开它（未握手不会预置任何文档）。
    expect(tabs).toHaveLength(1)
    expect(tabs[0]!.id).toBe('structured-document-view')
    // 标题是惰性函数（DSH 侧边栏契约），要求返回静态字符串。
    expect((tabs[0]!.title as () => string)()).toBe('Irving · 结构化文档视图')
    expect(opened).toHaveLength(1)
    expect((opened[0] as { type: string }).type).toBe('structured-document-view')

    // 释放路径不得抛异常（effect 的 disposer）。
    for (const dispose of disposers) expect(() => dispose()).not.toThrow()
  })

  it('F011：支持 pluginToggles 时声明四项设置行', () => {
    const { captured, context } = makeEnvironment()
    const exports = loadBundle(context, captured)
    const { tabs } = mountClient(exports, { features: ['pluginSettings'] })

    const settings = tabs[0]!.settings as { pluginToggles?: Array<{ key: string, type?: string }> } | undefined
    expect(settings).toBeDefined()
    expect(settings!.pluginToggles!.map(row => row.key)).toEqual([
      'autoOpenTab',
      'defaultView',
      'defaultLayout',
      'defaultMindmapDepth',
    ])
    expect(settings!.pluginToggles!.map(row => row.type)).toEqual(['switch', 'select', 'select', 'number'])
  })

  it('F011 A2：autoOpenTab=false 时不自动打开页签，但页签照常注册', () => {
    const { captured, context } = makeEnvironment()
    const exports = loadBundle(context, captured)
    const { tabs, opened } = mountClient(exports, {
      features: ['pluginSettings'],
      pluginSettings: { autoOpenTab: false },
    })

    expect(tabs).toHaveLength(1)
    expect(opened).toHaveLength(0)
  })

  it('F011 A7：没有 pluginSettings 能力时不声明设置行，仍自动打开页签（内置默认）', () => {
    const { captured, context } = makeEnvironment()
    const exports = loadBundle(context, captured)
    const { tabs, opened } = mountClient(exports, { features: ['stateSubscription'] })

    expect(tabs).toHaveLength(1)
    expect(tabs[0]!.settings).toBeUndefined()
    expect(opened).toHaveLength(1)
  })
})
