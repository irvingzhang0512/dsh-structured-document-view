/**
 * View State 纯 reducer 测试。
 */
import { describe, expect, it } from 'vitest'
import {
  collapseNode,
  createDefaultViewState,
  expandNode,
  isCollapsed,
  isDepthLimited,
  nodeMatchesFilter,
  resetView,
  setDepth,
  setFilter,
  setFocusedNode,
  setLayout,
  setPan,
  setSelectedNode,
  setView,
  setZoom,
} from '../src/shared/view-state.ts'

describe('view-state reducers', () => {
  it('setView 切换视图且幂等', () => {
    const state = createDefaultViewState()
    expect(state.currentView).toBe('markdown')
    const next = setView(state, 'mindmap')
    expect(next.currentView).toBe('mindmap')
    expect(next).not.toBe(state)
    // 未变化返回原引用
    expect(setView(next, 'mindmap')).toBe(next)
  })

  it('setSelectedNode / setFocusedNode 语义', () => {
    const state = createDefaultViewState()
    const selected = setSelectedNode(state, 'node_002')
    expect(selected.selectedNodeId).toBe('node_002')
    // 聚焦隐含选中
    const focused = setFocusedNode(selected, 'node_003')
    expect(focused.focusedNodeId).toBe('node_003')
    expect(focused.selectedNodeId).toBe('node_003')
    // 清除聚焦不影响选中
    const cleared = setFocusedNode(focused, null)
    expect(cleared.focusedNodeId).toBeNull()
    expect(cleared.selectedNodeId).toBe('node_003')
  })

  it('expandNode / collapseNode 双向且互斥', () => {
    const state = createDefaultViewState()
    const collapsed = collapseNode(state, 'node_002')
    expect(collapsed.collapsedNodeIds).toContain('node_002')
    expect(collapsed.expandedNodeIds).not.toContain('node_002')
    // 已收起状态下再次收起 = 幂等（同一引用）
    expect(collapseNode(collapsed, 'node_002')).toBe(collapsed)
    const expanded = expandNode(collapsed, 'node_002')
    expect(expanded.collapsedNodeIds).not.toContain('node_002')
    expect(expanded.expandedNodeIds).toContain('node_002')
    // 已展开状态下再次展开 = 幂等
    expect(expandNode(expanded, 'node_002')).toBe(expanded)
  })

  it('setDepth / setLayout / setZoom / setPan / setFilter', () => {
    const state = createDefaultViewState()
    expect(setDepth(state, 2).depth).toBe(2)
    expect(setDepth(state, null).depth).toBeNull()
    expect(setLayout(state, 'logical').layout).toBe('logical')
    expect(setZoom(state, 1.5).zoom).toBe(1.5)
    expect(setZoom(state, 0)).toBe(setZoom(state, 0)) // 非法缩放被忽略
    expect(setPan(state, 10, -5).pan).toEqual({ x: 10, y: -5 })
    const filter = { role: 'task' }
    expect(setFilter(state, filter).filter).toEqual(filter)
    expect(setFilter(state, null).filter).toBeNull()
  })

  it('resetView 保留选中，重置其余', () => {
    const state: ReturnType<typeof createDefaultViewState> = {
      currentView: 'table',
      selectedNodeId: 'node_009',
      focusedNodeId: 'node_007',
      expandedNodeIds: ['node_001'],
      collapsedNodeIds: ['node_003'],
      depth: 2,
      zoom: 1.4,
      pan: { x: 5, y: 9 },
      layout: 'down',
      filter: { role: 'risk' },
    }
    const reset = resetView(state)
    expect(reset.selectedNodeId).toBe('node_009')
    expect(reset.currentView).toBe('markdown')
    expect(reset.focusedNodeId).toBeNull()
    expect(reset.expandedNodeIds).toEqual([])
    expect(reset.collapsedNodeIds).toEqual([])
    expect(reset.depth).toBeNull()
    expect(reset.zoom).toBe(1)
    expect(reset.pan).toEqual({ x: 0, y: 0 })
    expect(reset.layout).toBe('mind')
    expect(reset.filter).toBeNull()
  })
})

describe('isDepthLimited / isCollapsed', () => {
  it('depth 为 null 时不限制', () => {
    expect(isDepthLimited(10, null, false)).toBe(false)
  })

  it('层级语义：根=1，level<=depth 不限制', () => {
    expect(isDepthLimited(1, 2, false)).toBe(false)
    expect(isDepthLimited(2, 2, false)).toBe(false)
    expect(isDepthLimited(3, 2, false)).toBe(true)
    // 显式展开链突破限制
    expect(isDepthLimited(3, 2, true)).toBe(false)
  })

  it('isCollapsed 优先级：显式收起 > 层级限制（显式展开可突破）', () => {
    const base = createDefaultViewState()
    const withCollapse = collapseNode(base, 'node_003')
    expect(isCollapsed('node_003', 1, withCollapse)).toBe(true)
    const withDepth = setDepth(base, 2)
    expect(isCollapsed('node_003', 3, withDepth)).toBe(true)
    // 节点自身显式展开 → 突破层级
    const expanded = expandNode(withDepth, 'node_003')
    expect(isCollapsed('node_003', 3, expanded)).toBe(false)
    // 祖先显式展开 → 后代突破（underExplicitExpand）
    expect(isCollapsed('node_004', 4, withDepth, true)).toBe(false)
  })
})

describe('nodeMatchesFilter', () => {
  const node = { role: 'task', properties: { status: '进行中', owner: '张三' } }

  it('无筛选全部匹配', () => {
    expect(nodeMatchesFilter(node, null)).toBe(true)
  })

  it('角色匹配', () => {
    expect(nodeMatchesFilter(node, { role: 'task' })).toBe(true)
    expect(nodeMatchesFilter(node, { role: 'risk' })).toBe(false)
  })

  it('属性匹配（任一属性命中即匹配）', () => {
    expect(nodeMatchesFilter(node, { properties: { status: '进行中' } })).toBe(true)
    expect(nodeMatchesFilter(node, { properties: { owner: '李四' } })).toBe(false)
    expect(nodeMatchesFilter(node, { role: 'risk', properties: { owner: '张三' } })).toBe(true)
  })
})
