/**
 * ViewSessionManager（会话管理器）：按会话维护 {@link ViewRuntime} 与
 * {@link ViewBridgeClient}。
 *
 * - 每个会话懒创建独立运行时（各自的 Mock 文档与视图状态，互不串扰）；
 * - 只连接"当前活动会话"的桥（与 controller 的桥接模式一致），
 *   切换会话时关闭旧连接、打开新连接。
 */
import { ViewRuntime } from './runtime.ts';
import type { ViewDefaults } from '../shared/view-settings.ts';
/** 会话管理器（模块级单例，由客户端 apply 初始化）。 */
export declare class ViewSessionManager {
    private readonly runtimes;
    private readonly clients;
    private activeSessionId;
    private disposed;
    /** 「打开结构化文档页签」回调（open_tab 命令执行时调用；由 apply 注入）。 */
    private openTabHandler;
    /**
     * 「侧边卡片配置默认值」读取器（SPEC F011；由 apply 注入适配层实现）。
     * 未注入时运行时用内置默认（软依赖回退）。
     */
    private readViewDefaults;
    /** 注入打开视图页签的回调（客户端 apply 创建 adapter 后设置）。 */
    setOpenTabHandler(handler: () => void): void;
    /**
     * 注入配置默认值读取器（客户端 apply 创建 adapter 后设置）。
     * 必须在创建运行时之前注入：运行时的初始视图状态只在构造时读取一次。
     */
    setViewDefaultsReader(reader: () => ViewDefaults): void;
    /** 获取（必要时创建）某会话的运行时。 */
    ensureRuntime(sessionId: string): ViewRuntime;
    /** 获取某会话的运行时；不存在返回 undefined。 */
    getRuntime(sessionId: string): ViewRuntime | undefined;
    /** 设置当前活动会话：连接其桥（幂等）。 */
    setActiveSession(sessionId: string): void;
    /** 释放某会话的运行时与连接。 */
    disposeSession(sessionId: string): void;
    /** 释放全部。 */
    disposeAll(): void;
    private clientFor;
}
