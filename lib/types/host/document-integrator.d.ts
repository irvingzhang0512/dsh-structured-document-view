/**
 * HostDocumentIntegrator（宿主文档集成层）：把 dsh-structured-document 的
 * `ctx.structuredDocument` 服务接到 View 桥（ViewBridgeServer）上。
 *
 * 数据流：
 * - 客户端 hello → 订阅该会话工作区变化 + 推送当前文档快照；
 * - 工作区变化（bound/document/selection/unbound）→ 推送 document /
 *   selection 消息给该会话的浏览器端（HostBackedDocumentProvider 消费）；
 * - 客户端 select-node → 同步选中到工作区（SessionWorkspace.selectNode）；
 * - 客户端 current-file → 设置会话当前文件（触发懒绑定/重绑）。
 *
 * 依赖是**结构类型**（不 import dsh-structured-document 的任何代码）：
 * 宿主通过 `ctx.get('structuredDocument')` 拿到服务实例；服务缺失时
 * 本集成层不激活（视图插件回退 Mock 数据源）。
 */
import type { StructuredDocument } from '../shared/ir.ts';
import type { ClientToHostMessage } from '../shared/types.ts';
import type { ViewBridgeServer } from './bridge-server.ts';
/** 工作区变化（结构取型自 dsh-structured-document 的 WorkspaceChange）。 */
export interface WorkspaceChangeLike {
    kind: 'bound' | 'unbound' | 'document' | 'selection';
}
/** 文档快照（结构取型自 dsh-structured-document 的 DocumentSnapshot）。 */
export interface DocumentSnapshotLike {
    document: StructuredDocument;
    selectedNodeId: string | null;
    currentFile: string | null;
}
/** 结构化文档服务的最小结构面（宿主软依赖）。 */
export interface StructuredDocumentServiceLike {
    selectNode(sessionId: string, nodeId: string | null): void;
    setCurrentFile(sessionId: string, filePath: string | null): void;
    subscribe(sessionId: string, listener: (change: WorkspaceChangeLike) => void): () => void;
    getDocumentSnapshot(sessionId: string): DocumentSnapshotLike | null;
}
/** 构造选项。 */
export interface HostDocumentIntegratorOptions {
    service: StructuredDocumentServiceLike;
    bridge: ViewBridgeServer;
}
/** 宿主文档集成层。 */
export declare class HostDocumentIntegrator {
    private readonly service;
    private readonly bridge;
    private readonly subscriptions;
    /** 每会话最近一次推送的 (revision, selectedNodeId, currentFile)；用于去重。 */
    private readonly lastPushed;
    private disposed;
    constructor(options: HostDocumentIntegratorOptions);
    /** 处理一条客户端消息（hello / select-node / current-file）。 */
    handleMessage(sessionId: string, message: ClientToHostMessage): void;
    /** 同步会话：订阅工作区变化并推送当前快照。 */
    syncSession(sessionId: string): void;
    /** 释放：退订全部会话。 */
    dispose(): void;
    private onChange;
    private pushDocument;
    private pushSelection;
}
