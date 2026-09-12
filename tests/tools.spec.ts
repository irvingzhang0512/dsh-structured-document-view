/**
 * View Tools 测试：注册齐全、结果信封、命令派发映射、镜像读取、错误码。
 *
 * 采用注入的 fake bridge / fake ctx（不依赖真实 WebSocket 或宿主 Context），
 * 但镜像用真实 ViewMirrorStore，工具执行用真实 registerViewTools。
 */
import { describe, expect, it, vi } from 'vitest'
import { registerViewTools, VIEW_TOOL_NAMES } from '../src/tools/view-tools.ts'
import { ViewMirrorStore } from '../src/host/mirror-store.ts'
import type { DispatchOutcome, ViewCommand, ViewStateWire } from '../src/shared/types.ts'

/** 采集注册的工具。 */
function makeCtx(): { tools: { register: ReturnType<typeof vi.fn> }; registered: Array<{ name?: string; execute?: unknown }> } {
  const registered: Array<{ name?: string; execute?: unknown }> = []
  return {
    tools: { register: vi.fn((tool: { name?: string; execute?: unknown }) => { registered.push(tool); return () => undefined }) },
    registered,
  }
}

/** 会话执行上下文 fake。 */
function makeExec(sessionId = 's1'): never {
  return {
    agent: { session: { id: sessionId } },
    signal: { throwIfAborted: () => undefined },
  } as never
}

/** 可控 bridge fake。 */
function makeBridge(overrides: Partial<{
  isAttached: (sessionId: string) => boolean
  dispatch: (sessionId: string, command: ViewCommand, waitMs?: number) => Promise<DispatchOutcome>
}> = {}): {
  isAttached: ReturnType<typeof vi.fn>
  dispatch: ReturnType<typeof vi.fn>
  deps: { mirror: ViewMirrorStore; bridge: unknown }
} {
  const isAttached = vi.fn((_sessionId: string) => true)
  const dispatch = vi.fn(async (_sessionId: string, _command: ViewCommand, _waitMs?: number): Promise<DispatchOutcome> => {
    return { delivered: true, queued: false, ack: { id: 'x', ok: true, code: 'OK', message: 'ok', value: {} } }
  })
  const mirror = new ViewMirrorStore()
  const bridge = { isAttached, dispatch, ...overrides }
  return { isAttached, dispatch, deps: { mirror, bridge } }
}

function runTool(tool: { execute?: unknown }, args: Record<string, unknown>): Promise<unknown> {
  const execute = tool.execute as (a: Record<string, unknown>, e: never) => Promise<unknown>
  return execute(args, makeExec())
}

function makeWire(): ViewStateWire {
  return {
    sessionId: 's1',
    currentView: 'markdown',
    expandedNodeIds: [],
    collapsedNodeIds: [],
    depth: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    layout: 'mind',
    filter: null,
    outline: [{ id: 'node_001', title: '根', role: 'note', children: [] }],
    updatedAt: 1,
  }
}

