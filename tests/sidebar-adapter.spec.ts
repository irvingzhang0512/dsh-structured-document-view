/**
 * SidebarAdapter 的侧边卡片设置契约（SPEC F011）。
 *
 * 用 fake `BetterSidebarService`（只实现本插件真正用到的公开面）覆盖：
 * 设置行声明、prefs 读回解析、autoOpenTab 门控、无 `pluginSettings` 能力的回退。
 */
import { describe, expect, it, vi } from 'vitest'
import type { BetterSidebarService, TabDescriptor } from 'dsh-better-sidebar'
import { SidebarAdapter, VIEW_TAB_TYPE } from '../src/client/sidebar-adapter.tsx'

interface FakeOptions {
  /** 能力清单；undefined 模拟 < 0.12.0（连 `features` 都没有）。 */
  features?: readonly string[]
  /** 完整 prefs；undefined 模拟快照里没有 prefs。 */
  prefs?: unknown
  sessionId?: string
}

function makeService(options: FakeOptions = {}): {
  service: BetterSidebarService
  tabs: TabDescriptor[]
  opened: unknown[]
} {
  const tabs: TabDescriptor[] = []
  const opened: unknown[] = []
  const snapshot: Record<string, unknown> = { sessionId: options.sessionId ?? 's1', state: undefined }
  if (options.prefs !== undefined) snapshot.prefs = options.prefs
  const service = {
    registerTab: (descriptor: TabDescriptor) => { tabs.push(descriptor); return () => undefined },
    subscribeState: () => () => undefined,
    getSnapshot: () => snapshot,
    openTab: (seed: unknown) => { opened.push(seed) },
    ...(options.features === undefined ? {} : { features: options.features }),
  }
  return { service: service as unknown as BetterSidebarService, tabs, opened }
}

function makeAdapter(service: BetterSidebarService): SidebarAdapter {
  return new SidebarAdapter({ service, component: () => () => null })
}

/** 带设置能力的 prefs（`pluginSettings` 里放着本插件的键值）。 */
function prefsWith(blob: unknown): unknown {
  return { pluginSettings: { [VIEW_TAB_TYPE]: blob } }
}

describe('SidebarAdapter 设置行声明', () => {
  it('宿主支持 pluginToggles 时声明四项设置（键/控件/选项/下界）', () => {
    const { service, tabs } = makeService({ features: ['pluginSettings'] })
    makeAdapter(service).registerTab()

    expect(tabs).toHaveLength(1)
    const rows = tabs[0]!.settings?.pluginToggles
    expect(rows).toBeDefined()
    // 键与 pluginSettings['structured-document-view'] 逐字一致
    expect(rows!.map(row => row.key)).toEqual(['autoOpenTab', 'defaultView', 'defaultLayout', 'defaultMindmapDepth'])
    expect(rows!.map(row => row.type)).toEqual(['switch', 'select', 'select', 'number'])
    expect(rows![1]!.options!.map(option => option.value)).toEqual(['markdown', 'mindmap', 'table'])
    expect(rows![2]!.options!.map(option => option.value)).toEqual(['mind', 'logical', 'down'])
    expect(rows![3]!.min).toBe(0)
    // 每行都要有标题（否则设置弹窗里只有控件没有说明）
    for (const row of rows!) expect(typeof row.title === 'string' ? row.title : row.title()).not.toBe('')
    // 不使用自定义面板（避免依赖「render 与行列表的先后」这一实现差异）
    expect(tabs[0]!.settings?.render).toBeUndefined()
  })

  it('宿主没有 pluginSettings 能力（或无 features 字段）时不声明设置且回退内置默认', () => {
    for (const features of [undefined, ['stateSubscription']] as const) {
      const { service, tabs } = makeService(features === undefined ? {} : { features: [...features] })
      const adapter = makeAdapter(service)
      adapter.registerTab()
      expect(tabs).toHaveLength(1)
      expect(tabs[0]!.settings).toBeUndefined()
      expect(adapter.supportsPluginSettings()).toBe(false)
      expect(adapter.readViewDefaults()).toEqual({
        autoOpenTab: true,
        defaultView: 'markdown',
        defaultLayout: 'logical',
        defaultMindmapDepth: 2,
      })
    }
  })

  it('openViewTab 用本插件页标识打开页签', () => {
    const { service, opened } = makeService({ features: ['pluginSettings'] })
    makeAdapter(service).openViewTab()
    expect(opened).toEqual([{ type: VIEW_TAB_TYPE, id: VIEW_TAB_TYPE, title: '结构化文档' }])
  })
})

