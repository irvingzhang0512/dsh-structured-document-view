import { useEffect, useMemo, useRef, useState } from 'react'
import type { DocNode, StructuredDocument } from '../../shared/ir.ts'
import type { ViewState } from '../../shared/view-state.ts'
import { nodeDisplayTitle, summarize } from '../adapters/markdown.ts'
import type { ViewRuntime } from '../runtime.ts'
import { renderMarkdown } from './markdown-render.tsx'

interface PathEntry { id: string; title: string }

export function findPath(root: DocNode, id: string): DocNode[] | null {
  if (root.id === id) return [root]
  for (const child of root.children) {
    const path = findPath(child, id)
    if (path !== null) return [root, ...path]
  }
  return null
}

function allNodes(root: DocNode, path: PathEntry[] = []): Array<{ node: DocNode; path: PathEntry[] }> {
  const current = [...path, { id: root.id, title: nodeDisplayTitle(root) }]
  return [{ node: root, path: current }, ...root.children.flatMap(child => allNodes(child, current))]
}

export function searchNodes(document: StructuredDocument, query: string): Array<{ node: DocNode; path: PathEntry[] }> {
  const needle = query.trim().toLocaleLowerCase()
  if (needle === '') return []
  return allNodes(document.root).filter(({ node }) => {
    const haystack = [node.title, node.content, node.role, ...Object.entries(node.properties).flatMap(([key, value]) => [key, String(value)])].join('\n').toLocaleLowerCase()
    return haystack.includes(needle)
  }).slice(0, 50)
}

