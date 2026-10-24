import type { DispatchOutcome, ViewCommand, ViewCode } from '../shared/types.ts';
import type { ViewMirrorStore } from '../host/mirror-store.ts';
/** 全部工具名（SKILL / docs 契约测试用）。 */
export declare const VIEW_TOOL_NAMES: readonly ["set_view", "get_view_state", "expand_node", "collapse_node", "focus_node", "open_node", "set_reader_mode", "navigate_section", "set_zoom", "fit_view", "reset_viewport", "get_view_help", "set_depth", "set_layout", "set_filter", "reset_view", "open_view_tab"];
export type ViewToolName = (typeof VIEW_TOOL_NAMES)[number];
/** 桥的最小面（ViewBridgeServer 的子集）。 */
export interface ViewBridge {
    isAttached(sessionId: string): boolean;
    dispatch(sessionId: string, command: ViewCommand, waitMs?: number): Promise<DispatchOutcome>;
}
/** 工具需要的宿主依赖（可注入测试）。 */
export interface ViewToolDeps {
    mirror: ViewMirrorStore;
    bridge: ViewBridge;
    /** 命令等待客户端 ack 的超时。 */
    ackTimeoutMs?: number;
}
/** 基础结果信封。 */
export interface BaseResult {
    ok: boolean;
    code: ViewCode;
    message: string;
}
/** 注册全部视图工具；返回组合 disposer。 */
export declare function registerViewTools(ctx: {
    tools: {
        register(tool: unknown): () => void;
    };
}, deps: ViewToolDeps): () => void;
