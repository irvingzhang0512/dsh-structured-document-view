import type { ViewCommand } from './types.ts'

export type GuideLevel = 'simple' | 'combined'

export interface ViewGuideEntry {
  id: string
  level: GuideLevel
  phrase: string
  description: string
  commands: ViewCommand[]
  needsSelection?: boolean
  needsTarget?: boolean
  views?: Array<'markdown' | 'mindmap' | 'table'>
}

/** UI 与 get_view_help 共用的自然语言指令目录。 */
export const VIEW_COMMAND_GUIDE: readonly ViewGuideEntry[] = [
  { id: 'find-current', level: 'simple', phrase: '找到当前节点', description: '节点看不全时移入可视范围。', commands: [{ name: 'focus_node', mode: 'visible' }], needsSelection: true, views: ['mindmap'] },
  { id: 'center-current', level: 'simple', phrase: '把当前节点移到中间', description: '将当前节点放到画布中央。', commands: [{ name: 'focus_node', mode: 'center' }], needsSelection: true, views: ['mindmap'] },
  { id: 'fit', level: 'simple', phrase: '显示全图', description: '适配当前已经显示的全部内容。', commands: [{ name: 'fit_view' }], views: ['mindmap'] },
  { id: 'zoom-in', level: 'simple', phrase: '放大一点', description: '在当前比例上放大 25%。', commands: [{ name: 'set_zoom', factor: 1.25 }], views: ['mindmap'] },
  { id: 'zoom-out', level: 'simple', phrase: '缩小一点', description: '在当前比例上缩小 20%。', commands: [{ name: 'set_zoom', factor: 0.8 }], views: ['mindmap'] },
  { id: 'reset-viewport', level: 'simple', phrase: '重置视口', description: '恢复 100%，并将根节点居中。', commands: [{ name: 'reset_viewport' }], views: ['mindmap'] },
  { id: 'right-layout', level: 'simple', phrase: '节点全部放到右边', description: '切换为右侧单向布局。', commands: [{ name: 'set_layout', layout: 'logical' }], views: ['mindmap'] },
  { id: 'two-levels', level: 'simple', phrase: '只显示两层', description: '将显示深度限制为两层。', commands: [{ name: 'set_depth', depth: 2 }] },
  { id: 'expand-current', level: 'simple', phrase: '展开当前节点', description: '显示当前节点的子节点。', commands: [{ name: 'expand_node' }], needsSelection: true },
  { id: 'collapse-current', level: 'simple', phrase: '收起当前节点', description: '隐藏当前节点的子节点。', commands: [{ name: 'collapse_node' }], needsSelection: true },
  { id: 'mindmap', level: 'simple', phrase: '切成思维导图', description: '查看文档结构。', commands: [{ name: 'set_view', view: 'mindmap' }] },
  { id: 'open-current', level: 'simple', phrase: '打开当前章节', description: '在阅读器中显示当前节点及其全部子节点。', commands: [{ name: 'open_node' }], needsSelection: true },
  { id: 'whole-document', level: 'simple', phrase: '查看全文', description: '显示整篇文档并定位当前节点。', commands: [{ name: 'set_reader_mode', mode: 'document' }] },
  { id: 'next-section', level: 'simple', phrase: '下一节', description: '打开同一父节点下的下一个章节。', commands: [{ name: 'navigate_section', direction: 'next' }], needsSelection: true },
  { id: 'reset-view', level: 'simple', phrase: '恢复默认视图', description: '恢复默认视图设置并保留当前节点。', commands: [{ name: 'reset_view' }] },
  { id: 'right-two-fit', level: 'combined', phrase: '切成右侧思维导图，只显示两层，再显示全图', description: '依次切换视图、布局、层级并适配画布。', commands: [{ name: 'set_view', view: 'mindmap' }, { name: 'set_layout', layout: 'logical' }, { name: 'set_depth', depth: 2 }, { name: 'fit_view' }] },
  { id: 'expand-center', level: 'combined', phrase: '展开当前节点，再把它移到中间', description: '展开并居中当前节点。', commands: [{ name: 'expand_node' }, { name: 'focus_node', mode: 'center' }], needsSelection: true },
  { id: 'clear-find-target', level: 'combined', phrase: '清除筛选，切成思维导图，再找到〈节点标题〉', description: '选择目标后清除筛选并定位。', commands: [{ name: 'set_filter', filter: null }, { name: 'set_view', view: 'mindmap' }], needsTarget: true },
] as const

export function guideEntries(level: GuideLevel = 'simple'): ViewGuideEntry[] {
  return VIEW_COMMAND_GUIDE.filter(entry => entry.level === level).map(entry => ({ ...entry, commands: [...entry.commands] }))
}
