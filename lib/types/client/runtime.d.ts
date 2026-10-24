/**
 * ViewRuntime（视图会话运行时）：一个会话的"文档 + 视图状态"聚合体。
 *
 * 组装 MockDocumentProvider → DocumentBridge → ViewStateStore，并承担：
 * - 执行来自宿主 Tool 的 ViewCommand（只改 View State，不改文档 IR）；
 * - 回应用户在视图中的交互（点击节点 → select_node 同步给文档侧；
 *   展开/收起 → 更新视图状态）；
 * - 把"视图状态 + 文档大纲 + 选中节点"推送到宿主镜像。
 *
 * 未来替换数据源：仅换 Provider 实现，本运行时其余逻辑不变。
 */
import { MockDocumentProvider } from '../document/mock-provider.ts';
import { EmptyDocumentProvider } from '../document/empty-provider.ts';
import { DocumentBridge } from '../document/document-bridge.ts';
import { HostBackedDocumentProvider, type HostDocumentPush } from './document/host-backed-provider.ts';
import type { NodeId } from '../shared/ir.ts';
import type { ClientToHostMessage, ViewCommand, ViewStateWire } from '../shared/types.ts';
import { type ViewState } from '../shared/view-state.ts';
import { type ViewDefaults } from '../shared/view-settings.ts';
import { ViewStateStore } from './view-state-store.ts';
/** 命令执行结果（ack 载荷）。 */
export interface CommandAckPayload {
    ok: boolean;
    code: string;
    message: string;
    value?: Record<string, unknown>;
}
/** 状态推送目标（宿主桥连接）。 */
export interface RuntimePushTarget {
    (wire: ViewStateWire): void;
}
/** 桥消息发送目标（select-node / current-file 等上行消息）。 */
export interface RuntimeBridgeSend {
    (message: ClientToHostMessage): void;
}
/** 由已挂载的思维导图提供；命令完成代表画布已经实际更新。 */
export interface MindMapViewportController {
    focusNode(nodeId: NodeId, mode: 'visible' | 'center'): Promise<CommandAckPayload>;
    setZoom(command: {
        zoom?: number;
        factor?: number;
    }): Promise<CommandAckPayload>;
    fitView(): Promise<CommandAckPayload>;
    resetViewport(): Promise<CommandAckPayload>;
}
/**
 * 数据源状态（SPEC F010）：`connecting` = 尚未收到宿主 hello-ack；
 * `host` = 宿主声明有文档内核；`mock` = 宿主明确声明无内核（示例数据）。
 * 状态单向：`connecting → host | mock`，不在 host / mock 之间互换。
 */
