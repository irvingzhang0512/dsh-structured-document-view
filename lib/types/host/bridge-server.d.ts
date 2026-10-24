import type { ClientToHostMessage, CommandAck, DispatchOutcome, HostToClientMessage, ViewCommand, ViewStateWire } from '../shared/types.ts';
import { ViewMirrorStore } from './mirror-store.ts';
/** 一条命令等待 ack 的默认超时。 */
export declare const BRIDGE_ACK_TIMEOUT_MS = 4000;
/** 最小消息发送器（生产为 WebSocket，测试为桩）。 */
export type Sender = (message: string) => void;
export interface ViewBridgeOptions {
    /** 状态镜像。 */
    store: ViewMirrorStore;
    /** 时钟注入（测试用）。 */
    now?: () => number;
    /**
     * 宿主能力声明（hello 应答时下发）：`structuredDocument` 为 true 表示
     * dsh-structured-document 集成已激活。客户端据此决定数据源模式。
     */
    capabilities?: {
        structuredDocument?: boolean;
    };
    /**
     * 客户端消息钩子（hello / select-node / current-file）：宿主集成层
     * （如 HostDocumentIntegrator）在此订阅会话事件。
     */
    onMessage?: (sessionId: string, message: ClientToHostMessage) => void;
}
export declare class ViewBridgeServer {
    private options;
    readonly store: ViewMirrorStore;
    private sockets;
    private queues;
    private pending;
    constructor(options: ViewBridgeOptions);
    /** 会话是否至少有一个客户端连接。 */
    isAttached(sessionId: string): boolean;
    /** Optional services may arrive after the first client handshake. */
    updateCapabilities(capabilities: {
        structuredDocument?: boolean;
    }): string[];
    /** 为会话附加一个客户端发送器；返回解除函数。 */
    attach(sessionId: string, sender: Sender): () => void;
    /** 解除一个发送器（幂等）。 */
    detach(sessionId: string, sender: Sender): void;
    /** 路由一条客户端消息。 */
    handleClientMessage(sessionId: string, message: {
        type: string;
        state?: ViewStateWire;
        result?: CommandAck;
    }, origin?: Sender): void;
    /** 宿主 → 客户端单向推送（文档快照 / 选中变化，不等 ack）。 */
    push(sessionId: string, message: HostToClientMessage): void;
    /**
     * 派发一条命令给会话客户端。有连接时等待 ack（`waitMs` 有界超时）；
     * 无连接时入队并立即返回 `{ delivered: false, queued: true }`。
     */
    dispatch(sessionId: string, command: ViewCommand, waitMs?: number): Promise<DispatchOutcome>;
    /** 丢弃某会话的排队命令（teardown）。 */
    drain(sessionId: string): void;
    /** 拒绝并清空所有挂起 ack 等待者与队列（teardown）。 */
    dispose(): void;
    private broadcast;
    private sendHelloAck;
    private enqueue;
    private replay;
    private expectAck;
    private onAck;
}
