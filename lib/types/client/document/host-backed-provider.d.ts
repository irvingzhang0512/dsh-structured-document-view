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
import type { DocNode, NodeId, StructuredDocument } from '../../shared/ir.ts';
import type { DocumentProvider } from '../../document/provider.ts';
/** 宿主文档快照推送（wire 的 document 消息载荷）。 */
export interface HostDocumentPush {
    document: StructuredDocument | null;
    selectedNodeId: string | null;
    currentFile: string | null;
}
/** 构造选项。 */
export interface HostBackedDocumentProviderOptions {
    /** 选中节点变化时发送到宿主桥。 */
    sendSelectNode: (nodeId: string | null) => void;
}
/** 宿主文档数据源。 */
export declare class HostBackedDocumentProvider implements DocumentProvider {
    readonly id = "structured-document";
    readonly displayName = "\u7ED3\u6784\u5316\u6587\u6863";
    private document;
    private selectedNodeId;
    private currentFileValue;
    private receivedPush;
    /** 最近一次应用的 (revision, selectedNodeId, currentFile)；用于去重。 */
    private lastApplied;
    private readonly docListeners;
    private readonly selListeners;
    private readonly sendSelectNode;
    constructor(options: HostBackedDocumentProviderOptions);
    /** 是否已收到宿主文档推送（宿主集成已激活）。 */
    get active(): boolean;
    /** 当前文件路径（宿主绑定）；未绑定 null。 */
    get currentFile(): string | null;
    /** 应用宿主文档快照推送（相同 revision/选中/当前文件去重）。 */
    applyDocument(push: HostDocumentPush): void;
    /** 应用宿主选中变化推送。 */
    applySelection(nodeId: string | null): void;
    /** 当前文档（深拷贝，调用方修改不影响镜像；与 Mock 数据源对齐）。 */
    getDocument(): StructuredDocument | null;
    getSelectedNode(): DocNode | null;
    selectNode(nodeId: NodeId | null): void;
    subscribeDocumentChanged(listener: () => void): () => void;
    subscribeSelectedNodeChanged(listener: () => void): () => void;
    dispose(): void;
    private emitDocumentChanged;
    private emitSelectedNodeChanged;
}