export type DocumentSource = 'connecting' | 'host' | 'mock';
/** 视图会话运行时。 */
export declare class ViewRuntime {
    readonly mockProvider: MockDocumentProvider;
    readonly hostProvider: HostBackedDocumentProvider;
    /** `connecting` 阶段的占位数据源（文档恒为 null）。 */
    readonly emptyProvider: EmptyDocumentProvider;
    bridge: DocumentBridge;
    readonly store: ViewStateStore;
    private readonly sessionId;
    private readonly pushTarget;
    private readonly sendBridgeMessage;
    /** 打开「结构化文档」侧边栏页签的回调（由客户端 apply 注入）。 */
    private readonly openTab;
    /**
     * 读取当前侧边卡片配置默认值（SPEC F011）。构造时读一次作为本运行时的初始
     * 视图状态（A5：已存在会话不因之后改配置而变化）；`reset_view` 调用时重新读取，
     * 因此重置采用"此刻的配置"（A9）。缺省为内置默认（软依赖回退）。
     */
    private readonly readDefaults;
    /** 数据源状态（SPEC F010）；握手前 `connecting`，初始不是 Mock。 */
    private source;
    private pushTimer;
    private disposed;
    private readonly unsubscribers;
    private readonly runtimeListeners;
    private viewportController;
    private viewportWaiters;
    constructor(sessionId: string, pushTarget: RuntimePushTarget, sendBridgeMessage?: RuntimeBridgeSend, activeDocumentId?: string, openTab?: () => void, readDefaults?: () => ViewDefaults);
    /** 订阅运行时级变化（文档源切换等）；返回退订函数。 */
    subscribe(listener: () => void): () => void;
    /** 数据源状态（SPEC F010）。 */
    getSource(): DocumentSource;
    /** 是否使用宿主文档数据源（dsh-structured-document 集成激活）。 */
    isHostMode(): boolean;
    /** 是否处于示例数据模式（宿主明确声明无文档内核）。 */
    isMockMode(): boolean;
    /**
     * 宿主能力声明（hello 应答）：
     * - `structuredDocument: true` → 切宿主数据源；
     * - `false` → 宿主明确表示没有文档内核，才允许进示例数据模式；
     * - 两者都只在 `connecting` 阶段生效（状态单向，不回退、不互换）。
     */
    applyCapabilities(capabilities: {
        structuredDocument: boolean;
    }): void;
    /** 宿主文档快照推送：切换数据源（connecting/mock → 宿主）并刷新视图。 */
    applyHostDocument(push: HostDocumentPush): void;
    /** 宿主选中变化推送。 */
    applyHostSelection(nodeId: NodeId | null): void;
    /** 当前文件联动：把 better-sidebar 快照的当前文件同步给宿主文档服务。 */
    sendCurrentFile(path: string | null): void;
    /** 当前文件（宿主模式）；未绑定 null。 */
    get currentFile(): string | null;
    /**
     * 切换数据源：重建 bridge（指向对应 Provider）并重新对齐选中、推送镜像。
     * 只在状态机的合法迁移上调用（见 {@link applyCapabilities}）。
     */
    private switchSource;
    private attachBridge;
    private emitRuntimeChange;
    /** 执行一条 ViewCommand；返回 ack 载荷。 */
    applyCommand(command: ViewCommand): CommandAckPayload;
    /** 桥和界面使用的异步入口：视口类命令等待实际画布操作完成。 */
    applyCommandAsync(command: ViewCommand): Promise<CommandAckPayload>;
    registerViewportController(controller: MindMapViewportController): () => void;
    private waitForViewport;
    private hiddenNodeMessage;
    private applySetView;
    private applyNodeToggle;
    private applyFocus;
    private applyOpenNode;
    private applyReaderMode;
    private applyNavigateSection;
    private applySetDepth;
    private applySetLayout;
    private applySetFilter;
    private applyReset;
    /** 用户点击节点：同步给文档侧（select_node）并更新视图状态。 */
    handleUserSelectNode(nodeId: NodeId): void;
    /** 从大纲、概览或导图预览进入章节阅读。 */
    handleUserOpenNode(nodeId: NodeId): void;
    /** 大纲折叠只影响导航树。 */
    handleUserToggleOutlineNode(nodeId: NodeId): void;
    /** 用户在思维导图点击展开/收起按钮：更新视图状态。 */
    handleUserToggleNode(nodeId: NodeId): void;
    /** 用户缩放/平移思维导图：回写视图状态（pan 为增量）。 */
    applyViewStateChange(patch: {
        zoom?: number;
        pan?: {
            x: number;
            y: number;
        };
    }): void;
    /** 切换 Mock 文档（示例数据专属；仅 `mock` 状态可用）。 */
    setActiveDocument(documentId: string): {
        ok: boolean;
        message: string;
    };
    /** 构建状态 wire（视图状态 + 文档信息 + 大纲 + 选中）。 */
    buildWire(): ViewStateWire;
    /** 立即推送（命令执行后）。 */
    pushNow(): void;
    /** 去抖推送（文档/交互高频变化）。 */
    private schedulePush;
    /** 选中失效时清理（文档变化后选中节点可能不存在）。 */
    private reconcileSelection;
    private selectedTitle;
    /** 释放运行时。 */
    dispose(): void;
}
/** 导出类型（工具输出用）。 */
export type { NodeId, ViewState };
