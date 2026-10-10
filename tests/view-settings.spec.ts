/**
 * 侧边卡片设置解析与投影（SPEC F011）。
 *
 * 锚点：先算好期望值再断言——默认值取自内置默认状态（`createDefaultViewState`），
 * 不用被测函数自己产出的值反推期望（避免自证）。
 */
import { describe, expect, it } from 'vitest'
import {
  BUILTIN_VIEW_DEFAULTS,
  LAYOUT_OPTIONS,
  VIEW_OPTIONS,
  initialViewState,
  mindmapDepthToInternal,
  parseViewDefaults,
} from '../src/shared/view-settings.ts'
import { MIND_MAP_LAYOUTS, VIEW_NAMES, createDefaultViewState } from '../src/shared/view-state.ts'

describe('parseViewDefaults 配置解析', () => {
  it('缺失（undefined / 非对象 / 空对象）时四项均为内置默认', () => {
    for (const raw of [undefined, null, {}, 'mindmap', 42, []]) {
      expect(parseViewDefaults(raw)).toEqual({
        autoOpenTab: true,
        defaultView: 'markdown',
        defaultLayout: 'logical',
        defaultMindmapDepth: 2,
      })
    }
  })

  it('合法取值原样采用（含 defaultMindmapDepth: 0 = 不限）', () => {
    expect(parseViewDefaults({
      autoOpenTab: false,
      defaultView: 'table',
      defaultLayout: 'down',
      defaultMindmapDepth: 0,
    })).toEqual({
      autoOpenTab: false,
      defaultView: 'table',
      defaultLayout: 'down',
      defaultMindmapDepth: 0,
    })
  })

  it('逐字段独立回退：类型不符 / 枚举外取值 / 越界数字都不抛错', () => {
    const parsed = parseViewDefaults({
      autoOpenTab: 'true', // 字符串不是布尔
      defaultView: 'kanban', // 枚举外
      defaultLayout: 'right', // 枚举外
      defaultMindmapDepth: -1, // 负数
    })
    expect(parsed).toEqual({ autoOpenTab: true, defaultView: 'markdown', defaultLayout: 'logical', defaultMindmapDepth: 2 })

    // 非数字 / 非整数 / NaN / Infinity 一律回退默认，不做隐式截断
    for (const depth of ['3', 2.5, Number.NaN, Number.POSITIVE_INFINITY, null, true]) {
      expect(parseViewDefaults({ defaultMindmapDepth: depth }).defaultMindmapDepth).toBe(2)
    }
    // 一处非法不影响同对象里的合法字段
    expect(parseViewDefaults({ autoOpenTab: false, defaultView: 'kanban' })).toMatchObject({
      autoOpenTab: false,
      defaultView: 'markdown',
    })
  })

  it('同步的合法取值集合与枚举同源', () => {
    expect(VIEW_OPTIONS.map(option => option.value)).toEqual([...VIEW_NAMES])
    expect(LAYOUT_OPTIONS.map(option => option.value)).toEqual([...MIND_MAP_LAYOUTS])
  })

  it('内置默认值由内置默认状态推导（单一来源）', () => {
    const state = createDefaultViewState()
    expect(BUILTIN_VIEW_DEFAULTS).toEqual({
      autoOpenTab: true,
      defaultView: state.currentView, // markdown
      defaultLayout: state.layout, // logical
      defaultMindmapDepth: state.viewDepths.mindmap, // 2
    })
  })

  it('mindmapDepthToInternal：0 映射为内部 null，其余原样', () => {
    expect(mindmapDepthToInternal(0)).toBeNull()
    expect(mindmapDepthToInternal(1)).toBe(1)
    expect(mindmapDepthToInternal(3)).toBe(3)
  })
})

describe('initialViewState 配置投影', () => {
  it('内置默认时与 createDefaultViewState 等价（回归：与本变更前一致）', () => {
    const projected = initialViewState()
    const base = createDefaultViewState()
    expect(projected).toEqual(base)
    expect(projected.currentView).toBe('markdown')
    expect(projected.layout).toBe('logical')
    expect(projected.viewDepths).toEqual({ markdown: null, mindmap: 2, table: null })
    // 每次都是新对象，不共享引用（初始状态可安全突变）
    expect(projected).not.toBe(base)
    expect(projected.viewDepths).not.toBe(base.viewDepths)
    expect(projected.viewDepths).not.toBe(initialViewState().viewDepths)
  })

  it('defaultView / defaultLayout 生效，其余字段仍是内置默认', () => {
    const state = initialViewState({ autoOpenTab: false, defaultView: 'table', defaultLayout: 'down', defaultMindmapDepth: 3 })
    expect(state.currentView).toBe('table')
    expect(state.layout).toBe('down')
    expect(state.readerMode).toBe('section')
    expect(state.zoom).toBe(1)
    expect(state.filter).toBeNull()
    expect(state.selectedNodeId).toBeNull()
    // 非当前视图的层级保持内置默认
    expect(state.viewDepths).toEqual({ markdown: null, mindmap: 3, table: null })
  })

  it('defaultMindmapDepth = 0 → 内部 null（不限层级）', () => {
    const state = initialViewState({ autoOpenTab: true, defaultView: 'markdown', defaultLayout: 'logical', defaultMindmapDepth: 0 })
    expect(state.viewDepths.mindmap).toBeNull()
  })

  it('depth 与 viewDepths[currentView] 一致（setView 既有不变式）', () => {
    // defaultView = mindmap 时，工具栏与状态镜像读的 state.depth 必须是配置层级
    const asMindmap = initialViewState({ autoOpenTab: true, defaultView: 'mindmap', defaultLayout: 'mind', defaultMindmapDepth: 3 })
    expect(asMindmap.depth).toBe(3)
    expect(asMindmap.viewDepths.mindmap).toBe(3)

    const unlimited = initialViewState({ autoOpenTab: true, defaultView: 'mindmap', defaultLayout: 'mind', defaultMindmapDepth: 0 })
    expect(unlimited.depth).toBeNull()

    const asMarkdown = initialViewState({ autoOpenTab: true, defaultView: 'markdown', defaultLayout: 'logical', defaultMindmapDepth: 3 })
    expect(asMarkdown.depth).toBeNull() // markdown 的层级仍是 null
  })
})
