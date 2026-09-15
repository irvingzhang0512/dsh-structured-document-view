/**
 * 表格视图（Table View）：按角色分组展示节点与属性。
 */
import { roleLabel, toTableViewModel, rowProperty } from '../adapters/table.ts'
import type { ViewRuntime } from '../runtime.ts'
import type { ViewState } from '../../shared/view-state.ts'

/** 表格视图组件。 */
export function TableView({ runtime, state }: { runtime: ViewRuntime; state: ViewState }): React.ReactElement {
  const document = runtime.bridge.getDocument()
  if (document === null) {
    return <div className="sdv-empty">当前没有可展示的文档。</div>
  }
  const model = toTableViewModel(document, state)
  if (model.totalRows === 0) {
    return <div className="sdv-empty">当前筛选下没有可展示的行。</div>
  }
  return (
    <div className="sdv-table-scroll">
      <div className="sdv-table-summary">共 {model.totalRows} 行 · 按角色分组{state.filter !== null ? '（已筛选）' : ''}</div>
      {model.groups.map(group => (
        <section key={group.role} className="sdv-table-group">
          <h3 className="sdv-table-group-title">{roleLabel(group.role)}</h3>
          <table className="sdv-table">
            <thead>
              <tr>
                <th>标题</th>
                {group.propertyKeys.map(key => <th key={key}>{key}</th>)}
                <th>内容</th>
                <th>层级</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map(row => (
                <tr key={row.id} className={row.id === state.selectedNodeId ? 'sdv-row-selected' : ''} onClick={() => runtime.handleUserSelectNode(row.id)}>
                  <td className="sdv-cell-title">{row.title}</td>
                  {group.propertyKeys.map(key => <td key={key}>{String(rowProperty(row, key) ?? '')}</td>)}
                  <td className="sdv-cell-content">{row.content}</td>
                  <td className="sdv-cell-level">{row.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  )
}
