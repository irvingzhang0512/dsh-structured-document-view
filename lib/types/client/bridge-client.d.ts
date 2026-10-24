/**
 * 视图桥客户端（浏览器侧）：连接宿主 `/structured-document-view/ws`，
 * 接收 ViewCommand、宿主文档/选中推送，回执执行结果、推送状态镜像。
 *
 * 仅连接当前活动会话；连接断开后按指数退避自动重连（2s 起，翻倍至 30s
 * 封顶，不设次数上限）——DSH 重启 / 插件热重载 / 网络抖动后只要页面还
 * 开着，连接最终自愈，避免客户端永久停留在 Mock 数据源。
 */
import type { BridgeClientHandlerSet, ClientToHostMessage, ViewStateWire } from '../shared/types.ts';
/** 桥客户端处理器。 */
export type BridgeClientHandlers = BridgeClientHandlerSet;
/** 视图桥客户端。 */
export declare class ViewBridgeClient {
    private readonly sessionId;
    private readonly handlers;
    private socket;
    private retryTimer;
    private closed;
    private failures;
    private attached;
    constructor(sessionId: string, handlers: BridgeClientHandlers);
    /** 开始连接（幂等；退避等待期不提前重试，由退避定时器接管）。 */
    connect(): void;
    /** 推送一条状态镜像到宿主。 */
    sendWire(wire: ViewStateWire): void;
    /** 推送选中节点同步到宿主（select-node）。 */
    sendSelectNode(nodeId: string | null): void;
    /** 推送当前文件同步到宿主（current-file）。 */
    sendCurrentFile(path: string | null): void;
    /** 发送任意客户端 → 宿主消息（测试/扩展用）。 */
    sendMessage(message: ClientToHostMessage): void;
    /** 是否已连接。 */
    isConnected(): boolean;
    /** 关闭连接（不再重连）。 */
    close(): void;
    private open;
    private send;
    private scheduleReconnect;
    /** 供宿主判断（测试用）。 */
    get attachedSession(): string;
}
