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

/** 节点唯一标识（稳定：改标题、移动都不变），形如 `node_001`。 */
export type NodeId = string

/** 节点属性的值类型。 */
export type PropertyValue = string | number | boolean

/** 节点属性表（如负责人、状态、进度）。 */
export type NodeProperties = Record<string, PropertyValue>

/**
 * 文档节点。字段与 dsh-structured-document 的 DocNode 一致。
 * `metadata` 等未来字段不属于 View 渲染所需，类型上允许额外字段
 * （结构化类型），因此未来替换数据源时无需改动本类型。
 */
export interface DocNode {
  /** 节点唯一标识（稳定）。 */
  id: NodeId
  /** 标题，可为空串。 */
  title: string
  /** 内容：普通文本或简单 Markdown。 */
  content: string
  /** 角色，须属于当前 profile 的角色表（如 task / topic / solution）。 */
  role: string
  /** 属性表。 */
  properties: NodeProperties
  /** 子节点。 */
  children: DocNode[]
}

/**
 * 结构化文档。字段与 dsh-structured-document 的 StructuredDocument 一致。
 */
export interface StructuredDocument {
  /** 文档唯一标识。 */
  id: string
  /** 文档标题（与根节点标题一致）。 */
  title: string
  /** 场景模板标识（meeting / project / thinking）。 */
  profile: string
  /** 根节点（文档标题本身也是节点）。 */
  root: DocNode
  /** 版本号：每次成功保存的修改 +1。 */
  revision: number
}

/** 内置场景模板 id（与 dsh-structured-document 的 profile 对齐）。 */
export const BUILTIN_PROFILE_IDS = ['meeting', 'project', 'thinking'] as const

/** 场景模板 id 的中文名（用于展示与文档）。 */
export const PROFILE_LABELS: Record<string, string> = {
  meeting: '会议纪要',
  project: '项目管理',
  thinking: '思路整理',
}
