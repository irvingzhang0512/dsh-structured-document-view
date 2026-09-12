import { useMemo, useState } from 'react'
import type { StructuredDocument } from '../../shared/ir.ts'
import type { ViewState } from '../../shared/view-state.ts'
import { VIEW_COMMAND_GUIDE, type ViewGuideEntry } from '../../shared/command-guide.ts'
import type { ViewRuntime } from '../runtime.ts'

interface NodeOption { id: string; label: string }

function nodeOptions(document: StructuredDocument | null): NodeOption[] {
  if (document === null) return []
  const result: NodeOption[] = []
  const visit = (node: StructuredDocument['root'], parents: string[]): void => {
    const title = node.title.trim() || node.content.trim().slice(0, 30) || node.id
    const path = [...parents, title]
    result.push({ id: node.id, label: path.join(' › ') })
    for (const child of node.children) visit(child, path)
  }
  visit(document.root, [])
  return result
}

export function CommandGuide({ runtime, state, document }: { runtime: ViewRuntime; state: ViewState; document: StructuredDocument | null }): React.ReactElement {
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const [target, setTarget] = useState('')
  const [targetQuery, setTargetQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const options = useMemo(() => nodeOptions(document), [document])
  const filteredOptions = options.filter(option => targetQuery.trim() === '' || option.label.includes(targetQuery.trim()))
  const selectedTitle = runtime.bridge.getSelectedNode()?.title
  const entries = VIEW_COMMAND_GUIDE.filter(entry => query.trim() === '' || `${entry.phrase}${entry.description}`.includes(query.trim()))
  const quickIds = state.currentView === 'mindmap'
    ? ['find-current', 'fit', 'zoom-in']
    : ['mindmap', 'two-levels', 'reset-view']

  const execute = async (entry: ViewGuideEntry): Promise<void> => {
    if (busy !== null) return
    if (entry.needsSelection && state.selectedNodeId === null) {
      setStatus('请先在文档或视图中选择一个节点。')
      return
    }
    if (entry.needsTarget && target === '') {
      setStatus('请先选择要查找的节点。')
      return
    }
    setBusy(entry.id)
    setStatus('正在执行…')
    const commands = [...entry.commands]
    if (entry.needsTarget) commands.push({ name: 'focus_node', node: target, mode: 'visible' })
    const completed: string[] = []
    try {
      for (const command of commands) {
        const result = await runtime.applyCommandAsync(command)
        if (!result.ok) {
          setStatus(`${completed.length > 0 ? `已完成 ${completed.length} 步；` : ''}${result.message}`)
          return
        }
        completed.push(result.message)
      }
      setStatus('已执行：' + entry.phrase.replace('〈节点标题〉', options.find(option => option.id === target)?.label ?? '目标节点'))
    } finally {
      setBusy(null)
    }
  }

  const copy = async (entry: ViewGuideEntry): Promise<void> => {
    const phrase = entry.phrase.replace('〈节点标题〉', options.find(option => option.id === target)?.label ?? '节点标题')
    try {
      await navigator.clipboard.writeText(phrase)
      setStatus('已复制：' + phrase)
    } catch {
      setStatus('复制失败，请直接选择上面的指令文字复制。')
    }
  }

  const renderEntry = (entry: ViewGuideEntry): React.ReactElement => {
    const disabled = busy !== null || (entry.needsSelection === true && state.selectedNodeId === null) || (entry.needsTarget === true && target === '')
    return (
      <div className="sdv-guide-entry" key={entry.id}>
        <div className="sdv-guide-copy-text"><span>{entry.phrase}</span><small>{entry.description}</small></div>
        <div className="sdv-guide-actions">
          <button type="button" className="sdv-btn" disabled={disabled} onClick={() => void execute(entry)}>{busy === entry.id ? '执行中' : '执行'}</button>
          <button type="button" className="sdv-btn" onClick={() => void copy(entry)}>复制</button>
        </div>
      </div>
    )
  }

  return (
    <div className="sdv-guide">
      <div className="sdv-guide-quick">
        <span className="sdv-guide-label">你可以这样说：</span>
        {quickIds.map(id => {
          const entry = VIEW_COMMAND_GUIDE.find(item => item.id === id)!
          return <button type="button" className="sdv-guide-chip" key={id} disabled={entry.needsSelection === true && state.selectedNodeId === null} onClick={() => void execute(entry)}>{entry.phrase}</button>
        })}
        <button type="button" className="sdv-guide-more" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? '收起' : '更多说法'}</button>
      </div>
      {expanded && (
        <div className="sdv-guide-panel" aria-label="自然语言视图指令指南">
          <div className="sdv-guide-context">可通过现有语音输入照着说，也可直接点击执行。当前节点：{selectedTitle ?? '未选择'}</div>
          <div className="sdv-guide-controls">
            <input className="sdv-guide-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索指令" aria-label="搜索指令" />
            <input className="sdv-guide-search" value={targetQuery} onChange={event => setTargetQuery(event.target.value)} placeholder="搜索节点" aria-label="搜索目标节点" />
            <select className="sdv-select" value={target} onChange={event => setTarget(event.target.value)} aria-label="选择目标节点">
              <option value="">选择目标节点…</option>
              {filteredOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </div>
          <h4>简单指令</h4>
          {entries.filter(entry => entry.level === 'simple').map(renderEntry)}
          <h4>组合指令</h4>
          {entries.filter(entry => entry.level === 'combined').map(renderEntry)}
          {status !== '' && <div className="sdv-guide-status" role="status">{status}</div>}
        </div>
      )}
    </div>
  )
}
