/**
 * 当前活动文件推导（轻量版）：从 better-sidebar 快照的 `state` 里找出
 * 当前活动的编辑器文件路径。逻辑与 dsh-better-sidebar-controller 的
 * derive.ts 一致（active pane 的 active tab，回退第一个 editor tab）。
 *
 * 用途：把"当前打开的文件"联动给宿主文档服务（dsh-structured-document），
 * 使其按会话绑定结构化文档源文件。
 */
import type { SidebarState, SidebarTab } from 'dsh-better-sidebar/client/service'

/** 递归分栏树的叶子形状（服务未重新导出，结构取型）。 */
type SplitNode = SidebarState['splits']
type SidebarLeaf = Extract<SplitNode, { kind: 'leaf' }>
type SidebarSplit = Extract<SplitNode, { kind: 'split' }>

/** 是否为打开的"文件"标签页（编辑器标签 + 非文件夹窗口）。 */
function isEditorFileTab(tab: SidebarTab): boolean {
  if (tab.type !== 'editor') return false
  if (typeof tab.path !== 'string' || tab.path === '') return false
  const meta = tab.meta as { dir?: unknown } | null | undefined
  if (meta !== null && typeof meta === 'object' && meta.dir === true) return false
  return true
}

/** 一棵分栏树的所有叶子（深度优先，稳定顺序）。 */
function leavesOf(node: SplitNode): SidebarLeaf[] {
  if (node.kind === 'leaf') return [node]
  return (node as SidebarSplit).children.flatMap(leavesOf)
}

/** 右侧面板与底部面板的全部叶子。 */
function allLeaves(state: SidebarState): SidebarLeaf[] {
  return [...leavesOf(state.splits), ...leavesOf(state.bottomSplits)]
}

/** 当前活动的编辑器文件路径；无则 null。 */
export function activeFileOf(state: SidebarState | undefined): string | null {
  if (state === undefined) return null
  const leaves = allLeaves(state)
  // 优先活动 pane 的活动 tab；回退第一个叶子。
  const activeLeaf = leaves.find(leaf => leaf.id === state.activePane) ?? leaves[0]
  if (activeLeaf !== undefined && activeLeaf.active !== null) {
    const tab = activeLeaf.tabs.find(t => t.id === activeLeaf.active)
    if (tab !== undefined && isEditorFileTab(tab)) return tab.path as string
  }
  for (const leaf of leaves) {
    if (leaf.active === null) continue
    const tab = leaf.tabs.find(t => t.id === leaf.active)
    if (tab !== undefined && isEditorFileTab(tab)) return tab.path as string
  }
  return null
}
