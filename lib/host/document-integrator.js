/** 宿主文档集成层。 */
export class HostDocumentIntegrator {
    service;
    bridge;
    subscriptions = new Map();
    /** 每会话最近一次推送的 (revision, selectedNodeId, currentFile)；用于去重。 */
    lastPushed = new Map();
    disposed = false;
    constructor(options) {
        this.service = options.service;
        this.bridge = options.bridge;
    }
    /** 处理一条客户端消息（hello / select-node / current-file）。 */
    handleMessage(sessionId, message) {
        if (this.disposed)
            return;
        switch (message.type) {
            case 'hello':
                this.syncSession(sessionId);
                break;
            case 'select-node':
                this.service.selectNode(sessionId, message.nodeId);
                break;
            case 'current-file':
                this.service.setCurrentFile(sessionId, message.path);
                break;
            default:
                break;
        }
    }
    /** 同步会话：订阅工作区变化并推送当前快照。 */
    syncSession(sessionId) {
        if (this.disposed)
            return;
        if (!this.subscriptions.has(sessionId)) {
            const unsubscribe = this.service.subscribe(sessionId, (change) => this.onChange(sessionId, change));
            this.subscriptions.set(sessionId, unsubscribe);
        }
        this.pushDocument(sessionId);
    }
    /** 释放：退订全部会话。 */
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        for (const unsubscribe of this.subscriptions.values()) {
            try {
                unsubscribe();
            }
            catch {
                // 忽略退订异常。
            }
        }
        this.subscriptions.clear();
        this.lastPushed.clear();
    }
    onChange(sessionId, change) {
        if (this.disposed)
            return;
        switch (change.kind) {
            case 'bound':
            case 'document':
                this.pushDocument(sessionId);
                break;
            case 'selection':
                this.pushSelection(sessionId);
                break;
            case 'unbound':
                this.lastPushed.delete(sessionId);
                this.bridge.push(sessionId, { type: 'document', document: null, selectedNodeId: null, currentFile: null });
                break;
        }
    }
    pushDocument(sessionId) {
        const snapshot = this.service.getDocumentSnapshot(sessionId);
        if (snapshot === null) {
            // 服务无该会话快照（未绑定）：推空文档并清去重记录。
            const last = this.lastPushed.get(sessionId);
            this.lastPushed.delete(sessionId);
            if (last !== undefined) {
                this.bridge.push(sessionId, { type: 'document', document: null, selectedNodeId: null, currentFile: null });
            }
            return;
        }
        const key = { revision: snapshot.document.revision, selectedNodeId: snapshot.selectedNodeId, currentFile: snapshot.currentFile };
        const last = this.lastPushed.get(sessionId);
        if (last !== undefined &&
            last.revision === key.revision &&
            last.selectedNodeId === key.selectedNodeId &&
            last.currentFile === key.currentFile) {
            // 无实质变化（Agent 连续操作或重复事件）：跳过，避免重复全量推送。
            return;
        }
        this.lastPushed.set(sessionId, key);
        this.bridge.push(sessionId, {
            type: 'document',
            document: snapshot.document,
            selectedNodeId: snapshot.selectedNodeId,
            currentFile: snapshot.currentFile,
        });
    }
    pushSelection(sessionId) {
        const snapshot = this.service.getDocumentSnapshot(sessionId);
        this.bridge.push(sessionId, { type: 'selection', selectedNodeId: snapshot?.selectedNodeId ?? null });
    }
}
