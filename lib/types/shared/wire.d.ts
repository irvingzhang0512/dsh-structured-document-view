/**
 * View 桥接的 wire 编码 / 解码。
 *
 * 消息是小 JSON 文档；解码严格校验信封（防御畸形或伪造流量），失败抛
 * {@link WireError}，调用方丢弃该消息并保持连接。
 * 本模块被宿主（Node）与客户端（浏览器）共享。
 */
import type { ClientToHostMessage, CommandAck, HostToClientMessage, ViewCommand, ViewStateWire } from './types.ts';
/** wire 解析失败。 */
export declare class WireError extends Error {
    constructor(message: string);
}
/** 校验一个命令（{@link ViewCommand} 的形状）。 */
export declare function parseCommand(raw: unknown): ViewCommand;
/** 解码一条客户端 → 宿主消息。 */
export declare function parseClientMessage(text: string): ClientToHostMessage;
/** 解码一条宿主 → 客户端消息。 */
export declare function parseHostMessage(text: string): HostToClientMessage;
/** 编码一条宿主 → 客户端命令消息。 */
export declare function encodeHostCommand(id: string, command: ViewCommand): string;
/** 编码一条宿主 → 客户端文档快照推送。 */
export declare function encodeHostDocument(message: import('./types.ts').HostDocumentMessage): string;
/** 编码一条宿主 → 客户端选中变化推送。 */
export declare function encodeHostSelection(message: import('./types.ts').HostSelectionMessage): string;
/** 编码一条宿主 → 客户端 hello 应答（能力协商）。 */
export declare function encodeHostHelloAck(ack: import('./types.ts').HostHelloAckMessage): string;
/** 编码一条客户端 → 宿主状态推送。 */
export declare function encodeClientState(state: ViewStateWire): string;
/** 编码一条客户端 → 宿主确认。 */
export declare function encodeAck(result: CommandAck): string;
/** 编码一条客户端 → 宿主 hello。 */
export declare function encodeHello(sessionId: string): string;
/** 编码一条客户端 → 宿主选中同步（select-node）。 */
export declare function encodeClientSelectNode(nodeId: string | null): string;
/** 编码一条客户端 → 宿主当前文件同步（current-file）。 */
export declare function encodeClientCurrentFile(path: string | null): string;
