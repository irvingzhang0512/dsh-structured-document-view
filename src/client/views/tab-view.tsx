/**
 * TabView（结构化文档视图页）：better-sidebar 侧边栏页的根组件。
 *
 * 顶部工具栏：视图切换 / 文档切换（Mock）/ 层级 / 布局 / 筛选 / 重置；
 * 内容区：按当前视图渲染 Markdown / 思维导图 / 表格。
 * 用户交互全部走 ViewRuntime（更新视图状态并镜像到宿主）。
 */
import { useSyncExternalStore } from 'react'
import type { TabComponentProps } from 'dsh-better-sidebar'
import { getSessionManager } from '../index.ts'
import type { ViewRuntime } from '../runtime.ts'
import type { ViewState } from '../../shared/view-state.ts'
import { LAYOUT_LABELS, MIND_MAP_LAYOUTS, VIEW_LABELS, VIEW_NAMES } from '../../shared/view-state.ts'
import { toMindMapViewModel } from '../adapters/mindmap.ts'
import { MarkdownView } from './markdown-view.tsx'
import { MindMapView } from './mindmap-view.tsx'
import { TableView } from './table-view.tsx'

/** 每个视图的订阅集合（无变化即无重渲染）。 */
function subscribeToRuntime(runtime: ViewRuntime | undefined, callback: () => void): () => void {
  if (runtime === undefined) return () => undefined
  const offStore = runtime.store.subscribe(callback)
  const offBridge = runtime.bridge.subscribe(callback)
  const offRuntime = runtime.subscribe(callback)
  return () => {
    offStore()
    offBridge()
    offRuntime()
  }
}

/** TabView 组件。 */
export function TabView(props: TabComponentProps): React.ReactElement {
  const { scope, visible } = props
  const manager = getSessionManager()
  const runtime = manager?.getRuntime(scope.sessionId)

  // 订阅运行时状态（视图状态 + 文档变化）。
  useSyncExternalStore(
    (callback) => subscribeToRuntime(runtime, callback),
    () => (runtime === undefined ? 0 : runtime.store.getState()),
    () => (runtime === undefined ? 0 : runtime.store.getState()),
  )

  if (!visible) {
    return <div className="sdv-tab" />
  }
  if (runtime === undefined) {
    return <div className="sdv-empty">正在连接视图会话…</div>
  }

  return <ViewPanel runtime={runtime} />
}

