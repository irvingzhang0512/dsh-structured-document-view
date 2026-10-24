import meeting from '../../examples/meeting.json';
import project from '../../examples/project.json';
import thinking from '../../examples/thinking.json';
/** 内置三类示例数据。 */
export const BUILTIN_MOCK_DOCUMENTS = [
    { id: 'meeting', label: '会议纪要', document: meeting },
    { id: 'project', label: '项目管理', document: project },
    { id: 'thinking', label: '思路整理', document: thinking },
];
/** 默认当前文档（思路整理）。 */
export const DEFAULT_MOCK_DOCUMENT_ID = 'thinking';
/** 同步校验一个节点的存在性（不存在抛错）。 */
function requireNode(root, nodeId) {
    const stack = [root];
    while (stack.length > 0) {
        const node = stack.pop();
        if (node.id === nodeId)
            return node;
        stack.push(...node.children);
    }
    throw new Error(`MockDocumentProvider: 节点不存在: ${nodeId}`);
}
/**
 * 模拟文档提供器（Mock Document Provider）。
 * 实现 {@link DocumentProvider} 接口的五项能力 + Mock 专属的切换/变更能力。
 */
export class MockDocumentProvider {
    id = 'mock';
    displayName = '模拟文档提供器（Mock）';
    docs;
    activeId;
    selectedNodeId = null;
    docListeners = new Set();
    selListeners = new Set();
    disposed = false;
    constructor(options = {}) {
        // 每个 Provider 实例持有**独立**的文档副本：BUILTIN_MOCK_DOCUMENTS
        // 是模块级共享的种子数据，mockMutate 的变更绝不允许跨实例泄漏。
        this.docs = new Map(BUILTIN_MOCK_DOCUMENTS.map(doc => [doc.id, {
                id: doc.id,
                label: doc.label,
                document: structuredClone(doc.document),
            }]));
        const initial = options.activeDocumentId ?? DEFAULT_MOCK_DOCUMENT_ID;
        this.activeId = this.docs.has(initial) ? initial : DEFAULT_MOCK_DOCUMENT_ID;
    }
    /** 当前文档（深拷贝，调用方修改不影响内部）。 */
    getDocument() {
        const descriptor = this.docs.get(this.activeId);
        if (descriptor === undefined)
            return null;
        return structuredClone(descriptor.document);
    }
    getSelectedNode() {
        if (this.selectedNodeId === null)
            return null;
        const doc = this.getDocument();
        if (doc === null)
            return null;
        try {
            return structuredClone(requireNode(doc.root, this.selectedNodeId));
        }
        catch {
            return null;
        }
    }
    selectNode(nodeId) {
        if (this.disposed)
            return;
        if (nodeId !== null) {
            const doc = this.getDocument();
            if (doc !== null)
                requireNode(doc.root, nodeId);
        }
        if (this.selectedNodeId === nodeId)
            return;
        this.selectedNodeId = nodeId;
        this.emitSelectedNodeChanged();
    }
    subscribeDocumentChanged(listener) {
        this.docListeners.add(listener);
        return () => this.docListeners.delete(listener);
    }
    subscribeSelectedNodeChanged(listener) {
        this.selListeners.add(listener);
        return () => this.selListeners.delete(listener);
    }
    dispose() {
        this.disposed = true;
        this.docListeners.clear();
        this.selListeners.clear();
    }
    // ── Mock 专属 ───────────────────────────────────────────────────────────
    /** 列出可用的内置文档。 */
    listDocuments() {
        return BUILTIN_MOCK_DOCUMENTS;
    }
    /** 当前激活文档 id。 */
    getActiveDocumentId() {
        return this.activeId;
    }
    /** 当前激活文档的展示名。 */
    getActiveDocumentLabel() {
        return this.docs.get(this.activeId)?.label ?? this.activeId;
    }
    /**
     * 切换当前文档，并清理选中状态（旧文档的节点在新文档中无意义）。
     * 触发 document-changed。
     */
    setActiveDocument(documentId) {
        if (this.disposed)
            return;
        if (!this.docs.has(documentId)) {
            throw new Error(`MockDocumentProvider: 未知文档 "${documentId}"（可用：${[...this.docs.keys()].join('、')}）`);
        }
        if (this.activeId === documentId)
            return;
        this.activeId = documentId;
        this.selectedNodeId = null;
        this.emitDocumentChanged();
        this.emitSelectedNodeChanged();
    }
    /**
     * 模拟一次外部文档变更（例如未来 dsh-structured-document 保存文档后
     * 发出 document-changed）。mutator 接收当前文档深拷贝并返回新文档，
     * 返回值为空则无变化。
     */
    mockMutate(mutator) {
        if (this.disposed)
            return;
        const descriptor = this.docs.get(this.activeId);
        if (descriptor === undefined)
            return;
        const current = structuredClone(descriptor.document);
        const next = mutator(current) ?? current;
        descriptor.document = next;
        // 若选中节点在新文档中已不存在，清理选中。
        if (this.selectedNodeId !== null) {
            try {
                requireNode(next.root, this.selectedNodeId);
            }
            catch {
                this.selectedNodeId = null;
                this.emitSelectedNodeChanged();
            }
        }
        this.emitDocumentChanged();
    }
    emitDocumentChanged() {
        for (const listener of [...this.docListeners]) {
            try {
                listener();
            }
            catch {
                // 监听器异常不得破坏提供器。
            }
        }
    }
    emitSelectedNodeChanged() {
        for (const listener of [...this.selListeners]) {
            try {
                listener();
            }
            catch {
                // 同上。
            }
        }
    }
}
