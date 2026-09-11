/**
 * HostDocumentIntegrator 测试：dsh-structured-document 服务（fake）与
 * 真实 ViewBridgeServer 的集成行为。
 */
import { describe, expect, it, vi } from 'vitest'
import { ViewBridgeServer } from '../src/host/bridge-server.ts'
import { ViewMirrorStore } from '../src/host/mirror-store.ts'
import { HostDocumentIntegrator, type StructuredDocumentServiceLike, type WorkspaceChangeLike } from '../src/host/document-integrator.ts'
import type { StructuredDocument } from '../src/shared/ir.ts'

function makeDoc(revision = 1): StructuredDocument {
  return {
    id: 'doc-1',
    title: '防干烧项目周会',
    profile: 'meeting',
    revision,
    root: {
      id: 'node_001',
      title: '防干烧项目周会',
      content: '',
      role: 'note',
      properties: {},
      children: [{ id: 'node_002', title: '议题 A', content: '', role: 'topic', properties: {}, children: [] }],
    },
  }
}

interface Harness {
  bridge: ViewBridgeServer
  integrator: HostDocumentIntegrator
  service: {
    selectNode: ReturnType<typeof vi.fn>
    setCurrentFile: ReturnType<typeof vi.fn>
    subscribe: ReturnType<typeof vi.fn>
    getDocumentSnapshot: ReturnType<typeof vi.fn>
  }
  /** 会话收到的宿主消息（JSON 解析后）。 */
  received: Map<string, unknown[]>
}

function makeHarness(snapshot: unknown): Harness {
  const service = {
    selectNode: vi.fn(),
    setCurrentFile: vi.fn(),
    subscribe: vi.fn((_sessionId: string, listener: (change: WorkspaceChangeLike) => void) => {
      return () => undefined
    }),
    getDocumentSnapshot: vi.fn(() => snapshot),
  } satisfies StructuredDocumentServiceLike & Record<string, ReturnType<typeof vi.fn>>
  const received = new Map<string, unknown[]>()
  const bridge = new ViewBridgeServer({ store: new ViewMirrorStore() })
  const integrator = new HostDocumentIntegrator({ service: service as unknown as StructuredDocumentServiceLike, bridge })
  bridge.attach('s1', (message) => {
    const list = received.get('s1') ?? []
    list.push(JSON.parse(message))
    received.set('s1', list)
  })
  return { bridge, integrator, service: service as never, received }
}

