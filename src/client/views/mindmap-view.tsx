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

/** 思维导图视图组件。 */
export function MindMapView(props: {
  model: MindMapViewModel
  state: ViewState
  onSelectNode: (nodeId: string) => void
  onToggleNode: (nodeId: string) => void
  onViewStateChange: (patch: { zoom?: number; pan?: { x: number; y: number } }) => void
}): React.ReactElement {
  const { model, state, onSelectNode, onToggleNode, onViewStateChange } = props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mindRef = useRef<MindElixirInstance | null>(null)
  const [currentZoom, setCurrentZoom] = useState(1)
  const renderedLayoutRef = useRef<string | undefined>(undefined)
  const renderedDataRef = useRef<string | undefined>(undefined)
  const lastFocusedRef = useRef<string | null>(null)

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
      if (node !== undefined && !disposed) onSelectNode(node.id)
    })
    // 点击展开/收起按钮：更新视图状态。
    mind.bus.addListener('expandNode', (node) => {
      if (!disposed) onToggleNode(node.id)
    })
    // 缩放：回写视图状态。
    mind.bus.addListener('scale', (scale) => {
      setCurrentZoom(scale)
      if (!disposed) onViewStateChange({ zoom: scale })
    })
    // 平移：回写视图状态（累计增量）。
    mind.bus.addListener('move', (data) => {
      if (!disposed) onViewStateChange({ pan: { x: data.dx, y: data.dy } })
    })

    mind.toCenter()

    return () => {
      disposed = true
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

  // 聚焦：居中定位 + 选中。
  useEffect(() => {
    const mind = mindRef.current
    const focused = state.focusedNodeId
    if (mind === null || focused === null || focused === lastFocusedRef.current) return
    lastFocusedRef.current = focused
    // 用实例方法 findEle（静态 MindElixir.E 的 this 绑定不可用）。
    const el = mind.findEle(focused)
    if (el === undefined || el === null) return
    try {
      mind.selectNode(el)
      mind.scrollIntoView(el, true)
    } catch (error) {
      console.error('[dsh-structured-document-view] 聚焦失败：', error)
    }
  }, [state.focusedNodeId])

  // 缩放工具按钮。
  const zoomBy = (factor: number): void => {
    const mind = mindRef.current
    if (mind === null) return
    try {
      mind.scale(currentZoom * factor)
    } catch (error) {
      console.error('[dsh-structured-document-view] 缩放失败：', error)
    }
  }
  const zoomFit = (): void => {
    const mind = mindRef.current
    if (mind === null) return
    try {
      mind.scaleFit()
    } catch (error) {
      console.error('[dsh-structured-document-view] 自适应缩放失败：', error)
    }
  }
  const resetViewport = (): void => {
    const mind = mindRef.current
    if (mind === null) return
    try {
      mind.toCenter()
      mind.scale(1)
    } catch (error) {
      console.error('[dsh-structured-document-view] 重置视口失败：', error)
    }
  }

  return (
    <div className="sdv-mindmap">
      <div className="sdv-mindmap-toolbar">
        <button type="button" className="sdv-btn" onClick={() => zoomBy(1.25)} title="放大">＋</button>
        <button type="button" className="sdv-btn" onClick={() => zoomBy(0.8)} title="缩小">－</button>
        <button type="button" className="sdv-btn" onClick={zoomFit} title="自适应">⤢</button>
        <button type="button" className="sdv-btn" onClick={resetViewport} title="重置视口">⟳</button>
        <span className="sdv-mindmap-zoom">{Math.round(currentZoom * 100)}%</span>
        <span className="sdv-mindmap-hint">滚轮缩放 · 拖动画布平移 · 点击节点选中</span>
      </div>
      <div ref={containerRef} className="sdv-mindmap-canvas" />
    </div>
  )
}
