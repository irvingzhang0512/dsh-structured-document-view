/**
 * Document Provider Interface（文档提供接口）——本插件唯一依赖的数据契约。
 *
 * 设计原则：
 * - View 插件只依赖本接口，不依赖未来 `dsh-structured-document` 的内部实现。
 * - 未来 `dsh-structured-document` 完成后，仅需实现一个
 *   `StructuredDocumentProvider`（或一个适配 Bridge）替换 Mock Provider，
 *   Renderer / View Tool / View Skill 无需重写。
 *
 * V0.1 必需能力（对应需求文档第 15 章）：
 * - get_document                获取当前文档
 * - get_selected_node           获取当前节点
 * - select_node                 选择节点
 * - subscribe_document_changed  监听文档变化
 * - subscribe_selected_node_changed 监听当前节点变化
 *
 * 职责约定：
 * - 本接口只读文档与选中状态，不承担任何渲染逻辑。
 * - select_node 是"告知数据侧当前节点"，由文档数据侧维护选中状态。
 * - 同步返回的 getDocument：V0.1 Mock 是同步的；若未来真实 Provider 需要
 *   异步读取，由 Document Bridge（文档桥接层）吸收异步（见 docs/document-provider.md
 *   设计决策 D2），本接口在 V0.1 保持同步以简化客户端状态管理。
 */
import type { DocNode, StructuredDocument } from '../shared/ir.ts'

/** 文档变化事件。 */
export type DocumentChangeEvent = 'document-changed' | 'selected-node-changed'

/**
 * 文档提供接口（Document Provider Interface）。
 *
 * 未来 `dsh-structured-document` 的 Provider 实现应提供相同职责的五项能力
 * （方法名可按实际架构调整，职责保持一致）。
 */
export interface DocumentProvider {
  /** 提供器唯一标识（如 'mock' / 'structured-document'）。 */
  readonly id: string
  /** 提供器展示名（中文，用于界面与工具输出）。 */
  readonly displayName: string

  /**
   * 获取当前文档；无文档时返回 null。
   * @returns 当前结构化文档（只读视图，调用方不得修改）。
   */
  getDocument(): StructuredDocument | null

  /** 获取当前选中的节点；未选择时返回 null。 */
  getSelectedNode(): DocNode | null

  /**
   * 选择节点（设置当前节点）。nodeId 为 null 表示清除选中。
   * 节点不存在时实现应忽略或抛错（由实现决定，Bridge 会先校验）。
   */
  selectNode(nodeId: string | null): void

  /** 订阅文档变化；返回退订函数。 */
  subscribeDocumentChanged(listener: () => void): () => void

  /** 订阅当前节点变化；返回退订函数。 */
  subscribeSelectedNodeChanged(listener: () => void): () => void

  /** 释放提供器持有的资源（事件监听、定时器等）。 */
  dispose(): void
}
