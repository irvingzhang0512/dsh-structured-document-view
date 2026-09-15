import { describe, expect, it, vi } from 'vitest'
import { ViewRuntime, type MindMapViewportController } from '../src/client/runtime.ts'

function makeRuntime(): ViewRuntime {
  return new ViewRuntime('s1', () => undefined)
}

describe('ViewRuntime 视口命令', () => {
  it('打开章节并在同级章节间导航', () => {
    const runtime = makeRuntime()
    const opened = runtime.applyCommand({ name: 'open_node', node: 'node_002' })
    expect(opened.ok).toBe(true)
    expect(runtime.store.getState()).toMatchObject({ currentView: 'markdown', readerMode: 'section', selectedNodeId: 'node_002' })
    const next = runtime.applyCommand({ name: 'navigate_section', direction: 'next' })
    expect(next.value?.nodeId).toBe('node_006')
    expect(runtime.bridge.getSelectedNodeId()).toBe('node_006')
    const previous = runtime.applyCommand({ name: 'navigate_section', direction: 'previous' })
    expect(previous.value?.nodeId).toBe('node_002')
    runtime.dispose()
  })

  it('切换全文和大纲折叠不改变文档或导图折叠', () => {
    const runtime = makeRuntime()
    runtime.applyCommand({ name: 'set_reader_mode', mode: 'document' })
    runtime.handleUserToggleOutlineNode('node_002')
    const state = runtime.store.getState()
    expect(state.readerMode).toBe('document')
    expect(state.outlineCollapsedNodeIds).toEqual(['node_002'])
    expect(state.collapsedNodeIds).toEqual([])
    expect(runtime.buildWire().viewDepths).toEqual({ markdown: null, mindmap: 2, table: null })
    runtime.dispose()
  })

  it('画布未挂载时返回 VIEW_NOT_READY', async () => {
    const runtime = makeRuntime()
    runtime.applyCommand({ name: 'set_view', view: 'mindmap' })
    const result = await runtime.applyCommandAsync({ name: 'fit_view' })
    expect(result.code).toBe('VIEW_NOT_READY')
    runtime.dispose()
  })

  it('重复定位同一节点仍逐次交给画布执行', async () => {
    const runtime = makeRuntime()
    runtime.applyCommand({ name: 'set_view', view: 'mindmap' })
    const focusNode = vi.fn(async (nodeId: string) => ({ ok: true, code: 'OK', message: 'visible', value: { nodeId } }))
    const controller: MindMapViewportController = {
      focusNode,
      setZoom: vi.fn(async () => ({ ok: true, code: 'OK', message: 'zoom', value: { zoom: 1 } })),
      fitView: vi.fn(async () => ({ ok: true, code: 'OK', message: 'fit', value: { zoom: 0.5 } })),
      resetViewport: vi.fn(async () => ({ ok: true, code: 'OK', message: 'reset', value: { zoom: 1 } })),
    }
    runtime.registerViewportController(controller)
    await runtime.applyCommandAsync({ name: 'focus_node', node: 'node_002', mode: 'visible' })
    await runtime.applyCommandAsync({ name: 'focus_node', node: 'node_002', mode: 'visible' })
    expect(focusNode).toHaveBeenCalledTimes(2)
    expect(focusNode).toHaveBeenLastCalledWith('node_002', 'visible')
    runtime.dispose()
  })

  it('隐藏节点返回当前层级限制原因', async () => {
    const runtime = makeRuntime()
    runtime.applyCommand({ name: 'set_view', view: 'mindmap' })
    runtime.applyCommand({ name: 'set_depth', depth: 1 })
    runtime.registerViewportController({
      focusNode: async () => ({ ok: false, code: 'NODE_HIDDEN', message: 'hidden' }),
      setZoom: async () => ({ ok: true, code: 'OK', message: 'zoom' }),
      fitView: async () => ({ ok: true, code: 'OK', message: 'fit' }),
      resetViewport: async () => ({ ok: true, code: 'OK', message: 'reset' }),
    })
    const result = await runtime.applyCommandAsync({ name: 'focus_node', node: 'node_003', mode: 'visible' })
    expect(result.code).toBe('NODE_HIDDEN')
    expect(result.message).toContain('1 层显示限制')
    runtime.dispose()
  })
})
