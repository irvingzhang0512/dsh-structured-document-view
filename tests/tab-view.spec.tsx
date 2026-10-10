/**
 * 视图页首帧渲染（SPEC F010 / A1–A3）：
 * 握手前不得出现任何文档内容，也不得出现示例数据；示例数据只在宿主明确
 * 声明"无文档内核"后出现，且必须带可见标识。
 */
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TabView } from '../src/client/views/tab-view.tsx'
import { ViewSessionManager } from '../src/client/session-manager.ts'

// mind-elixir 是浏览器库，且首帧渲染不涉及画布：这里用桩替换，
// 让本用例只验证"数据源状态 → 首帧内容"的决策。
vi.mock('mind-elixir', () => ({ default: class MindElixirStub {} }))

/** 以固定会话渲染一次视图页（SSR：不触发 effect，只验证首帧）。 */
function renderTab(manager: ViewSessionManager): string {
  const props = { scope: { sessionId: 's1' }, visible: true, manager } as never
  return renderToStaticMarkup(<TabView {...props} />)
}

describe('视图页首帧（数据源状态机）', () => {
  it('握手前（connecting）：显示连接中提示，不出现示例文档与示例标识', () => {
    const manager = new ViewSessionManager()
    try {
      manager.ensureRuntime('s1')
      const html = renderTab(manager)
      expect(html).toContain('正在连接视图桥')
      expect(html).not.toContain('第二技术路线')
      expect(html).not.toContain('示例数据')
      expect(html).not.toContain('切换示例文档')
    } finally {
      manager.disposeAll()
    }
  })

  it('宿主声明无内核（mock）：进入示例数据模式并显示可见标识', () => {
    const manager = new ViewSessionManager()
    try {
      const runtime = manager.ensureRuntime('s1')
      runtime.applyCapabilities({ structuredDocument: false })
      const html = renderTab(manager)
      expect(html).toContain('示例数据')
      expect(html).toContain('第二技术路线')
    } finally {
      manager.disposeAll()
    }
  })

  it('宿主声明有内核但未绑定（host）：空状态，不出现示例数据', () => {
    const manager = new ViewSessionManager()
    try {
      manager.ensureRuntime('s1').applyCapabilities({ structuredDocument: true })
      const html = renderTab(manager)
      expect(html).toContain('无文档')
      expect(html).not.toContain('第二技术路线')
      expect(html).not.toContain('示例数据')
    } finally {
      manager.disposeAll()
    }
  })
})