describe('registerViewTools', () => {
  it('注册全部视图工具，且无多余', () => {
    const ctx = makeCtx()
    const { deps } = makeBridge()
    registerViewTools(ctx as never, deps as never)
    expect(ctx.tools.register).toHaveBeenCalledTimes(VIEW_TOOL_NAMES.length)
    const names = ctx.registered.map(t => t.name).sort()
    expect(names).toEqual([...VIEW_TOOL_NAMES].sort())
  })

  it('get_view_state：无镜像 → VIEW_UNAVAILABLE', async () => {
    const ctx = makeCtx()
    const { deps } = makeBridge()
    const disposer = registerViewTools(ctx as never, deps as never)
    const tool = ctx.registered.find(t => t.name === 'get_view_state')!
    const result = (await runTool(tool, {})) as Record<string, unknown>
    expect(result.ok).toBe(false)
    expect(result.code).toBe('VIEW_UNAVAILABLE')
    expect(result.connected).toBe(false)
    expect(result.viewState).toBeNull()
    disposer()
  })

  it('get_view_state：有镜像 → OK 且输出视图状态', async () => {
    const ctx = makeCtx()
    const { deps, dispatch } = makeBridge()
    ;(deps.mirror as ViewMirrorStore).apply(makeWire(), 1)
    registerViewTools(ctx as never, deps as never)
    const tool = ctx.registered.find(t => t.name === 'get_view_state')!
    const result = (await runTool(tool, {})) as Record<string, unknown>
    expect(result.ok).toBe(true)
    expect(result.connected).toBe(true)
    const view = result.viewState as Record<string, unknown>
    expect(view.currentView).toBe('markdown')
    expect(view.depth).toBe(0) // null → 0
    expect(view.outline).toHaveLength(1)
    // 已连接时会派发 sync_state 刷新
    expect(dispatch).toHaveBeenCalledWith('s1', { name: 'sync_state' }, undefined)
  })

  it('set_view：ack 成功 → 结构信封', async () => {
    const ctx = makeCtx()
    const { deps, dispatch } = makeBridge()
    registerViewTools(ctx as never, deps as never)
    const tool = ctx.registered.find(t => t.name === 'set_view')!
    const result = (await runTool(tool, { view: 'mindmap' })) as Record<string, unknown>
    expect(result.ok).toBe(true)
    expect(result.code).toBe('OK')
    expect(result.delivered).toBe(true)
    expect(result.queued).toBe(false)
    expect(result.currentView).toBe('mindmap')
    expect(dispatch).toHaveBeenCalledWith('s1', { name: 'set_view', view: 'mindmap' }, undefined)
  })

  it('set_view：非法视图被 schema 拒绝（ToolArgsError）', async () => {
    const ctx = makeCtx()
    const { deps, dispatch } = makeBridge()
    registerViewTools(ctx as never, deps as never)
    const tool = ctx.registered.find(t => t.name === 'set_view')!
    await expect(runTool(tool, { view: 'pdf' })).rejects.toThrow()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('open_view_tab：派发 open_tab 命令 → ack 成功', async () => {
    const ctx = makeCtx()
    const { deps, dispatch } = makeBridge()
    registerViewTools(ctx as never, deps as never)
    const tool = ctx.registered.find(t => t.name === 'open_view_tab')!
    const result = (await runTool(tool, {})) as Record<string, unknown>
    expect(result.ok).toBe(true)
    expect(result.code).toBe('OK')
    expect(result.delivered).toBe(true)
    expect(result.queued).toBe(false)
    expect(dispatch).toHaveBeenCalledWith('s1', { name: 'open_tab' }, undefined)
  })

  it('open_view_tab：未连接 → QUEUED', async () => {
    const ctx = makeCtx()
    const { deps } = makeBridge({
      dispatch: async () => ({ delivered: false, queued: true, ack: null }),
    })
    registerViewTools(ctx as never, deps as never)
    const tool = ctx.registered.find(t => t.name === 'open_view_tab')!
    const result = (await runTool(tool, {})) as Record<string, unknown>
    expect(result.ok).toBe(true)
    expect(result.code).toBe('QUEUED')
    expect(result.queued).toBe(true)
  })

  it('expand_node：ack 携带 nodeId/nodeTitle', async () => {
    const ctx = makeCtx()
    const { deps } = makeBridge({
      dispatch: async () => ({
        delivered: true,
        queued: false,
        ack: { id: 'x', ok: true, code: 'OK', message: '已展开', value: { nodeId: 'node_003', nodeTitle: '热红外验证', selectedNodeTitle: '热红外验证' } },
      }),
    })
    registerViewTools(ctx as never, deps as never)
    const tool = ctx.registered.find(t => t.name === 'expand_node')!
    const result = (await runTool(tool, { node: 'node_003' })) as Record<string, unknown>
    expect(result.ok).toBe(true)
    expect(result.nodeId).toBe('node_003')
    expect(result.nodeTitle).toBe('热红外验证')
    expect(result.selectedNodeTitle).toBe('热红外验证')
  })

  it('expand_node：未连接 → QUEUED', async () => {
    const ctx = makeCtx()
    const { deps } = makeBridge({
      dispatch: async () => ({ delivered: false, queued: true, ack: null }),
    })
    registerViewTools(ctx as never, deps as never)
    const tool = ctx.registered.find(t => t.name === 'expand_node')!
    const result = (await runTool(tool, { node: 'node_003' })) as Record<string, unknown>
    expect(result.ok).toBe(true)
    expect(result.code).toBe('QUEUED')
    expect(result.queued).toBe(true)
    expect(result.delivered).toBe(false)
  })

  it('set_depth / set_layout：校验与映射', async () => {
    const ctx = makeCtx()
    const { deps, dispatch } = makeBridge()
    registerViewTools(ctx as never, deps as never)

    const depthTool = ctx.registered.find(t => t.name === 'set_depth')!
    const depthResult = (await runTool(depthTool, { depth: 2 })) as Record<string, unknown>
    expect(depthResult.ok).toBe(true)
    expect(depthResult.depth).toBe(2)
    expect(dispatch).toHaveBeenLastCalledWith('s1', { name: 'set_depth', depth: 2 }, undefined)

    // depth=0 → null（不限）
    const zeroResult = (await runTool(depthTool, { depth: 0 })) as Record<string, unknown>
    expect(zeroResult.ok).toBe(true)
    expect(dispatch).toHaveBeenLastCalledWith('s1', { name: 'set_depth', depth: null }, undefined)

    // 超范围（schema 不约束 0-20，走到工具内校验）→ INVALID_DEPTH
    for (const bad of [-1, 21]) {
      const r = (await runTool(depthTool, { depth: bad })) as Record<string, unknown>
      expect(r.code).toBe('INVALID_DEPTH')
    }
    // 非整数被 schema 拒绝
    await expect(runTool(depthTool, { depth: 1.5 })).rejects.toThrow()

    const layoutTool = ctx.registered.find(t => t.name === 'set_layout')!
    const layoutResult = (await runTool(layoutTool, { layout: 'logical' })) as Record<string, unknown>
    expect(layoutResult.ok).toBe(true)
    expect(dispatch).toHaveBeenLastCalledWith('s1', { name: 'set_layout', layout: 'logical' }, undefined)
    // 非法布局被 schema 拒绝
    await expect(runTool(layoutTool, { layout: 'fish' })).rejects.toThrow()
  })

  it('视口工具与帮助工具：参数映射和共享中文指令', async () => {
    const ctx = makeCtx()
    const { deps, dispatch } = makeBridge()
    registerViewTools(ctx as never, deps as never)

    const zoomTool = ctx.registered.find(t => t.name === 'set_zoom')!
    expect(((await runTool(zoomTool, { factor: 1.25 })) as Record<string, unknown>).ok).toBe(true)
    expect(dispatch).toHaveBeenLastCalledWith('s1', { name: 'set_zoom', factor: 1.25 }, undefined)
    expect(((await runTool(zoomTool, { zoom: 1, factor: 2 })) as Record<string, unknown>).code).toBe('INVALID_ZOOM')

    const fitTool = ctx.registered.find(t => t.name === 'fit_view')!
    await runTool(fitTool, {})
    expect(dispatch).toHaveBeenLastCalledWith('s1', { name: 'fit_view' }, undefined)

    const helpTool = ctx.registered.find(t => t.name === 'get_view_help')!
    const simple = (await runTool(helpTool, {})) as Record<string, unknown>
    expect(simple.level).toBe('simple')
    expect(JSON.stringify(simple.entries)).toContain('找到当前节点')
    const combined = (await runTool(helpTool, { level: 'combined' })) as Record<string, unknown>
    expect(JSON.stringify(combined.entries)).toContain('切成右侧思维导图')
  })

  it('set_filter：设置 / 清除（省略或空对象）', async () => {
    const ctx = makeCtx()
    const { deps, dispatch } = makeBridge()
    registerViewTools(ctx as never, deps as never)
    const tool = ctx.registered.find(t => t.name === 'set_filter')!

    const okResult = (await runTool(tool, { filter: { role: 'task' } })) as Record<string, unknown>
    expect(okResult.ok).toBe(true)
    expect(okResult.filter).toEqual({ role: 'task' })
    expect(dispatch).toHaveBeenLastCalledWith('s1', { name: 'set_filter', filter: { role: 'task' } }, undefined)

    // null 参数被 schema 拒绝（清除必须用空对象 {} 或省略 filter）
    await expect(runTool(tool, { filter: null })).rejects.toThrow()

    const clearEmpty = (await runTool(tool, { filter: {} })) as Record<string, unknown>
    expect(clearEmpty.ok).toBe(true)
    expect(clearEmpty.filter).toBeNull()
    expect(dispatch).toHaveBeenLastCalledWith('s1', { name: 'set_filter', filter: null }, undefined)

    // 省略 filter 同样表示清除
    const clearOmitted = (await runTool(tool, {})) as Record<string, unknown>
    expect(clearOmitted.ok).toBe(true)
    expect(dispatch).toHaveBeenLastCalledWith('s1', { name: 'set_filter', filter: null }, undefined)

    // 非法属性形状被 schema 拒绝
    await expect(runTool(tool, { filter: { properties: 42 } })).rejects.toThrow()
  })

  it('reset_view 派发', async () => {
    const ctx = makeCtx()
    const { deps, dispatch } = makeBridge()
    registerViewTools(ctx as never, deps as never)
    const tool = ctx.registered.find(t => t.name === 'reset_view')!
    const result = (await runTool(tool, {})) as Record<string, unknown>
    expect(result.ok).toBe(true)
    expect(result.currentView).toBe('markdown')
    expect(dispatch).toHaveBeenCalledWith('s1', { name: 'reset_view' }, undefined)
  })

  it('无会话 → NO_AGENT', async () => {
    const ctx = makeCtx()
    const { deps } = makeBridge()
    registerViewTools(ctx as never, deps as never)
    const tool = ctx.registered.find(t => t.name === 'set_view')!
    const execute = tool.execute as (a: Record<string, unknown>, e: never) => Promise<unknown>
    const result = (await execute({ view: 'table' }, { agent: { session: {} }, signal: { throwIfAborted: () => undefined } } as never)) as Record<string, unknown>
    expect(result.ok).toBe(false)
    expect(result.code).toBe('NO_AGENT')
  })

  it('ack 超时 → BRIDGE_TIMEOUT', async () => {
    const ctx = makeCtx()
    const { deps } = makeBridge({
      dispatch: async () => ({ delivered: true, queued: false, ack: null }),
    })
    registerViewTools(ctx as never, deps as never)
    const tool = ctx.registered.find(t => t.name === 'set_view')!
    const result = (await runTool(tool, { view: 'mindmap' })) as Record<string, unknown>
    expect(result.ok).toBe(false)
    expect(result.code).toBe('BRIDGE_TIMEOUT')
    expect(result.delivered).toBe(true)
  })
})
