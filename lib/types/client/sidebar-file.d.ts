/**
 * 当前活动文件推导（轻量版）：从 better-sidebar 快照的 `state` 里找出
 * 当前活动的编辑器文件路径。逻辑与 dsh-better-sidebar-controller 的
 * derive.ts 一致（active pane 的 active tab，回退第一个 editor tab）。
 *
 * 用途：把"当前打开的文件"联动给宿主文档服务（dsh-structured-document），
 * 使其按会话绑定结构化文档源文件。
 */
import type { SidebarState } from 'dsh-better-sidebar/client/service';
/** 当前活动的编辑器文件路径；无则 null。 */
export declare function activeFileOf(state: SidebarState | undefined): string | null;
