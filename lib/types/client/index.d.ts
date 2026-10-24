/**
 * dsh-structured-document-view —— 客户端半区（浏览器）。
 *
 * 仅在 `ctx.betterSidebar` 可用时激活（即 dsh-better-sidebar 已安装）：
 * 软依赖，否则本模块根本不会挂载。
 *
 * 职责：
 * 1. 注册「结构化文档」侧边栏页（通过 SidebarAdapter，复用 better-sidebar
 *    的 Tab / 展示区域 / 生命周期）；
 * 2. 跟随当前活动会话：为该会话创建 ViewRuntime（Mock 文档 + 视图状态），
 *    并连接宿主桥（接收 Tool 命令、推送状态镜像）；
 * 3. 侧边栏页组件渲染当前视图（Markdown / 思维导图 / 表格），
 *    并把用户交互（点击节点、展开收起、缩放平移）写回运行时。
 */
import type { Context } from 'dsh-better-sidebar';
import { VIEW_TAB_TYPE } from './sidebar-adapter.tsx';
/**
 * 客户端半区的服务依赖：仅在 `ctx.betterSidebar` 可用时激活（软依赖，
 * 与 dsh-better-sidebar-controller 客户端入口同款模式）。
 */
export declare const inject: string[];
/** 客户端插件主体。 */
export declare function apply(ctx: Context): void;
/** 导出（文档 / 测试用）。 */
export { VIEW_TAB_TYPE };
