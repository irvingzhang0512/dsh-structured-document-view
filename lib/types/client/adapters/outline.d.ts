/**
 * 大纲适配层：把文档 IR 折叠成紧凑大纲（供 `get_view_state` 返回给 Agent，
 * 以便 Agent 从大纲中解析 Node ID 再调用 expand/collapse/focus 等工具）。
 */
import type { StructuredDocument } from '../../shared/ir.ts';
import type { OutlineNode } from '../../shared/types.ts';
/** 大纲最大深度与最大节点数（防止输出过大撑爆工具结果）。 */
export declare const OUTLINE_MAX_DEPTH = 8;
export declare const OUTLINE_MAX_NODES = 200;
/** 计算大纲。 */
export declare function toOutline(document: StructuredDocument): {
    outline: OutlineNode[];
    truncated: boolean;
};
