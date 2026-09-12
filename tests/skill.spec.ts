/**
 * Skill 契约测试：打包的 SKILL.md 与 View Tools "真正对应"。
 *
 * 1. frontmatter 规范（name 必须 kebab-case、description 非空）；
 * 2. SKILL.md 覆盖全部 9 个工具名（不漏、不拼错）；
 * 3. 端到端："Skill 里的中文意图 → 工具调用 → 桥派发 → 客户端运行时执行
 *    → 镜像更新"全链路真实跑通（工具是真实注册的，客户端是真实 ViewRuntime）。
 */
import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseSkillFrontmatter, loadBundledSkill } from '../src/host/skill-registration.ts'
import { registerViewTools, VIEW_TOOL_NAMES } from '../src/tools/view-tools.ts'
import { ViewBridgeServer } from '../src/host/bridge-server.ts'
import { ViewMirrorStore } from '../src/host/mirror-store.ts'
import { ViewRuntime } from '../src/client/runtime.ts'
import { parseHostMessage, encodeAck, encodeClientState, encodeHello } from '../src/shared/wire.ts'
import type { ViewCommand, ViewStateWire } from '../src/shared/types.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SKILL_PATH = join(ROOT, 'skills', 'structured-document-view', 'SKILL.md')

describe('SKILL.md 规范', () => {
  it('frontmatter：name 为 kebab-case，description 非空', async () => {
    const raw = await readFile(SKILL_PATH, 'utf8')
    const parsed = parseSkillFrontmatter(raw)
    expect(parsed).toBeDefined()
    expect(parsed!.name).toBe('structured-document-view')
    expect(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parsed!.name)).toBe(true)
    expect(parsed!.description.length).toBeGreaterThan(10)
    expect(parsed!.whenToUse).toBeDefined()
    // 正文包含工具表与中文示例
    expect(parsed!.content).toContain('set_view')
    expect(parsed!.content).toContain('切成思维导图')
    expect(parsed!.content).toContain('只显示两层')
    expect(parsed!.content).toContain('恢复默认视图')
  })

  it('loadBundledSkill 产出可注册对象', async () => {
    const registration = await loadBundledSkill(SKILL_PATH)
    expect(registration).toBeDefined()
    expect(registration!.source).toBe('bundled')
    expect(registration!.provider).toBe('dsh-structured-document-view')
  })

  it('SKILL.md 覆盖全部工具名（工具名 ↔ 文档契约）', async () => {
    const raw = await readFile(SKILL_PATH, 'utf8')
    for (const name of VIEW_TOOL_NAMES) {
      expect(raw).toContain(name)
    }
    // 工具表里出现的反引号工具名必须是合法工具（防拼写漂移）
    const mentioned = new Set([...raw.matchAll(/`(set_view|get_view_state|expand_node|collapse_node|focus_node|set_depth|set_layout|set_filter|reset_view|open_view_tab)`/g)].map(m => m[1]!))
    for (const name of mentioned) {
      expect(VIEW_TOOL_NAMES).toContain(name)
    }
  })
})

/**
 * 端到端集成（"真正调用 Tool"）：
 * 真实工具 + 真实 ViewBridgeServer + 真实 ViewRuntime 客户端桩。
 */
function buildE2E(): {
  run: (name: string, args: Record<string, unknown>) => Promise<unknown>
  mirror: ViewMirrorStore
  runtime: ViewRuntime
  teardown: () => void
} {
  const mirror = new ViewMirrorStore()
  const bridge = new ViewBridgeServer({ store: mirror })
  const runtime = new ViewRuntime('s1', (wire) => {
    bridge.handleClientMessage('s1', JSON.parse(encodeClientState(wire)))
  })

  // 客户端桩：监听桥命令 → 运行时执行 → ack。
  const senders: Array<(message: string) => void> = []
  const detach = bridge.attach('s1', (message) => {
    for (const sender of [...senders]) sender(message)
  })
  const onCommand = (message: string): void => {
    const parsed = parseHostMessage(message)
    const result = runtime.applyCommand(parsed.command)
    bridge.handleClientMessage('s1', JSON.parse(encodeAck({ id: parsed.id, ok: result.ok, code: result.code, message: result.message, ...(result.value !== undefined ? { value: result.value } : {}) })))
  }
  senders.push(onCommand)
  bridge.handleClientMessage('s1', JSON.parse(encodeHello('s1')))

  const registered: Array<{ name?: string; execute?: unknown }> = []
  registerViewTools({ tools: { register: (tool: { name?: string; execute?: unknown }) => { registered.push(tool); return () => undefined } } } as never, { mirror, bridge } as never)

  const tools: Record<string, { execute: (a: Record<string, unknown>, e: never) => Promise<unknown> }> = {}
  for (const tool of registered) {
    if (tool.name !== undefined && typeof tool.execute === 'function') {
      tools[tool.name] = { execute: tool.execute as never }
    }
  }
  const exec = { agent: { session: { id: 's1' } }, signal: { throwIfAborted: () => undefined } } as never
  const run = (name: string, args: Record<string, unknown>): Promise<unknown> => tools[name]!.execute(args, exec)

  return {
    run,
    mirror,
    runtime,
    teardown: () => {
      detach()
      runtime.dispose()
      bridge.dispose()
      mirror.clear()
    },
  }
}