/** 视图面板（工具栏 + 内容区）。 */
function ViewPanel({ runtime }: { runtime: ViewRuntime }): React.ReactElement {
  const state = runtime.store.getState()
  const document = runtime.bridge.getDocument()
  const selected = runtime.bridge.getSelectedNode()

  const switchView = (view: typeof VIEW_NAMES[number]): void => {
    runtime.applyCommand({ name: 'set_view', view })
  }
  const resetView = (): void => {
    runtime.applyCommand({ name: 'reset_view' })
  }

  return (
    <div className="sdv-tab">
      <div className="sdv-toolbar">
        {/* 视图切换 */}
        <div className="sdv-toolbar-group" role="group" aria-label="视图切换">
          {VIEW_NAMES.map(view => (
            <button
              key={view}
              type="button"
              className={`sdv-btn ${state.currentView === view ? 'sdv-btn-active' : ''}`}
              onClick={() => switchView(view)}
              title={VIEW_LABELS[view]}
            >
              {VIEW_LABELS[view]}
            </button>
          ))}
        </div>

        {/* 文档切换（仅 Mock 数据源阶段显示；宿主集成后隐藏） */}
        {!runtime.isHostMode() && (
          <div className="sdv-toolbar-group" role="group" aria-label="文档切换">
            <select
              className="sdv-select"
              value={runtime.mockProvider.getActiveDocumentId()}
              onChange={(event) => runtime.setActiveDocument(event.target.value)}
              title="切换示例文档（Mock Provider）"
            >
              {runtime.mockProvider.listDocuments().map(doc => (
                <option key={doc.id} value={doc.id}>{doc.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* 层级 */}
        <div className="sdv-toolbar-group" role="group" aria-label="显示层级">
          <select
            className="sdv-select"
            value={state.depth === null ? 0 : state.depth}
            onChange={(event) => {
              const depth = Number(event.target.value)
              runtime.applyCommand({ name: 'set_depth', depth: depth === 0 ? null : depth })
            }}
            title="显示层级（0 = 不限）"
          >
            <option value={0}>不限层级</option>
            <option value={1}>1 层</option>
            <option value={2}>2 层</option>
            <option value={3}>3 层</option>
            <option value={4}>4 层</option>
            <option value={5}>5 层</option>
          </select>
        </div>

        {/* 布局（思维导图） */}
        {state.currentView === 'mindmap' && (
          <div className="sdv-toolbar-group" role="group" aria-label="思维导图布局">
            <select
              className="sdv-select"
              value={state.layout}
              onChange={(event) => runtime.applyCommand({ name: 'set_layout', layout: event.target.value as typeof MIND_MAP_LAYOUTS[number] })}
              title="思维导图布局"
            >
              {MIND_MAP_LAYOUTS.map(layout => (
                <option key={layout} value={layout}>{LAYOUT_LABELS[layout]}</option>
              ))}
            </select>
          </div>
        )}

        {/* 筛选 */}
        <div className="sdv-toolbar-group" role="group" aria-label="筛选">
          <select
            className="sdv-select"
            value={state.filter?.role ?? ''}
            onChange={(event) => {
              const role = event.target.value
              runtime.applyCommand({ name: 'set_filter', filter: role === '' ? null : { role } })
            }}
            title="按角色筛选"
          >
            <option value="">无筛选</option>
            {documentRoles(document).map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        <button type="button" className="sdv-btn" onClick={resetView} title="恢复默认视图">恢复默认</button>
      </div>

      {/* 当前节点信息 */}
      <div className="sdv-statusbar">
        <span className="sdv-status-doc">
          {document === null ? '无文档' : `${document.title}`}
          {document !== null && (
            <span className="sdv-status-meta">
              {runtime.isHostMode()
                ? `（结构化文档 · ${baseName(runtime.currentFile)} · revision ${document.revision}）`
                : `（${runtime.mockProvider.getActiveDocumentLabel()} · revision ${document.revision} · ${runtime.mockProvider.displayName}）`}
            </span>
          )}
          {document === null && runtime.isHostMode() && (
            <span className="sdv-status-meta">（在侧边栏打开一个 Markdown 结构化文档）</span>
          )}
        </span>
        <span className="sdv-status-selected">
          当前节点：{selected !== null ? `${selected.title}（${selected.id}）` : '（无）'}
        </span>
      </div>

      <div className="sdv-content">
        <ContentView runtime={runtime} state={state} />
      </div>
    </div>
  )
}

/** 内容区：按当前视图渲染。 */
function ContentView({ runtime, state }: { runtime: ViewRuntime; state: ViewState }): React.ReactElement {
  switch (state.currentView) {
    case 'mindmap': {
      const document = runtime.bridge.getDocument()
      if (document === null) return <div className="sdv-empty">当前没有可展示的文档。</div>
      const model = toMindMapViewModel(document, state)
      return (
        <MindMapView
          model={model}
          state={state}
          onSelectNode={(nodeId) => runtime.handleUserSelectNode(nodeId)}
          onToggleNode={(nodeId) => runtime.handleUserToggleNode(nodeId)}
          onViewStateChange={(patch) => runtime.applyViewStateChange(patch)}
        />
      )
    }
    case 'table':
      return <TableView runtime={runtime} state={state} />
    case 'markdown':
    default:
      return <MarkdownView runtime={runtime} state={state} />
  }
}

/** 收集文档中出现过的角色（用于筛选下拉）。 */
function documentRoles(document: { root: { role: string; children: unknown[] } } | null): string[] {
  if (document === null) return []
  const roles: string[] = []
  const visit = (node: { role: string; children: unknown[] }): void => {
    if (node.role !== '' && !roles.includes(node.role)) roles.push(node.role)
    for (const child of node.children as Array<{ role: string; children: unknown[] }>) visit(child)
  }
  visit(document.root)
  return roles
}

/** 取路径最后一段（状态栏展示）。 */
function baseName(path: string | null): string {
  if (path === null || path === '') return '（未绑定）'
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] ?? path
}
