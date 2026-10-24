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
import type { DocNode, NodeId, StructuredDocument } from '../shared/ir.ts';
import type { DocumentProvider } from './provider.ts';
/** 一个内置的模拟文档。 */
export interface MockDocumentDescriptor {
    /** 文档标识（meeting / project / thinking）。 */
    id: string;
    /** 展示名（中文）。 */
    label: string;
    /** 文档数据。 */
    document: StructuredDocument;
}
/** 内置三类示例数据。 */
export declare const BUILTIN_MOCK_DOCUMENTS: readonly MockDocumentDescriptor[];
/** 默认当前文档（思路整理）。 */
export declare const DEFAULT_MOCK_DOCUMENT_ID = "thinking";
/** MockDocumentProvider 构造参数。 */
export interface MockDocumentProviderOptions {
    /** 初始文档 id（默认 thinking）。 */
    activeDocumentId?: string;
    /** 时钟注入（测试用）。 */
    now?: () => number;
}
/**
 * 模拟文档提供器（Mock Document Provider）。
 * 实现 {@link DocumentProvider} 接口的五项能力 + Mock 专属的切换/变更能力。
 */
export declare class MockDocumentProvider implements DocumentProvider {
    readonly id = "mock";
    readonly displayName = "\u6A21\u62DF\u6587\u6863\u63D0\u4F9B\u5668\uFF08Mock\uFF09";
    private readonly docs;
    private activeId;
    private selectedNodeId;
    private readonly docListeners;
    private readonly selListeners;
    private disposed;
    constructor(options?: MockDocumentProviderOptions);
    /** 当前文档（深拷贝，调用方修改不影响内部）。 */
    getDocument(): StructuredDocument | null;
    getSelectedNode(): DocNode | null;
    selectNode(nodeId: NodeId | null): void;
    subscribeDocumentChanged(listener: () => void): () => void;
    subscribeSelectedNodeChanged(listener: () => void): () => void;
    dispose(): void;
    /** 列出可用的内置文档。 */
    listDocuments(): readonly MockDocumentDescriptor[];
    /** 当前激活文档 id。 */
    getActiveDocumentId(): string;
    /** 当前激活文档的展示名。 */
    getActiveDocumentLabel(): string;
    /**
     * 切换当前文档，并清理选中状态（旧文档的节点在新文档中无意义）。
     * 触发 document-changed。
     */
    setActiveDocument(documentId: string): void;
    /**
     * 模拟一次外部文档变更（例如未来 dsh-structured-document 保存文档后
     * 发出 document-changed）。mutator 接收当前文档深拷贝并返回新文档，
     * 返回值为空则无变化。
     */
    mockMutate(mutator: (document: StructuredDocument) => StructuredDocument | void): void;
    private emitDocumentChanged;
    private emitSelectedNodeChanged;
}