describe('SidebarAdapter 设置读回与门控', () => {
  it('读回 pluginSettings 里的四项取值', () => {
    const { service } = makeService({
      features: ['pluginSettings'],
      prefs: prefsWith({ autoOpenTab: false, defaultView: 'mindmap', defaultLayout: 'down', defaultMindmapDepth: 0 }),
    })
    const adapter = makeAdapter(service)
    expect(adapter.readViewDefaults()).toEqual({
      autoOpenTab: false,
      defaultView: 'mindmap',
      defaultLayout: 'down',
      defaultMindmapDepth: 0,
    })
    expect(adapter.shouldAutoOpenTab()).toBe(false)
  })

  it('未设置（空 blob / 无 pluginSettings 键 / 无 prefs）时四项回退内置默认', () => {
    const cases: unknown[] = [
      prefsWith({}),
      { pluginSettings: {} },
      { pluginSettings: { 'other-plugin': { autoOpenTab: false } } },
      {},
    ]
    for (const prefs of cases) {
      const { service } = makeService({ features: ['pluginSettings'], prefs })
      expect(makeAdapter(service).readViewDefaults()).toEqual({
        autoOpenTab: true,
        defaultView: 'markdown',
        defaultLayout: 'logical',
        defaultMindmapDepth: 2,
      })
    }
    // 连 prefs 都没有（老版本快照）也不抛错
    const { service: bare } = makeService({ features: ['pluginSettings'] })
    expect(makeAdapter(bare).readViewDefaults()).toEqual({
      autoOpenTab: true,
      defaultView: 'markdown',
      defaultLayout: 'logical',
      defaultMindmapDepth: 2,
    })
  })

  it('非法取值逐字段回退，不抛错', () => {
    const { service } = makeService({
      features: ['pluginSettings'],
      prefs: prefsWith({ autoOpenTab: 'yes', defaultView: 'kanban', defaultLayout: 3, defaultMindmapDepth: -5 }),
    })
    expect(makeAdapter(service).readViewDefaults()).toEqual({
      autoOpenTab: true,
      defaultView: 'markdown',
      defaultLayout: 'logical',
      defaultMindmapDepth: 2,
    })
  })

  it('快照形状意外（prefs 非对象 / 读取抛错）时不阻断插件', () => {
    const broken = {
      registerTab: () => () => undefined,
      subscribeState: () => () => undefined,
      getSnapshot: () => { throw new Error('boom') },
      openTab: () => undefined,
      features: ['pluginSettings'],
    } as unknown as BetterSidebarService
    expect(makeAdapter(broken).readViewDefaults()).toEqual({
      autoOpenTab: true,
      defaultView: 'markdown',
      defaultLayout: 'logical',
      defaultMindmapDepth: 2,
    })

    const notObject = makeService({ features: ['pluginSettings'], prefs: 'nope' })
    expect(makeAdapter(notObject.service).readViewDefaults().defaultView).toBe('markdown')
  })

  it('读取走公开快照（getSnapshot），不碰私有 store', () => {
    const { service } = makeService({
      features: ['pluginSettings'],
      prefs: prefsWith({ defaultView: 'table' }),
    })
    const spy = vi.spyOn(service, 'getSnapshot')
    expect(makeAdapter(service).readViewDefaults().defaultView).toBe('table')
    expect(spy).toHaveBeenCalled()
  })
})
