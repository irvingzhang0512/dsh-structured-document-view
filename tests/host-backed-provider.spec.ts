/**
 * HostBackedDocumentProvider + ViewRuntime 宿主模式切换测试。
 */
import { describe, expect, it, vi } from 'vitest'
import { HostBackedDocumentProvider } from '../src/client/document/host-backed-provider.ts'
import { ViewRuntime } from '../src/client/runtime.ts'
import type { StructuredDocument } from '../src/shared/ir.ts'

function makeDoc(revision = 1, childId = 'node_002'): StructuredDocument {
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
      children: [{ id: childId, title: '议题 A', content: '', role: 'topic', properties: {}, children: [] }],
    },
  }
}

describe('HostBackedDocumentProvider', () => {
  it('applyDocument 更新镜像、激活并通知', () => {
    const sendSelectNode = vi.fn()
    const provider = new HostBackedDocumentProvider({ sendSelectNode })
    const onDoc = vi.fn()
    const onSel = vi.fn()
    provider.subscribeDocumentChanged(onDoc)
    provider.subscribeSelectedNodeChanged(onSel)

    expect(provider.active).toBe(false)
    expect(provider.getDocument()).toBeNull()

    provider.applyDocument({ document: makeDoc(2), selectedNodeId: 'node_002', currentFile: '/tmp/a.md' })
    expect(provider.active).toBe(true)
    expect(provider.currentFile).toBe('/tmp/a.md')
    expect(provider.getDocument()?.revision).toBe(2)
    expect(provider.getSelectedNode()?.id).toBe('node_002')
    expect(onDoc).toHaveBeenCalledTimes(1)
    expect(onSel).not.toHaveBeenCalled()

    // 深拷贝隔离：外部修改返回值不影响镜像。
    const returned = provider.getDocument()!
    returned.revision = 999
    expect(provider.getDocument()?.revision).toBe(2)
  })

  it('applySelection 更新选中', () => {
    const provider = new HostBackedDocumentProvider({ sendSelectNode: vi.fn() })
    const onSel = vi.fn()
    provider.subscribeSelectedNodeChanged(onSel)
    provider.applyDocument({ document: makeDoc(1), selectedNodeId: null, currentFile: null })
    provider.applySelection('node_002')
    expect(provider.getSelectedNode()?.id).toBe('node_002')
    expect(onSel).toHaveBeenCalledTimes(1)
    provider.applySelection(null)
    expect(provider.getSelectedNode()).toBeNull()
  })

  it('selectNode 本地更新 + 发桥消息 + 通知', () => {
    const sendSelectNode = vi.fn()
    const provider = new HostBackedDocumentProvider({ sendSelectNode })
    const onSel = vi.fn()
    provider.subscribeSelectedNodeChanged(onSel)
    provider.applyDocument({ document: makeDoc(1), selectedNodeId: null, currentFile: null })
    provider.selectNode('node_002')
    expect(sendSelectNode).toHaveBeenCalledWith('node_002')
    expect(provider.getSelectedNode()?.id).toBe('node_002')
    expect(onSel).toHaveBeenCalledTimes(1)
  })

  it('document: null 表示无文档', () => {
    const provider = new HostBackedDocumentProvider({ sendSelectNode: vi.fn() })
    provider.applyDocument({ document: null, selectedNodeId: null, currentFile: null })
    expect(provider.getDocument()).toBeNull()
    expect(provider.getSelectedNode()).toBeNull()
  })

  it('去重：相同 (revision, 选中, 当前文件) 不重复应用', () => {
    const provider = new HostBackedDocumentProvider({ sendSelectNode: vi.fn() })
    const onDoc = vi.fn()
    provider.subscribeDocumentChanged(onDoc)
    provider.applyDocument({ document: makeDoc(5), selectedNodeId: 'node_002', currentFile: '/tmp/a.md' })
    expect(onDoc).toHaveBeenCalledTimes(1)
    // 完全相同 → 跳过。
    provider.applyDocument({ document: makeDoc(5), selectedNodeId: 'node_002', currentFile: '/tmp/a.md' })
    expect(onDoc).toHaveBeenCalledTimes(1)
    // 当前文件变化 → 应用。
    provider.applyDocument({ document: makeDoc(5), selectedNodeId: 'node_002', currentFile: '/tmp/b.md' })
    expect(onDoc).toHaveBeenCalledTimes(2)
    expect(provider.currentFile).toBe('/tmp/b.md')
    // 选中变化 → 应用。
    provider.applyDocument({ document: makeDoc(5, 'node_003'), selectedNodeId: 'node_003', currentFile: '/tmp/b.md' })
    expect(onDoc).toHaveBeenCalledTimes(3)
    expect(provider.getSelectedNode()?.id).toBe('node_003')
    // revision 变化 → 应用。
    provider.applyDocument({ document: makeDoc(6, 'node_003'), selectedNodeId: 'node_003', currentFile: '/tmp/b.md' })
    expect(onDoc).toHaveBeenCalledTimes(4)
    expect(provider.getDocument()?.revision).toBe(6)
  })
})

