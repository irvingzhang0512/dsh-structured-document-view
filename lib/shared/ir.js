/**
 * 结构化文档 IR（Document IR）类型定义。
 *
 * 本文件定义 View 插件依赖的"结构化文档中间表示"，字段与未来
 * `dsh-structured-document` 插件的 `DocNode` / `StructuredDocument`
 * 保持一致（见 dsh-structured-document/src/model/types.ts），
 * 以便未来仅替换 Document Provider / Document Bridge 即可无缝对接，
 * Renderer、View Tool、View Skill 无需重写。
 *
 * 注意：View 插件只读这份 IR，绝不直接修改它 —— 数据真源在
 * `dsh-structured-document`（当前阶段为 Mock Provider）。
 */
/** 内置场景模板 id（与 dsh-structured-document 的 profile 对齐）。 */
export const BUILTIN_PROFILE_IDS = ['meeting', 'project', 'thinking'];
/** 场景模板 id 的中文名（用于展示与文档）。 */
export const PROFILE_LABELS = {
    meeting: '会议纪要',
    project: '项目管理',
    thinking: '思路整理',
};
