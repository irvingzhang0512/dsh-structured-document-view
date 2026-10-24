/**
 * 轻量 Markdown → React 渲染器（自包含）。
 *
 * 设计决策：DSH 客户端插件 bundle 相互隔离（禁止跨插件 value import），
 * 无法直接复用 dsh-better-sidebar 内部的 marked 实例；为独立发布与零额外
 * 依赖，V0.1 提供覆盖结构化文档常见语法的轻量实现：
 * 标题 / 段落 / 无序列表 / 任务列表 / 有序列表 / 行内代码 / 粗体 / 斜体 /
 * 行内链接 / 代码块 / 表格 / 分隔线。超出范围的文本按原文展示。
 *
 * 不解析 HTML（安全考虑：一律按文本展示）。
 */
import { type ReactNode } from 'react';
/** 渲染一段 Markdown 文本。 */
export declare function renderMarkdown(markdown: string): ReactNode;
