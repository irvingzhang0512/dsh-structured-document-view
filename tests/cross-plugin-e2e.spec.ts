/**
 * 跨插件端到端测试：真实 dsh-structured-document（源码直连，位于
 * F:\irving-dsh-plugins\dsh-structured-document）与真实视图插件宿主
 * 集成层、桥、客户端数据源的完整配合链路。
 *
 * 链路：setCurrentFile → 懒绑定（解析 Markdown 为 IR）→ bound 事件 →
 * HostDocumentIntegrator 推 document 消息 → HostBackedDocumentProvider
 * 应用镜像 → 视图可读；selectNode → selection 消息 → 客户端选中同步。
 */
import { describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'

// dsh-structured-document（另一仓库，源码直连以跑真实链路）。
import { WorkspaceRegistry } from 'F:/irving-dsh-plugins/dsh-structured-document/src/state/kernel.ts'
import { NodeFsStorage } from 'F:/irving-dsh-plugins/dsh-structured-document/src/storage/storage.ts'
import { InMemoryCurrentFileStore } from 'F:/irving-dsh-plugins/dsh-structured-document/src/plugin/current-file.ts'
import { StructuredDocumentServiceImpl } from 'F:/irving-dsh-plugins/dsh-structured-document/src/integration/service.ts'

// 视图插件（本仓库）。
import { HostDocumentIntegrator } from '../src/host/document-integrator.ts'
import { ViewBridgeServer } from '../src/host/bridge-server.ts'
import { ViewMirrorStore } from '../src/host/mirror-store.ts'
import { HostBackedDocumentProvider } from '../src/client/document/host-backed-provider.ts'

const MEETING_FIXTURE = [
  '# 防干烧项目周会',
  '## 当前算法问题',
  '- 砂锅误报较多',
  '- 灶具差异可能有影响',
  '## 待办',
  '- [ ] 整理热红外验证数据',
].join('\n') + '\n'

describe('跨插件配合链路（真实 dsh-structured-document）', () => {
  it('setCurrentFile → 绑定 → 推文档 → 客户端镜像；selectNode → 选中同步', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'sdv-e2e-'))
    const filePath = join(dir, 'weekly.md')
    await writeFile(filePath, MEETING_FIXTURE, 'utf8')

    // dsh-structured-document 侧：内核 + 服务。
    const registry = new WorkspaceRegistry({
      storage: new NodeFsStorage(),
      defaultProfile: 'meeting',
      autoSave: true,
      maxUndoSteps: 50,
      resolvePath: async (_sessionId, raw) => (isAbsolute(raw) ? raw : join(dir, raw)),
      now: () => new Date('2026-01-15T10:00:00Z'),
      createdBy: 'e2e',
    })
    const store = new InMemoryCurrentFileStore()
    const service = new StructuredDocumentServiceImpl({ registry, store, resolvePath: async (_s, raw) => (isAbsolute(raw) ? raw : join(dir, raw)) })

    // 视图插件侧：桥 + 集成层。
    const received: unknown[] = []
    const bridge = new ViewBridgeServer({
      store: new ViewMirrorStore(),
      onMessage: (sessionId, message) => integrator.handleMessage(sessionId, message),
    })
    const integrator = new HostDocumentIntegrator({ service, bridge })
    bridge.attach('s1', (message) => received.push(JSON.parse(message)))

    // 客户端：hello → 能力协商应答（宿主集成已激活；未绑定时不推文档）。
    bridge.handleClientMessage('s1', { type: 'hello' })
    const initial = received[received.length - 1] as { type: string }
    expect(initial.type).toBe('hello-ack')
    expect(received.some((m) => (m as { type: string }).type === 'document')).toBe(false)

    // 当前文件联动：setCurrentFile → 懒绑定 → bound 事件 → 推真实文档。
    service.setCurrentFile('s1', filePath)
    await viWaitFor(() => {
      const last = received[received.length - 1] as { type: string; document: { title: string; root: { children: unknown[] } } }
      expect(last.type).toBe('document')
      expect(last.document?.title).toBe('防干烧项目周会')
      expect((last.document?.root.children ?? []).length).toBe(2)
    })

    // 客户端数据源：应用宿主推送 → 视图可读。
    const provider = new HostBackedDocumentProvider({ sendSelectNode: () => undefined })
    // 模拟 bridge-client → runtime 的消费（document → applyDocument，selection → applySelection）。
    let consumed = 0
    const consume = (): void => {
      for (; consumed < received.length; consumed += 1) {
        const message = received[consumed] as { type: string }
        if (message.type === 'document') {
          provider.applyDocument(message as Parameters<typeof provider.applyDocument>[0])
        } else if (message.type === 'selection') {
          provider.applySelection((message as { selectedNodeId: string | null }).selectedNodeId)
        }
      }
    }
    consume()
    expect(provider.active).toBe(true)
    expect(provider.getDocument()?.title).toBe('防干烧项目周会')
    expect(provider.getSelectedNode()).toBeNull()
    expect(provider.currentFile).toBe(filePath)

    // 视图点选节点 → 客户端 selectNode → 宿主 selectNode → selection 推送回流。
    const childId = provider.getDocument()!.root.children[0]!.id
    let selectionCount = 0
    provider.subscribeSelectedNodeChanged(() => { selectionCount += 1 })
    bridge.handleClientMessage('s1', { type: 'select-node', nodeId: childId })
    await viWaitFor(() => {
      consume()
      expect(selectionCount).toBeGreaterThan(0)
    })
    expect(provider.getSelectedNode()?.id).toBe(childId)

    // 宿主侧选中状态同步（Agent 可用 @selected 指代）。
    const snapshot = service.getDocumentSnapshot('s1')
    expect(snapshot?.selectedNodeId).toBe(childId)

    // 文档被 dsh-structured-document 修改（工具语义）→ document 事件 → 推送刷新。
    const workspace = registry.get('s1')
    await workspace.addNode({ parentId: 'node_001', title: '新结论', role: 'conclusion' })
    await viWaitFor(() => {
      const last = received[received.length - 1] as { type: string; document: { revision: number } }
      expect(last.type).toBe('document')
      expect(last.document?.revision).toBeGreaterThanOrEqual(2)
    })
    const updated = received[received.length - 1] as { type: string; document: { title: string; root: { children: unknown[] } } }
    expect((updated.document?.root.children ?? []).length).toBe(3)

    integrator.dispose()
    bridge.dispose()
    registry.disposeAll()
    // 等 sidecar 异步写盘完成后删除临时目录（Windows 上句柄可能占用）。
    await viWaitFor(async () => {
      await rm(dir, { recursive: true, force: true })
    }, 3000)
  })
})

/** 简易轮询等待（vi.waitFor 别名，便于阅读）。 */
async function viWaitFor(assert: () => void | Promise<void>, timeoutMs = 3000): Promise<void> {
  await vi.waitFor(assert, { timeout: timeoutMs, interval: 20 })
}
