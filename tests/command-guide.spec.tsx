import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CommandGuide } from '../src/client/views/command-guide.tsx'
import { ViewRuntime } from '../src/client/runtime.ts'

describe('CommandGuide', () => {
  it('思维导图常驻显示可说短句，并暴露可访问的展开状态', () => {
    const runtime = new ViewRuntime('s1', () => undefined)
    runtime.applyCommand({ name: 'set_view', view: 'mindmap' })
    const html = renderToStaticMarkup(<CommandGuide runtime={runtime} state={runtime.store.getState()} document={runtime.bridge.getDocument()} />)
    expect(html).toContain('你可以这样说')
    expect(html).toContain('找到当前节点')
    expect(html).toContain('显示全图')
    expect(html).toContain('放大一点')
    expect(html).toContain('aria-expanded="false"')
    runtime.dispose()
  })
})
