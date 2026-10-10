/**
 * EmptyDocumentProvider（空数据源）：`connecting` 阶段的占位 Provider。
 *
 * 数据源状态机见 SPEC F010：客户端在收到宿主 `hello-ack` 之前，既不知道宿主
 * 有没有文档内核，也不该把内置示例数据当成"当前文档"。此时用本 Provider 占位
 * ——文档与选中恒为 null、订阅为空操作，让 bridge / 命令 / 界面代码不需要写
 * 判空分支（`connecting` 的界面语义由 ViewRuntime / TabView 表达）。
 *
 * 一旦握手完成：`structuredDocument: true` → 换 HostBackedDocumentProvider；
 * `false` → 换 MockDocumentProvider（示例数据，界面必须显式标注）。
 */
import type { DocNode, NodeId, StructuredDocument } from '../shared/ir.ts'
import type { DocumentProvider } from './provider.ts'

/** 空数据源（无文档、无选中、无事件）。 */
export class EmptyDocumentProvider implements DocumentProvider {
  readonly id = 'empty'
  readonly displayName = '未连接'

  getDocument(): StructuredDocument | null {
    return null
  }

  getSelectedNode(): DocNode | null {
    return null
  }

  selectNode(_nodeId: NodeId | null): void {
    // 数据源未就绪：没有文档可选，忽略（命令层会先返回 SOURCE_NOT_READY）。
  }

  subscribeDocumentChanged(_listener: () => void): () => void {
    return () => undefined
  }

  subscribeSelectedNodeChanged(_listener: () => void): () => void {
    return () => undefined
  }

  dispose(): void {
    // 无资源。
  }
}
