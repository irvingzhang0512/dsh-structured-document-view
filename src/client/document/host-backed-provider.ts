/**
 * HostBackedDocumentProvider（宿主文档数据源）：客户端侧的 DocumentProvider，
 * 数据来自宿主桥推送的文档快照（dsh-structured-document 集成）。
 *
 * - 宿主（HostDocumentIntegrator）在文档变化时推送 `document` 消息，本
 *   Provider 更新镜像并触发 document-changed；
 * - 用户在视图点击节点 → selectNode() 本地更新 + 经桥同步回宿主
 *   （dsh-structured-document 的 SessionWorkspace.selectNode）；
 * - 未收到任何宿主推送前处于"未激活"状态（此时运行时使用 Mock）。
 */
import type { DocNode, NodeId, StructuredDocument } from '../../shared/ir.ts'
import type { DocumentProvider } from '../../document/provider.ts'
import { findNodeById } from '../../document/node-ref.ts'

/** 宿主文档快照推送（wire 的 document 消息载荷）。 */
export interface HostDocumentPush {
  document: StructuredDocument | null
  selectedNodeId: string | null
  currentFile: string | null
}

/** 构造选项。 */
export interface HostBackedDocumentProviderOptions {
  /** 选中节点变化时发送到宿主桥。 */
  sendSelectNode: (nodeId: string | null) => void
}

/** 宿主文档数据源。 */
export class HostBackedDocumentProvider implements DocumentProvider {
  readonly id = 'structured-document'
  readonly displayName = '结构化文档'
  private document: StructuredDocument | null = null
  private selectedNodeId: NodeId | null = null
  private currentFileValue: string | null = null
  private receivedPush = false
  /** 最近一次应用的 (revision, selectedNodeId, currentFile)；用于去重。 */
  private lastApplied: { revision: number; selectedNodeId: string | null; currentFile: string | null } | null = null
  private readonly docListeners = new Set<() => void>()
  private readonly selListeners = new Set<() => void>()
  private readonly sendSelectNode: (nodeId: string | null) => void

  constructor(options: HostBackedDocumentProviderOptions) {
    this.sendSelectNode = options.sendSelectNode
  }

  /** 是否已收到宿主文档推送（宿主集成已激活）。 */
  get active(): boolean {
    return this.receivedPush
  }

  /** 当前文件路径（宿主绑定）；未绑定 null。 */
  get currentFile(): string | null {
    return this.currentFileValue
  }

  /** 应用宿主文档快照推送（相同 revision/选中/当前文件去重）。 */
  applyDocument(push: HostDocumentPush): void {
    const key = { revision: push.document?.revision ?? 0, selectedNodeId: push.selectedNodeId, currentFile: push.currentFile }
    if (
      this.lastApplied !== null &&
      this.lastApplied.revision === key.revision &&
      this.lastApplied.selectedNodeId === key.selectedNodeId &&
      this.lastApplied.currentFile === key.currentFile
    ) {
      // 无实质变化（宿主去重后的防御）：跳过，避免重复重渲染。
      return
    }
    this.receivedPush = true
    this.lastApplied = key
    this.document = push.document === null ? null : structuredClone(push.document)
    this.selectedNodeId = push.selectedNodeId
    this.currentFileValue = push.currentFile
    this.emitDocumentChanged()
  }

  /** 应用宿主选中变化推送。 */
  applySelection(nodeId: string | null): void {
    this.selectedNodeId = nodeId
    this.emitSelectedNodeChanged()
  }

  /** 当前文档（深拷贝，调用方修改不影响镜像；与 Mock 数据源对齐）。 */
  getDocument(): StructuredDocument | null {
    return this.document === null ? null : structuredClone(this.document)
  }

  getSelectedNode(): DocNode | null {
    if (this.document === null || this.selectedNodeId === null) return null
    const node = findNodeById(this.document.root, this.selectedNodeId)
    return node === undefined ? null : structuredClone(node)
  }

  selectNode(nodeId: NodeId | null): void {
    this.selectedNodeId = nodeId
    this.sendSelectNode(nodeId)
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
    this.docListeners.clear()
    this.selListeners.clear()
  }

  private emitDocumentChanged(): void {
    for (const listener of [...this.docListeners]) {
      try {
        listener()
      } catch {
        // 监听器异常不阻断数据源。
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
