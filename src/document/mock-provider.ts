/**
 * MockDocumentProvider（模拟文档提供器）。
 *
 * 在 `dsh-structured-document` 完成之前，本提供器用内置的三类示例数据
 * （会议纪要 / 项目管理 / 思路整理）扮演数据真源，完整实现
 * {@link DocumentProvider} 接口，使 Renderer、View Tool、View Skill
 * 可以端到端跑通。
 *
 * Mock 专属能力（真实 Provider 不需要）：
 * - 内置三个文档，可切换当前文档（setActiveDocument）；
 * - mockMutate 模拟外部文档变化（触发 document-changed 事件，验证
 *   "文档变化 → 重新读取 → 刷新视图" 的管线）。
 *
 * 未来替换：实现一个新的 DocumentProvider（例如包装
 * `dsh-structured-document` 的 SessionWorkspace.getDocument()），
 * 传入 Document Bridge 即可，View 其余部分无需改动。
 */
import type { DocNode, NodeId, StructuredDocument } from '../shared/ir.ts'
import type { DocumentProvider } from './provider.ts'
import meeting from '../../examples/meeting.json'
import project from '../../examples/project.json'
import thinking from '../../examples/thinking.json'

/** 一个内置的模拟文档。 */
export interface MockDocumentDescriptor {
  /** 文档标识（meeting / project / thinking）。 */
  id: string
  /** 展示名（中文）。 */
  label: string
  /** 文档数据。 */
  document: StructuredDocument
}

/** 内置三类示例数据。 */
export const BUILTIN_MOCK_DOCUMENTS: readonly MockDocumentDescriptor[] = [
  { id: 'meeting', label: '会议纪要', document: meeting as StructuredDocument },
  { id: 'project', label: '项目管理', document: project as StructuredDocument },
  { id: 'thinking', label: '思路整理', document: thinking as StructuredDocument },
]

/** 默认当前文档（思路整理）。 */
export const DEFAULT_MOCK_DOCUMENT_ID = 'thinking'

/** 同步校验一个节点的存在性（不存在抛错）。 */
function requireNode(root: DocNode, nodeId: NodeId): DocNode {
  const stack: DocNode[] = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.id === nodeId) return node
    stack.push(...node.children)
  }
  throw new Error(`MockDocumentProvider: 节点不存在: ${nodeId}`)
}

/** MockDocumentProvider 构造参数。 */
export interface MockDocumentProviderOptions {
  /** 初始文档 id（默认 thinking）。 */
  activeDocumentId?: string
  /** 时钟注入（测试用）。 */
  now?: () => number
}

/**
 * 模拟文档提供器（Mock Document Provider）。
 * 实现 {@link DocumentProvider} 接口的五项能力 + Mock 专属的切换/变更能力。
 */
export class MockDocumentProvider implements DocumentProvider {
  readonly id = 'mock'
  readonly displayName = '模拟文档提供器（Mock）'

  private readonly docs: ReadonlyMap<string, MockDocumentDescriptor>
  private activeId: string
  private selectedNodeId: NodeId | null = null
  private readonly docListeners = new Set<() => void>()
  private readonly selListeners = new Set<() => void>()
  private disposed = false

  constructor(options: MockDocumentProviderOptions = {}) {
    // 每个 Provider 实例持有**独立**的文档副本：BUILTIN_MOCK_DOCUMENTS
    // 是模块级共享的种子数据，mockMutate 的变更绝不允许跨实例泄漏。
    this.docs = new Map(
      BUILTIN_MOCK_DOCUMENTS.map(doc => [doc.id, {
        id: doc.id,
        label: doc.label,
        document: structuredClone(doc.document),
      }]),
    )
    const initial = options.activeDocumentId ?? DEFAULT_MOCK_DOCUMENT_ID
    this.activeId = this.docs.has(initial) ? initial : DEFAULT_MOCK_DOCUMENT_ID
  }

  /** 当前文档（深拷贝，调用方修改不影响内部）。 */
  getDocument(): StructuredDocument | null {
    const descriptor = this.docs.get(this.activeId)
    if (descriptor === undefined) return null
    return structuredClone(descriptor.document)
  }

  getSelectedNode(): DocNode | null {
    if (this.selectedNodeId === null) return null
    const doc = this.getDocument()
    if (doc === null) return null
    try {
      return structuredClone(requireNode(doc.root, this.selectedNodeId))
    } catch {
      return null
    }
  }

  selectNode(nodeId: NodeId | null): void {
    if (this.disposed) return
    if (nodeId !== null) {
      const doc = this.getDocument()
      if (doc !== null) requireNode(doc.root, nodeId)
    }
    if (this.selectedNodeId === nodeId) return
    this.selectedNodeId = nodeId
    this.emitSelectedNodeChanged()
  }

  subscribeDocumentChanged(listener: () => void): () => void {
    this.docListeners.add(listener)
    return () => this.docListeners.delete(listener)
  }

  subscribeSelectedNodeChanged(listener: () => void): () => void {
    this.selListeners.add(listener)
    return () => this.selListeners.delete(listener)
  }

  dispose(): void {
    this.disposed = true
    this.docListeners.clear()
    this.selListeners.clear()
  }

  // ── Mock 专属 ───────────────────────────────────────────────────────────

  /** 列出可用的内置文档。 */
  listDocuments(): readonly MockDocumentDescriptor[] {
    return BUILTIN_MOCK_DOCUMENTS
  }

  /** 当前激活文档 id。 */
  getActiveDocumentId(): string {
    return this.activeId
  }

  /** 当前激活文档的展示名。 */
  getActiveDocumentLabel(): string {
    return this.docs.get(this.activeId)?.label ?? this.activeId
  }

  /**
   * 切换当前文档，并清理选中状态（旧文档的节点在新文档中无意义）。
   * 触发 document-changed。
   */
  setActiveDocument(documentId: string): void {
    if (this.disposed) return
    if (!this.docs.has(documentId)) {
      throw new Error(`MockDocumentProvider: 未知文档 "${documentId}"（可用：${[...this.docs.keys()].join('、')}）`)
    }
    if (this.activeId === documentId) return
    this.activeId = documentId
    this.selectedNodeId = null
    this.emitDocumentChanged()
    this.emitSelectedNodeChanged()
  }

  /**
   * 模拟一次外部文档变更（例如未来 dsh-structured-document 保存文档后
   * 发出 document-changed）。mutator 接收当前文档深拷贝并返回新文档，
   * 返回值为空则无变化。
   */
  mockMutate(mutator: (document: StructuredDocument) => StructuredDocument | void): void {
    if (this.disposed) return
    const descriptor = this.docs.get(this.activeId)
    if (descriptor === undefined) return
    const current = structuredClone(descriptor.document)
    const next = mutator(current) ?? current
    descriptor.document = next as StructuredDocument
    // 若选中节点在新文档中已不存在，清理选中。
    if (this.selectedNodeId !== null) {
      try {
        requireNode(next.root, this.selectedNodeId)
      } catch {
        this.selectedNodeId = null
        this.emitSelectedNodeChanged()
      }
    }
    this.emitDocumentChanged()
  }

  private emitDocumentChanged(): void {
    for (const listener of [...this.docListeners]) {
      try {
        listener()
      } catch {
        // 监听器异常不得破坏提供器。
      }
    }
  }

  private emitSelectedNodeChanged(): void {
    for (const listener of [...this.selListeners]) {
      try {
        listener()
      } catch {
        // 同上。
      }
    }
  }
}