describe('ViewRuntime 宿主模式', () => {
  function makeRuntime(): { runtime: ViewRuntime, pushed: unknown[], sent: unknown[] } {
    const pushed: unknown[] = []
    const sent: unknown[] = []
    const runtime = new ViewRuntime('s1', (wire) => pushed.push(wire), (message) => sent.push(message))
    return { runtime, pushed, sent }
  }

  it('applyHostDocument 切换数据源（Mock → 宿主）', () => {
    const { runtime } = makeRuntime()
    expect(runtime.isHostMode()).toBe(false)
    expect(runtime.bridge.getDocument()?.id).toBeDefined() // Mock 文档
    runtime.applyHostDocument({ document: makeDoc(7, 'node_010'), selectedNodeId: 'node_010', currentFile: '/tmp/a.md' })
    expect(runtime.isHostMode()).toBe(true)
    expect(runtime.bridge.getProvider().id).toBe('structured-document')
    expect(runtime.bridge.getDocument()?.id).toBe('doc-1')
    expect(runtime.bridge.getDocument()?.revision).toBe(7)
    expect(runtime.currentFile).toBe('/tmp/a.md')
    runtime.dispose()
  })

  it('applyCapabilities 提前切宿主模式（无文档 → 空态）；false 保持 Mock', () => {
    const { runtime } = makeRuntime()
    runtime.applyCapabilities({ structuredDocument: true })
    expect(runtime.isHostMode()).toBe(true)
    expect(runtime.bridge.getProvider().id).toBe('structured-document')
    expect(runtime.bridge.getDocument()).toBeNull() // 未绑定：空态，而非 Mock 示例
    runtime.dispose()

    const { runtime: mockRuntime } = makeRuntime()
    mockRuntime.applyCapabilities({ structuredDocument: false })
    expect(mockRuntime.isHostMode()).toBe(false)
    expect(mockRuntime.bridge.getProvider().id).toBe('mock')
    expect(mockRuntime.bridge.getDocument()).not.toBeNull()
    mockRuntime.dispose()
  })

  it('applyCapabilities(true) 后收到文档推送仍正常应用', () => {
    const { runtime } = makeRuntime()
    runtime.applyCapabilities({ structuredDocument: true })
    runtime.applyHostDocument({ document: makeDoc(2, 'node_007'), selectedNodeId: 'node_007', currentFile: '/tmp/a.md' })
    expect(runtime.isHostMode()).toBe(true)
    expect(runtime.bridge.getDocument()?.revision).toBe(2)
    expect(runtime.bridge.getSelectedNodeId()).toBe('node_007')
    runtime.dispose()
  })

  it('宿主模式禁用 Mock 文档切换', () => {
    const { runtime } = makeRuntime()
    runtime.applyHostDocument({ document: makeDoc(1), selectedNodeId: null, currentFile: null })
    const result = runtime.setActiveDocument('meeting')
    expect(result.ok).toBe(false)
    runtime.dispose()
  })

  it('选中节点经运行时同步到宿主 provider 并发送 select-node 消息', () => {
    const { runtime, sent } = makeRuntime()
    runtime.applyHostDocument({ document: makeDoc(1, 'node_005'), selectedNodeId: null, currentFile: null })
    runtime.handleUserSelectNode('node_005')
    expect(runtime.bridge.getSelectedNodeId()).toBe('node_005')
    expect(sent.some((m) => (m as { type: string }).type === 'select-node')).toBe(true)
    const selectMsg = sent.find((m) => (m as { type: string }).type === 'select-node') as { nodeId: string }
    expect(selectMsg.nodeId).toBe('node_005')
    runtime.dispose()
  })

  it('sendCurrentFile 发送 current-file 消息', () => {
    const { runtime, sent } = makeRuntime()
    runtime.sendCurrentFile('/tmp/weekly.md')
    expect(sent).toContainEqual({ type: 'current-file', path: '/tmp/weekly.md' })
    runtime.sendCurrentFile(null)
    expect(sent).toContainEqual({ type: 'current-file', path: null })
    runtime.dispose()
  })

  it('宿主文档更新（revision 变化）刷新 bridge 文档', () => {
    const { runtime } = makeRuntime()
    runtime.applyHostDocument({ document: makeDoc(1), selectedNodeId: null, currentFile: '/tmp/a.md' })
    runtime.applyHostDocument({ document: makeDoc(9), selectedNodeId: 'node_002', currentFile: '/tmp/a.md' })
    expect(runtime.bridge.getDocument()?.revision).toBe(9)
    expect(runtime.bridge.getSelectedNodeId()).toBe('node_002')
    runtime.dispose()
  })
})
