/**
 * 表格适配层：把"文档 IR + 视图状态"转换为按角色分组的表格数据。
 *
 * 规则：
 * - 一行 = 一个可见节点；按角色（role）分组展示（同一角色共用一个表头）；
 * - 列 = 标题 + 该角色出现过的属性键（并集）+ 内容摘要；
 * - 展示范围遵循视图状态：filter 过滤；depth 限制层级；
 *   （表格是扁平视图，不应用"收起/展开"语义，见 docs/views.md）。
 *
 * 纯函数，可在 Node 测试中直接验证。
 */
import type { StructuredDocument } from '../../shared/ir.ts';
import type { ViewState } from '../../shared/view-state.ts';
/** 表格行。 */
export interface TableRow {
    id: string;
    role: string;
    title: string;
    content: string;
    properties: Record<string, string | number | boolean>;
    /** 层级（根 = 1）。 */
    level: number;
}
/** 按角色分组的表格。 */
export interface TableGroup {
    role: string;
    rows: TableRow[];
    /** 该角色出现过的属性键（列）。 */
    propertyKeys: string[];
}
/** 表格数据模型。 */
export interface TableViewModel {
    title: string;
    profile: string;
    groups: TableGroup[];
    /** 行总数（去重后的全部可见节点）。 */
    totalRows: number;
}
/** 角色展示名。 */
export declare function roleLabel(role: string): string;
/** 计算表格数据。 */
export declare function toTableViewModel(document: StructuredDocument, state: ViewState): TableViewModel;
/** 导出（供测试与工具输出）。 */
export declare function rowProperty(row: TableRow, key: string): string | number | boolean | undefined;