function NodeArticle({ node, level, selectedId }: { node: DocNode; level: number; selectedId: string | null }): React.ReactElement {
  const Heading = `h${Math.min(6, Math.max(1, level))}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  return (
    <section className={`sdv-reader-node ${node.id === selectedId ? 'sdv-reader-node-selected' : ''}`} data-node-id={node.id}>
      <Heading className="sdv-heading">{nodeDisplayTitle(node)}{node.role !== '' && <span className="sdv-role-tag">{node.role}</span>}</Heading>
      {node.content.trim() !== '' && renderMarkdown(node.content)}
      {Object.keys(node.properties).length > 0 && <dl className="sdv-properties">{Object.entries(node.properties).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl>}
      {node.children.map(child => <NodeArticle key={child.id} node={child} level={level + 1} selectedId={selectedId} />)}
    </section>
  )
}

function OutlineBranch({ node, state, runtime, onOpenNode, level = 0 }: { node: DocNode; state: ViewState; runtime: ViewRuntime; onOpenNode: (nodeId: string) => void; level?: number }): React.ReactElement {
  const collapsed = state.outlineCollapsedNodeIds.includes(node.id)
  return <div className="sdv-outline-branch">
    <div className={`sdv-outline-row ${state.selectedNodeId === node.id ? 'is-selected' : ''}`} style={{ paddingLeft: `${6 + level * 13}px` }}>
      {node.children.length > 0
        ? <button className="sdv-outline-toggle" type="button" aria-label={collapsed ? '展开' : '收起'} onClick={() => runtime.handleUserToggleOutlineNode(node.id)}>{collapsed ? '›' : '⌄'}</button>
        : <span className="sdv-outline-spacer" />}
      <button className="sdv-outline-title" type="button" onClick={() => onOpenNode(node.id)}>{nodeDisplayTitle(node)}</button>
    </div>
    {!collapsed && node.children.map(child => <OutlineBranch key={child.id} node={child} state={state} runtime={runtime} onOpenNode={onOpenNode} level={level + 1} />)}
  </div>
}

export function MarkdownView({ runtime, state }: { runtime: ViewRuntime; state: ViewState }): React.ReactElement {
  const document = runtime.bridge.getDocument()
  const [query, setQuery] = useState('')
  const [outlineOpen, setOutlineOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const matches = useMemo(() => document === null ? [] : searchNodes(document, query), [document, query])
  const selectedPath = document === null || state.selectedNodeId === null ? null : findPath(document.root, state.selectedNodeId)
  const selected = selectedPath?.[selectedPath.length - 1] ?? null

  useEffect(() => {
    if (state.readerMode !== 'document' || state.selectedNodeId === null) return
    requestAnimationFrame(() => Array.from(scrollRef.current?.querySelectorAll<HTMLElement>('[data-node-id]') ?? []).find(element => element.dataset.nodeId === state.selectedNodeId)?.scrollIntoView({ block: 'center' }))
  }, [state.readerMode, state.selectedNodeId, document?.revision])

  if (document === null) return <div className="sdv-empty">当前没有可展示的文档。</div>
  const navigate = (direction: 'previous' | 'next'): void => { runtime.applyCommand({ name: 'navigate_section', direction }) }
  return <div className="sdv-reader-shell">
    <button className="sdv-outline-drawer-button" type="button" onClick={() => setOutlineOpen(value => !value)}>☰ 大纲</button>
    <aside className={`sdv-outline ${outlineOpen ? 'is-open' : ''}`}>
      <div className="sdv-outline-header"><strong>文档大纲</strong><button type="button" onClick={() => setOutlineOpen(false)}>×</button></div>
      <input className="sdv-outline-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索标题、正文或属性" />
      <div className="sdv-outline-tree">{query.trim() === ''
        ? <OutlineBranch node={document.root} state={state} runtime={runtime} onOpenNode={(nodeId) => { runtime.handleUserOpenNode(nodeId); setOutlineOpen(false) }} />
        : matches.length === 0
          ? <div className="sdv-outline-empty">没有匹配内容</div>
          : matches.map(({ node, path }) => <button className="sdv-search-result" type="button" key={node.id} onClick={() => { runtime.handleUserOpenNode(node.id); setOutlineOpen(false) }}><strong>{nodeDisplayTitle(node)}</strong><small>{path.map(item => item.title).join(' / ')}</small></button>)}</div>
    </aside>
    {outlineOpen && <button type="button" className="sdv-outline-backdrop" aria-label="关闭大纲" onClick={() => setOutlineOpen(false)} />}
    <main className="sdv-reader-main">
      <div className="sdv-reader-toolbar">
        <div className="sdv-breadcrumb">{(selectedPath ?? [document.root]).map((node, index, path) => <span key={node.id}><button type="button" onClick={() => runtime.handleUserOpenNode(node.id)}>{nodeDisplayTitle(node)}</button>{index < path.length - 1 && ' / '}</span>)}</div>
        <div className="sdv-reader-actions">
          <button className="sdv-btn" type="button" disabled={selected === null} onClick={() => navigate('previous')}>上一节</button>
          <button className="sdv-btn" type="button" disabled={selected === null} onClick={() => navigate('next')}>下一节</button>
          <button className="sdv-btn" type="button" onClick={() => runtime.applyCommand({ name: 'set_reader_mode', mode: state.readerMode === 'section' ? 'document' : 'section' })}>{state.readerMode === 'section' ? '查看全文' : '只看本节'}</button>
        </div>
      </div>
      <div ref={scrollRef} className="sdv-markdown-scroll">{state.readerMode === 'document'
        ? <NodeArticle node={document.root} level={1} selectedId={state.selectedNodeId} />
        : selected !== null
          ? <NodeArticle node={selected} level={1} selectedId={selected.id} />
          : <div className="sdv-reader-overview"><h1>{document.title}</h1><p>从大纲或下面的章节概览选择要阅读的内容。</p><div className="sdv-overview-grid">{document.root.children.map(node => <button type="button" key={node.id} onClick={() => runtime.handleUserOpenNode(node.id)}><strong>{nodeDisplayTitle(node)}</strong><span>{summarize(node.content || node.children.map(child => child.title).join('、'), 90) || '打开查看本节内容'}</span></button>)}</div></div>}
      </div>
    </main>
  </div>
}
