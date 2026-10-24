/**
 * View 状态镜像存储（宿主侧）。
 *
 * 客户端把权威 View State / 文档大纲 / 选中节点镜像到宿主；Tool 从这里
 * 读取状态、判读连接情况。与 dsh-better-sidebar-controller 的
 * ControllerStateStore 同一模式。
 */
import type { ViewStateMirror, ViewStateWire } from '../shared/types.ts';
/** View 状态镜像存储。 */
export declare class ViewMirrorStore {
    private mirrors;
    private listeners;
    /** 客户端推送新状态。 */
    apply(wire: ViewStateWire, now?: number): void;
    /** 会话失去连接。 */
    markDisconnected(sessionId: string, now?: number): void;
    /** 读取某会话的最新镜像；无镜像返回 undefined。 */
    get(sessionId: string): ViewStateMirror | undefined;
    /** 全部镜像（调试 / 测试用）。 */
    snapshot(): ViewStateMirror[];
    subscribe(sessionId: string, listener: (state: ViewStateMirror | undefined) => void): () => void;
    /** 清空（teardown）。 */
    clear(): void;
    private emit;
}
