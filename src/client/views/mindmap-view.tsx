/**
 * 思维导图视图（Mind Map View）：mind-elixir 封装。
 *
 * 交互能力（对应需求第 9 章）：
 * - 节点展示：标题/内容摘要，角色图标；
 * - 展开 / 收起：点击展开器（'expandNode' 事件回流到视图状态）；
 * - 点击节点：'selectNodes' 事件 → select_node（同步当前节点）；
 * - 缩放：滚轮 / 触控板 + 工具栏按钮（'scale' 事件回写 View State）；
 * - 平移：拖动画布（'move' 事件回写 View State）；
 * - 聚焦：focused_node 变化 → scrollIntoView(forceCenter)；
 * - 布局切换：mind / logical / down → initSide / initRight / initDown；
 * - Node ID 与结构化文档 Node ID 一致（adapter 保证）。
 *
 * 设计约束：本插件视图状态是唯一权威（不依赖 mind-elixir 内部数据），
 * 所有用户操作通过事件回流更新 View State 后整体 refresh。
 */
import { useEffect, useRef, useState } from 'react'
import MindElixir, { type MindElixirData, type MindElixirInstance } from 'mind-elixir'
import type { MindMapViewModel } from '../adapters/mindmap.ts'
import type { ViewState } from '../../shared/view-state.ts'
import type { ViewCommand } from '../../shared/types.ts'
import type { CommandAckPayload, MindMapViewportController } from '../runtime.ts'
import { visibilityDelta } from '../../shared/viewport.ts'
import { MIND_ELIXIR_CSS } from '../generated/mind-elixir-style.ts'

/** 主题（浅色，贴合 DSH Web 界面）。 */
const LIGHT_THEME = {
  name: 'dsh-light',
  type: 'light' as const,
  palette: ['#4f6ef7', '#2e9e6b', '#e0813c', '#a06ee1', '#3ba6c9', '#c94f4f'],
  cssVar: {
    '--main-color': '#4f6ef7',
    '--main-bgcolor': '#eef2ff',
    '--main-bgcolor-transparent': 'rgba(238, 242, 255, 0.4)',
    '--color': '#333',
    '--bgcolor': '#fff',
    '--selected': '#4f6ef7',
    '--accent-color': '#ff7a00',
  },
}

/** 把框架无关模型转为 mind-elixir 数据。 */
function toMindElixirData(model: MindMapViewModel): MindElixirData {
  const mapNode = (node: MindMapViewModel['root']): MindElixirData['nodeData'] => {
    const icon = model.roleIcons[node.role] ?? ''
    return {
      id: node.id,
      topic: icon !== '' ? `${icon} ${node.topic}` : node.topic,
      expanded: node.expanded,
      children: node.children.map(mapNode),
    }
  }
  return {
    nodeData: mapNode(model.root),
    direction: model.direction,
    theme: LIGHT_THEME,
  }
}

/** 样式注入标记（避免重复注入）。 */
const STYLE_ID = 'dsh-sdv-mindelixir-style'

function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