describe('HostDocumentIntegrator', () => {
  it('hello → 订阅工作区 + 推送当前文档快照', () => {
    const { bridge, integrator, service, received } = makeHarness({
      document: makeDoc(2),
      selectedNodeId: 'node_002',
      currentFile: '/tmp/weekly.md',
    })
    integrator.handleMessage('s1', { type: 'hello', sessionId: 's1' })
    expect(service.subscribe).toHaveBeenCalledWith('s1', expect.any(Function))
    const messages = received.get('s1') ?? []
    expect(messages.length).toBe(1)
    const pushed = messages[0] as { type: string; document?: { id: string }, selectedNodeId: string | null }
    expect(pushed.type).toBe('document')
    expect(pushed.document?.id).toBe('doc-1')
    expect(pushed.selectedNodeId).toBe('node_002')
    bridge.dispose()
    integrator.dispose()
  })

  it('工作区变化 → 推送 document / selection / unbound', () => {
    const { bridge, integrator, received } = makeHarness(null)
    let listener: ((change: WorkspaceChangeLike) => void) | undefined
    let snapshot: unknown = null
    const service = integrator['service'] as {
      subscribe: (id: string, fn: (c: WorkspaceChangeLike) => void) => () => void
      getDocumentSnapshot: (s: string) => unknown
    }
    service.subscribe = (_id: string, fn: (c: WorkspaceChangeLike) => void) => { listener = fn; return () => undefined }
    service.getDocumentSnapshot = () => snapshot
    integrator.handleMessage('s1', { type: 'hello', sessionId: 's1' })
    received.get('s1')?.splice(0) // 清掉 hello 时的初始推送

    // document 变化
    snapshot = { document: makeDoc(5), selectedNodeId: 'node_003', currentFile: '/tmp/weekly.md' }
    listener?.({ kind: 'document', revision: 5, selectedNodeId: 'node_003' })
    let messages = received.get('s1') ?? []
    expect((messages[messages.length - 1] as { type: string }).type).toBe('document')

    // selection 变化
    snapshot = { document: makeDoc(5), selectedNodeId: 'node_004', currentFile: '/tmp/weekly.md' }
    listener?.({ kind: 'selection', selectedNodeId: 'node_004' })
    messages = received.get('s1') ?? []
    const last = messages[messages.length - 1] as { type: string; selectedNodeId: string | null }
    expect(last.type).toBe('selection')
    expect(last.selectedNodeId).toBe('node_004')

    // unbound（文档变空）
    snapshot = null
    listener?.({ kind: 'unbound' })
    messages = received.get('s1') ?? []
    const unbound = messages[messages.length - 1] as { type: string; document: null }
    expect(unbound.type).toBe('document')
    expect(unbound.document).toBeNull()
    bridge.dispose()
    integrator.dispose()
  })

  it('去重：同 revision/选中/当前文件不重复推送；任一变化则推送', () => {
    const { bridge, integrator, received } = makeHarness(null)
    let listener: ((change: WorkspaceChangeLike) => void) | undefined
    let snapshot: unknown = null
    const service = integrator['service'] as {
      subscribe: (id: string, fn: (c: WorkspaceChangeLike) => void) => () => void
      getDocumentSnapshot: (s: string) => unknown
    }
    service.subscribe = (_id: string, fn: (c: WorkspaceChangeLike) => void) => { listener = fn; return () => undefined }
    service.getDocumentSnapshot = () => snapshot
    integrator.handleMessage('s1', { type: 'hello', sessionId: 's1' })

    snapshot = { document: makeDoc(3), selectedNodeId: 'node_002', currentFile: '/tmp/a.md' }
    listener?.({ kind: 'document', revision: 3, selectedNodeId: 'node_002' })
    const countAfterFirst = received.get('s1')?.length ?? 0
    expect(countAfterFirst).toBe(1) // hello 时无快照不推；document 事件推 1 条

    // 同 revision 重复事件：不重复推送。
    listener?.({ kind: 'document', revision: 3, selectedNodeId: 'node_002' })
    listener?.({ kind: 'bound', filePath: '/tmp/a.md', revision: 3, selectedNodeId: 'node_002' })
    expect(received.get('s1')?.length).toBe(countAfterFirst)

    // 仅选中变化（revision 相同）→ 推。
    snapshot = { document: makeDoc(3), selectedNodeId: 'node_005', currentFile: '/tmp/a.md' }
    listener?.({ kind: 'document', revision: 3, selectedNodeId: 'node_005' })
    expect(received.get('s1')?.length).toBe(countAfterFirst + 1)

    // 仅当前文件变化（revision 相同）→ 推（重绑同文件）。
    snapshot = { document: makeDoc(3), selectedNodeId: 'node_005', currentFile: '/tmp/a2.md' }
    listener?.({ kind: 'bound', filePath: '/tmp/a2.md', revision: 3, selectedNodeId: 'node_005' })
    expect(received.get('s1')?.length).toBe(countAfterFirst + 2)

    // revision 变化 → 推。
    snapshot = { document: makeDoc(4), selectedNodeId: 'node_005', currentFile: '/tmp/a2.md' }
    listener?.({ kind: 'document', revision: 4, selectedNodeId: 'node_005' })
    expect(received.get('s1')?.length).toBe(countAfterFirst + 3)
    bridge.dispose()
    integrator.dispose()
  })

  it('客户端 select-node / current-file → 服务透传', () => {
    const { bridge, integrator, service } = makeHarness(null)
    integrator.handleMessage('s1', { type: 'select-node', nodeId: 'node_002' })
    expect(service.selectNode).toHaveBeenCalledWith('s1', 'node_002')
    integrator.handleMessage('s1', { type: 'current-file', path: '/tmp/weekly.md' })
    expect(service.setCurrentFile).toHaveBeenCalledWith('s1', '/tmp/weekly.md')
    integrator.handleMessage('s1', { type: 'current-file', path: null })
    expect(service.setCurrentFile).toHaveBeenCalledWith('s1', null)
    bridge.dispose()
    integrator.dispose()
  })

  it('dispose 后不再推送', () => {
    const { bridge, integrator, received } = makeHarness({ document: makeDoc(1), selectedNodeId: null, currentFile: null })
    integrator.dispose()
    integrator.handleMessage('s1', { type: 'hello', sessionId: 's1' })
    expect(received.get('s1')?.length ?? 0).toBe(0)
    bridge.dispose()
  })

  it('经 bridge.handleClientMessage 的真实链路（hello 触发 onMessage）', () => {
    const service = {
      selectNode: vi.fn(),
      setCurrentFile: vi.fn(),
      subscribe: vi.fn(() => () => undefined),
      getDocumentSnapshot: vi.fn(() => ({ document: makeDoc(1), selectedNodeId: null, currentFile: null })),
    }
    const received: unknown[] = []
    const bridge = new ViewBridgeServer({
      store: new ViewMirrorStore(),
      onMessage: (sessionId, message) => integrator.handleMessage(sessionId, message),
    })
    const integrator = new HostDocumentIntegrator({ service: service as unknown as StructuredDocumentServiceLike, bridge })
    bridge.attach('s1', (message) => received.push(JSON.parse(message)))

    bridge.handleClientMessage('s1', { type: 'hello' })
    expect(service.subscribe).toHaveBeenCalled()
    expect(received.some((m) => (m as { type: string }).type === 'document')).toBe(true)

    bridge.handleClientMessage('s1', { type: 'select-node', nodeId: 'n1' })
    expect(service.selectNode).toHaveBeenCalledWith('s1', 'n1')
    bridge.dispose()
    integrator.dispose()
  })
})
