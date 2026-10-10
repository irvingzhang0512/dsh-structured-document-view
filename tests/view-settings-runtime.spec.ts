/**
 * 配置默认值作用到「新运行时」与 `reset_view`（SPEC F011 A5／A9）。
 *
 * 覆盖范围：
 * - 新运行时的初始视图状态采用配置；
 * - 改配置不改写**已存在**运行时的当前状态（A5），但影响新运行时与 reset_view；
 * - `reset_view` 命令的重置目标与回执 `value.currentView` 都随配置（A9）；
 * - `ViewStateStore.reset()` 也按此刻配置重建。
 */
import { describe, expect, it } from 'vitest'
import { ViewRuntime } from '../src/client/runtime.ts'
import { ViewStateStore } from '../src/client/view-state-store.ts'
import type { ViewDefaults } from '../src/shared/view-settings.ts'

const BASE: ViewDefaults = { autoOpenTab: true, defaultView: 'markdown', defaultLayout: 'logical', defaultMindmapDepth: 2 }

/** 可变的配置源：模拟用户中途改侧边卡片设置。 */
function makeDefaults(initial: ViewDefaults): { read: () => ViewDefaults, set: (next: ViewDefaults) => void } {
  const box = { current: initial }
  return {
    read: () => box.current,
    set: (next: ViewDefaults) => { box.current = next },
  }
}

function makeRuntime(readDefaults: () => ViewDefaults): ViewRuntime {
  return new ViewRuntime('s1', () => undefined, undefined, undefined, undefined, readDefaults)
}

describe('新运行时采用配置默认值', () => {
  it('未注入读取器时初始状态是内置默认（软依赖回退）', () => {
    const runtime = new ViewRuntime('s1', () => undefined)
    const state = runtime.store.getState()
    expect(state.currentView).toBe('markdown')
    expect(state.layout).toBe('logical')
    expect(state.viewDepths.mindmap).toBe(2)
    runtime.dispose()
  })

  it('初始视图 / 布局 / 导图层级来自配置（defaultMindmapDepth: 0 → 内部 null）', () => {
    const runtime = makeRuntime(() => ({ autoOpenTab: true, defaultView: 'mindmap', defaultLayout: 'down', defaultMindmapDepth: 0 }))
    const state = runtime.store.getState()
    expect(state.currentView).toBe('mindmap')
    expect(state.layout).toBe('down')
    expect(state.viewDepths.mindmap).toBeNull()
    expect(state.depth).toBeNull() // depth 与当前视图层级一致
    runtime.dispose()
  })

  it('A5：改配置不改写已存在运行时的当前状态，新运行时才采用新默认', () => {
    const defaults = makeDefaults(BASE)
    const existing = makeRuntime(defaults.read)
    // 用户在已存在会话里切到表格
    existing.store.update(state => ({ ...state, currentView: 'table', layout: 'mind' }))

    defaults.set({ autoOpenTab: true, defaultView: 'mindmap', defaultLayout: 'down', defaultMindmapDepth: 3 })

    // 已存在运行时状态不变（不追溯）
    expect(existing.store.getState().currentView).toBe('table')
    expect(existing.store.getState().layout).toBe('mind')
    expect(existing.store.getState().viewDepths.mindmap).toBe(2)

    // 新运行时采用新默认
    const fresh = makeRuntime(defaults.read)
    expect(fresh.store.getState().currentView).toBe('mindmap')
    expect(fresh.store.getState().layout).toBe('down')
    expect(fresh.store.getState().viewDepths.mindmap).toBe(3)
    expect(fresh.store.getState().depth).toBe(3)

    existing.dispose()
    fresh.dispose()
  })
})

describe('reset_view 采用配置默认值（A9）', () => {
  it('重置到配置的视图 / 布局 / 层级，并保留当前选中节点', () => {
    const defaults = makeDefaults({ autoOpenTab: true, defaultView: 'mindmap', defaultLayout: 'down', defaultMindmapDepth: 0 })
    const runtime = makeRuntime(defaults.read)
    // 先弄脏状态
    runtime.store.update(state => ({
      ...state,
      currentView: 'table',
      layout: 'mind',
      depth: 5,
      viewDepths: { markdown: null, mindmap: 5, table: 5 },
      zoom: 1.7,
      filter: { role: 'task' },
      selectedNodeId: 'node_009',
    }))

    const ack = runtime.applyCommand({ name: 'reset_view' })
    expect(ack.ok).toBe(true)
    expect(ack.value).toEqual({ currentView: 'mindmap' }) // 回执报告真实结果，不是写死的 markdown
    const state = runtime.store.getState()
    expect(state.currentView).toBe('mindmap')
    expect(state.layout).toBe('down')
    expect(state.viewDepths.mindmap).toBeNull() // 0 = 不限层级
    expect(state.depth).toBeNull()
    expect(state.zoom).toBe(1)
    expect(state.filter).toBeNull()
    expect(state.selectedNodeId).toBe('node_009') // F002：保留当前选中
    runtime.dispose()
  })

  it('改配置后 reset_view 采用此刻配置（与「新运行时」口径一致）', () => {
    const defaults = makeDefaults(BASE)
    const runtime = makeRuntime(defaults.read)
    expect(runtime.applyCommand({ name: 'reset_view' }).value).toEqual({ currentView: 'markdown' })

    defaults.set({ autoOpenTab: true, defaultView: 'table', defaultLayout: 'mind', defaultMindmapDepth: 4 })
    expect(runtime.applyCommand({ name: 'reset_view' }).value).toEqual({ currentView: 'table' })
    expect(runtime.store.getState().layout).toBe('mind')
    expect(runtime.store.getState().viewDepths.mindmap).toBe(4)
    // 当前视图是 table，其层级仍是内置默认 null（配置只定义导图层级）
    expect(runtime.store.getState().depth).toBeNull()
    runtime.dispose()
  })
})

describe('ViewStateStore.reset 采用此刻配置', () => {
  it('构造函数读取一次配置，reset() 重新读取', () => {
    const defaults = makeDefaults(BASE)
    const store = new ViewStateStore(defaults.read)
    expect(store.getState().currentView).toBe('markdown')

    store.update(state => ({ ...state, currentView: 'table', zoom: 2 }))
    defaults.set({ autoOpenTab: true, defaultView: 'mindmap', defaultLayout: 'down', defaultMindmapDepth: 3 })

    store.reset()
    expect(store.getState().currentView).toBe('mindmap')
    expect(store.getState().layout).toBe('down')
    expect(store.getState().viewDepths.mindmap).toBe(3)
    expect(store.getState().zoom).toBe(1)
  })

  it('未注入读取器时用内置默认', () => {
    const store = new ViewStateStore()
    store.update(state => ({ ...state, currentView: 'table' }))
    store.reset()
    expect(store.getState().currentView).toBe('markdown')
    expect(store.getState().viewDepths.mindmap).toBe(2)
  })
})