/** 思维导图视图组件。 */
export function MindMapView(props: {
  model: MindMapViewModel
  state: ViewState
  onSelectNode: (nodeId: string) => void
  onToggleNode: (nodeId: string) => void
  onViewStateChange: (patch: { zoom?: number; pan?: { x: number; y: number } }) => void
  onViewportReady: (controller: MindMapViewportController) => () => void
  onCommand: (command: ViewCommand) => Promise<CommandAckPayload>
}): React.ReactElement {
  const { model, state, onSelectNode, onToggleNode, onViewStateChange, onViewportReady, onCommand } = props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mindRef = useRef<MindElixirInstance | null>(null)
  const [currentZoom, setCurrentZoom] = useState(1)
  const currentZoomRef = useRef(1)
  const renderedLayoutRef = useRef<string | undefined>(undefined)
  const renderedDataRef = useRef<string | undefined>(undefined)
  const selectionRequestRef = useRef(0)
  const suppressSelectRef = useRef(false)
  const selectedNodeRef = useRef(state.selectedNodeId)
  selectedNodeRef.current = state.selectedNodeId
  const renderedModelKey = JSON.stringify(model.root)

  // 挂载：创建思维导图实例并注册事件。
  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    // 注入样式（幂等）。
    if (document.getElementById(STYLE_ID) === null) {
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = MIND_ELIXIR_CSS
      document.head.appendChild(style)
    }

    let disposed = false
    const mind = new MindElixir({
      el: container,
      editable: false, // V0.1 只读展示；拖拽改层级为未来能力（见 docs/architecture.md D6）
      direction: model.direction,
      theme: LIGHT_THEME,
      contextMenu: false,
      toolBar: false,
      keypress: false,
      allowUndo: false,
      mouseSelectionButton: 0,
      scaleMin: 0.3,
      scaleMax: 3,
    })
    mindRef.current = mind
    renderedLayoutRef.current = model.layout

    try {
      const data = toMindElixirData(model)
      mind.init(data)
      renderedDataRef.current = JSON.stringify(data.nodeData)
    } catch (error) {
      console.error('[dsh-structured-document-view] mind-elixir init 失败：', error)
      mindRef.current = null
      return
    }

    // 点击节点：同步当前节点（select_node）。
    mind.bus.addListener('selectNodes', (nodes) => {
      const node = nodes[0]
      if (node !== undefined && !disposed && !suppressSelectRef.current) onSelectNode(node.id)
    })
    // 点击展开/收起按钮：更新视图状态。
    mind.bus.addListener('expandNode', (node) => {
      if (!disposed) onToggleNode(node.id)
    })
    // 缩放：回写视图状态。
    mind.bus.addListener('scale', (scale) => {
      currentZoomRef.current = scale
      setCurrentZoom(scale)
      if (!disposed) onViewStateChange({ zoom: scale })
    })
    // 平移：回写视图状态（累计增量）。
    mind.bus.addListener('move', (data) => {
      if (!disposed) onViewStateChange({ pan: { x: data.dx, y: data.dy } })
    })

    mind.toCenter()

    const selectAndLocate = async (nodeId: string, mode: 'visible' | 'center'): Promise<CommandAckPayload> => {
      const request = ++selectionRequestRef.current
      await nextFrame()
      if (disposed || request !== selectionRequestRef.current) return { ok: false, code: 'INTERNAL_ERROR', message: '定位请求已被更新的选择替代。' }
      const el = mind.findEle(nodeId)
      if (el === undefined || el === null) {
        return { ok: false, code: 'NODE_HIDDEN', message: '目标节点当前被收起、层级限制或筛选隐藏。' }
      }
      suppressSelectRef.current = true
      try {
        mind.selectNode(el)
        if (mode === 'center') mind.scrollIntoView(el, true)
        else {
          const delta = visibilityDelta(el.getBoundingClientRect(), mind.container.getBoundingClientRect())
          if (delta.x !== 0 || delta.y !== 0) mind.move(delta.x, delta.y, true)
        }
      } finally {
        suppressSelectRef.current = false
      }
      await nextFrame()
      return { ok: true, code: 'OK', message: mode === 'center' ? '已将节点移到画布中央。' : '已确保节点在可视范围内。', value: { nodeId } }
    }

    const controller: MindMapViewportController = {
      focusNode: selectAndLocate,
      setZoom: async (command) => {
        const target = command.zoom ?? currentZoomRef.current * (command.factor ?? 1)
        const zoom = Math.min(3, Math.max(0.3, target))
        mind.scale(zoom)
        await nextFrame()
        return { ok: true, code: 'OK', message: `已缩放到 ${Math.round(zoom * 100)}%。`, value: { zoom } }
      },
      fitView: async () => {
        mind.scaleFit()
        await nextFrame()
        return { ok: true, code: 'OK', message: '已显示当前全部可见内容。', value: { zoom: currentZoomRef.current } }
      },
      resetViewport: async () => {
        mind.scale(1)
        mind.toCenter()
        await nextFrame()
        return { ok: true, code: 'OK', message: '已将视口恢复为 100% 并居中根节点。', value: { zoom: 1 } }
      },
    }
    const unregisterViewport = onViewportReady(controller)

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      const selected = selectedNodeRef.current
      if (selected !== null) void selectAndLocate(selected, 'visible')
    })
    observer?.observe(container)

    return () => {
      disposed = true
      observer?.disconnect()
      unregisterViewport()
      try {
        mind.bus.removeListener('selectNodes', () => undefined)
      } catch {
        // 忽略
      }
      try {
        mind.destroy()
      } catch {
        // 忽略销毁异常
      }
      mindRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 数据 / 布局变化：整体刷新。
  useEffect(() => {
    const mind = mindRef.current
    if (mind === null) return
    const data = toMindElixirData(model)
    const dataKey = JSON.stringify(data.nodeData)
    const layoutChanged = renderedLayoutRef.current !== model.layout
    const dataChanged = renderedDataRef.current !== dataKey

    // 选中节点只改变 ViewState.selectedNodeId，不改变导图数据。此时不要 refresh，
    // 否则 mind-elixir 会重建画布，导致刚选中的节点和当前视口发生跳动。
    if (!layoutChanged && !dataChanged) return

    // 布局切换走 init* 系列（refresh 不应用 direction）。
    if (layoutChanged) {
      renderedLayoutRef.current = model.layout
      try {
        if (model.layout === 'logical') mind.initRight()
        else if (model.layout === 'down') mind.initDown()
        else mind.initSide()
      } catch (error) {
        console.error('[dsh-structured-document-view] 布局切换失败：', error)
      }
    }
    try {
      mind.refresh(data)
      renderedDataRef.current = dataKey
      // 布局方向改变后重新定位根节点，避免单侧布局仍沿用双侧布局的偏移。
      if (layoutChanged) mind.toCenter()
    } catch (error) {
      console.error('[dsh-structured-document-view] 刷新思维导图失败：', error)
    }
  }, [model])

  // 普通点击、宿主同步选中与切回导图：仅在看不全时移动。
  useEffect(() => {
    const mind = mindRef.current
    const selected = state.selectedNodeId
    if (mind === null || selected === null) return
    const request = ++selectionRequestRef.current
    requestAnimationFrame(() => {
      if (request !== selectionRequestRef.current) return
      const el = mind.findEle(selected)
      if (el === undefined || el === null) return
      suppressSelectRef.current = true
      try {
        mind.selectNode(el)
        const delta = visibilityDelta(el.getBoundingClientRect(), mind.container.getBoundingClientRect())
        if (delta.x !== 0 || delta.y !== 0) mind.move(delta.x, delta.y, true)
      } finally {
        suppressSelectRef.current = false
      }
    })
  }, [state.selectedNodeId, renderedModelKey, model.layout])

  // 缩放工具按钮。
  return (
    <div className="sdv-mindmap">
      <div className="sdv-mindmap-toolbar">
        <button type="button" className="sdv-btn" onClick={() => void onCommand({ name: 'set_zoom', factor: 1.25 })} title="放大">＋</button>
        <button type="button" className="sdv-btn" onClick={() => void onCommand({ name: 'set_zoom', factor: 0.8 })} title="缩小">－</button>
        <button type="button" className="sdv-btn" onClick={() => void onCommand({ name: 'fit_view' })} title="自适应">⤢</button>
        <button type="button" className="sdv-btn" onClick={() => void onCommand({ name: 'reset_viewport' })} title="重置视口">⟳</button>
        <span className="sdv-mindmap-zoom">{Math.round(currentZoom * 100)}%</span>
        <span className="sdv-mindmap-hint">滚轮缩放 · 拖动画布平移 · 点击节点选中</span>
      </div>
      <div ref={containerRef} className="sdv-mindmap-canvas" />
    </div>
  )
}
