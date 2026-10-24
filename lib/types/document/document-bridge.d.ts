/**
 * DocumentBridge（文档桥接层）。
 *
 * 职责：
 * - 持有 DocumentProvider，维护"当前文档 / 当前节点"的本地镜像；
 * - 把 Provider 的订阅事件收敛成统一的 change 通知（渲染层只订阅 Bridge，
 *   不直接依赖 Provider 实现）；
 * - 提供节点解析（Node Reference）与选中转发；
 * - 未来 `dsh-structured-document` 完成后，仅替换 Provider 实现（或在本
 *   层增加异步适配），Renderer / Tool / Skill 无感知。
 */
import type { DocNode, NodeId, StructuredDocument } from '../shared/ir.ts';
import type { DocumentProvider } from './provider.ts';
import { resolveNodeRef } from './node-ref.ts';
/** 文档/选中任意变化的监听器。 */
export type DocumentChangeListener = () => void;
/** 文档桥接层。 */
export declare class DocumentBridge {
    private readonly provider;
    private document;
    private selectedNodeId;
    private readonly listeners;
    private readonly unsubscribers;
    private disposed;
    constructor(provider: DocumentProvider);
    /** 当前文档（只读视图，调用方不得修改）。 */
    getDocument(): StructuredDocument | null;
    /** 当前文档提供器信息。 */
    getProvider(): DocumentProvider;
    /** 当前选中节点 id；未选择时 null。 */
    getSelectedNodeId(): NodeId | null;
    /** 当前选中节点；未选择时 null。 */
    getSelectedNode(): DocNode | null;
    /** 按 ID 查找节点。 */
    findNodeById(nodeId: NodeId): DocNode | undefined;
    /** 节点深度（根 = 0）；不存在返回 null。 */
    nodeDepthOf(nodeId: NodeId): number | null;
    /**
     * 解析一个用户提供的节点引用（id / current / 标题）。返回解析结果，
     * 失败时携带明确错误码（NODE_NOT_FOUND / MULTIPLE_NODES_FOUND /
     * NO_SELECTED_NODE）。
     */
    resolveNode(rawRef: string | undefined): ReturnType<typeof resolveNodeRef>;
    /**
     * 选择节点：校验存在性后转发给 Provider（数据侧维护选中状态），
     * 选中变化会经 subscribeSelectedNodeChanged 回流到 Bridge。
     * @returns 成功或带错误码的失败结果。
     */
    selectNode(nodeId: NodeId | null): {
        ok: true;
    } | {
        ok: false;
        code: string;
        message: string;
    };
    /** 订阅任意变化（文档变化或选中变化）；返回退订函数。 */
    subscribe(listener: DocumentChangeListener): () => void;
    /** 释放桥接层（退订 Provider 事件）。 */
    dispose(): void;
    private emit;
}
