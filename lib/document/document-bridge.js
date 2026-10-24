import { findNodeById, nodeDepth, resolveNodeRef } from "./node-ref.js";
/** 文档桥接层。 */
export class DocumentBridge {
    provider;
    document;
    selectedNodeId = null;
    listeners = new Set();
    unsubscribers = [];
    disposed = false;
    constructor(provider) {
        this.provider = provider;
        this.document = provider.getDocument();
        this.selectedNodeId = provider.getSelectedNode()?.id ?? null;
        this.unsubscribers.push(provider.subscribeDocumentChanged(() => {
            if (this.disposed)
                return;
            this.document = provider.getDocument();
            // 选中节点可能随文档变化失效，重新对齐。
            const selected = provider.getSelectedNode()?.id ?? null;
            if (selected !== null && this.document !== null && findNodeById(this.document.root, selected) === undefined) {
                this.selectedNodeId = null;
            }
            else {
                this.selectedNodeId = selected;
            }
            this.emit();
        }), provider.subscribeSelectedNodeChanged(() => {
            if (this.disposed)
                return;
            this.selectedNodeId = provider.getSelectedNode()?.id ?? null;
            this.emit();
        }));
    }
    /** 当前文档（只读视图，调用方不得修改）。 */
    getDocument() {
        return this.document;
    }
    /** 当前文档提供器信息。 */
    getProvider() {
        return this.provider;
    }
    /** 当前选中节点 id；未选择时 null。 */
    getSelectedNodeId() {
        return this.selectedNodeId;
    }
    /** 当前选中节点；未选择时 null。 */
    getSelectedNode() {
        if (this.document === null || this.selectedNodeId === null)
            return null;
        return findNodeById(this.document.root, this.selectedNodeId) ?? null;
    }
    /** 按 ID 查找节点。 */
    findNodeById(nodeId) {
        if (this.document === null)
            return undefined;
        return findNodeById(this.document.root, nodeId);
    }
    /** 节点深度（根 = 0）；不存在返回 null。 */
    nodeDepthOf(nodeId) {
        if (this.document === null)
            return null;
        return nodeDepth(this.document.root, nodeId);
    }
    /**
     * 解析一个用户提供的节点引用（id / current / 标题）。返回解析结果，
     * 失败时携带明确错误码（NODE_NOT_FOUND / MULTIPLE_NODES_FOUND /
     * NO_SELECTED_NODE）。
     */
    resolveNode(rawRef) {
        if (this.document === null) {
            return { ok: false, code: 'NODE_NOT_FOUND', message: '当前没有可用文档。' };
        }
        return resolveNodeRef(this.document, this.selectedNodeId, rawRef);
    }
    /**
     * 选择节点：校验存在性后转发给 Provider（数据侧维护选中状态），
     * 选中变化会经 subscribeSelectedNodeChanged 回流到 Bridge。
     * @returns 成功或带错误码的失败结果。
     */
    selectNode(nodeId) {
        if (nodeId === null) {
            this.provider.selectNode(null);
            return { ok: true };
        }
        if (this.document === null) {
            return { ok: false, code: 'DOCUMENT_UNAVAILABLE', message: '当前没有可用文档。' };
        }
        if (findNodeById(this.document.root, nodeId) === undefined) {
            return { ok: false, code: 'NODE_NOT_FOUND', message: `节点不存在: ${nodeId}` };
        }
        this.provider.selectNode(nodeId);
        return { ok: true };
    }
    /** 订阅任意变化（文档变化或选中变化）；返回退订函数。 */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    /** 释放桥接层（退订 Provider 事件）。 */
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        for (const unsubscribe of this.unsubscribers) {
            try {
                unsubscribe();
            }
            catch {
                // 忽略退订异常。
            }
        }
        this.listeners.clear();
    }
    emit() {
        for (const listener of [...this.listeners]) {
            try {
                listener();
            }
            catch {
                // 监听器异常不得破坏桥接层。
            }
        }
    }
}
