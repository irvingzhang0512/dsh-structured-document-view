/**
 * WebSocket ↔ 桥接适配：把一条 `ws` 连接包装成桥的最小发送器，
 * 并把解码后的消息路由回桥。畸形消息直接丢弃（连接保持存活）；
 * 关闭或出错时解除发送器。
 */
import { WebSocket } from 'ws';
import type { ViewBridgeServer } from './bridge-server.ts';
import type { ClientToHostMessage } from '../shared/types.ts';
/** 把一条 WebSocket 附加为某会话的桥接发送器。 */
export declare function attachSocket(bridge: ViewBridgeServer, ws: WebSocket, sessionId: string, parse: (text: string) => ClientToHostMessage): void;