describe('Skill → Tool 端到端（中文意图链路）', () => {
  it('切成思维导图 → set_view(mindmap) → 镜像变为 mindmap', async () => {
    const env = buildE2E()
    try {
      const result = (await env.run('set_view', { view: 'mindmap' })) as Record<string, unknown>
      expect(result.ok).toBe(true)
      const view = (await env.run('get_view_state', {})) as { viewState: ViewStateWire | null }
      expect(view.viewState?.currentView).toBe('mindmap')
    } finally {
      env.teardown()
    }
  })

  it('只显示两层 → set_depth(2) → 层级生效', async () => {
    const env = buildE2E()
    try {
      const result = (await env.run('set_depth', { depth: 2 })) as Record<string, unknown>
      expect(result.ok).toBe(true)
      const view = (await env.run('get_view_state', {})) as { viewState: ViewStateWire | null }
      expect(view.viewState?.depth).toBe(2)
    } finally {
      env.teardown()
    }
  })

  it('展开第二个议题 → 先 get_view_state 拿 Node ID → expand_node', async () => {
    const env = buildE2E()
    try {
      const view = (await env.run('get_view_state', {})) as { viewState: ViewStateWire | null }
      const outline = view.viewState?.outline ?? []
      // thinking 文档根下第 2 个话题（算法方案）
      const topics = outline[0]?.children ?? []
      expect(topics.length).toBeGreaterThanOrEqual(2)
      const target = topics[1]!
      expect(target.title).toBe('算法方案')
      const result = (await env.run('expand_node', { node: target.id })) as Record<string, unknown>
      expect(result.ok).toBe(true)
      expect(result.nodeId).toBe(target.id)
      // 镜像反映显式展开
      const after = (await env.run('get_view_state', {})) as { viewState: ViewStateWire | null }
      expect(after.viewState?.expandedNodeIds).toContain(target.id)
    } finally {
      env.teardown()
    }
  })

  it('聚焦当前节点 → 先模拟用户点击选中 → focus_node() 缺省 current', async () => {
    const env = buildE2E()
    try {
      // 模拟用户在视图里点击节点（客户端交互路径）
      env.runtime.handleUserSelectNode('node_003')
      const result = (await env.run('focus_node', {})) as Record<string, unknown>
      expect(result.ok).toBe(true)
      expect(result.nodeId).toBe('node_003')
      const view = (await env.run('get_view_state', {})) as { viewState: ViewStateWire | null }
      expect(view.viewState?.focusedNodeId).toBe('node_003')
      expect(view.viewState?.selectedNodeId).toBe('node_003')
    } finally {
      env.teardown()
    }
  })

  it('改成从左到右布局 → set_layout(logical)', async () => {
    const env = buildE2E()
    try {
      const result = (await env.run('set_layout', { layout: 'logical' })) as Record<string, unknown>
      expect(result.ok).toBe(true)
      const view = (await env.run('get_view_state', {})) as { viewState: ViewStateWire | null }
      expect(view.viewState?.layout).toBe('logical')
    } finally {
      env.teardown()
    }
  })

  it('恢复默认视图 → reset_view（保留当前选中）', async () => {
    const env = buildE2E()
    try {
      env.runtime.handleUserSelectNode('node_003')
      await env.run('set_view', { view: 'table' })
      await env.run('set_depth', { depth: 2 })
      const result = (await env.run('reset_view', {})) as Record<string, unknown>
      expect(result.ok).toBe(true)
      const view = (await env.run('get_view_state', {})) as { viewState: ViewStateWire | null }
      expect(view.viewState?.currentView).toBe('markdown')
      expect(view.viewState?.depth).toBe(0)
      expect(view.viewState?.selectedNodeId).toBe('node_003')
    } finally {
      env.teardown()
    }
  })

  it('打开结构化文档 → open_view_tab → 客户端回执 OK', async () => {
    const env = buildE2E()
    try {
      const result = (await env.run('open_view_tab', {})) as Record<string, unknown>
      expect(result.ok).toBe(true)
      expect(result.delivered).toBe(true)
    } finally {
      env.teardown()
    }
  })

  it('用表格看一下 → set_view(table)；只看问题 → set_filter(role=problem)', async () => {
    const env = buildE2E()
    try {
      const table = (await env.run('set_view', { view: 'table' })) as Record<string, unknown>
      expect(table.ok).toBe(true)
      const filtered = (await env.run('set_filter', { filter: { role: 'problem' } })) as Record<string, unknown>
      expect(filtered.ok).toBe(true)
      const view = (await env.run('get_view_state', {})) as { viewState: ViewStateWire | null }
      expect(view.viewState?.currentView).toBe('table')
      expect(view.viewState?.filter).toEqual({ role: 'problem' })
    } finally {
      env.teardown()
    }
  })
})
