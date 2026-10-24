/**
 * WebSocket ↔ 桥接适配：把一条 `ws` 连接包装成桥的最小发送器，
 * 并把解码后的消息路由回桥。畸形消息直接丢弃（连接保持存活）；
 * 关闭或出错时解除发送器。
 */
import { WebSocket } from 'ws';
/** 把一条 WebSocket 附加为某会话的桥接发送器。 */
export function attachSocket(bridge, ws, sessionId, parse) {
    const sender = (message) => {
        if (ws.readyState === WebSocket.OPEN)
            ws.send(message);
    };
    const detach = bridge.attach(sessionId, sender);
    ws.on('message', (data) => {
        const text = data.toString();
        try {
            bridge.handleClientMessage(sessionId, parse(text), sender);
        }
        catch {
            // 畸形消息：丢弃，保持连接。
        }
    });
    ws.on('close', () => detach());
    ws.on('error', () => detach());
}
