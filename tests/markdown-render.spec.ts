/**
 * 轻量 Markdown 渲染器（markdown-render.tsx）测试。
 */
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { renderMarkdown } from '../src/client/views/markdown-render.tsx'

describe('renderMarkdown', () => {
  it('HTML 注释不可见（跳过视图生成的元信息注释头）', () => {
    const html = renderToStaticMarkup(
      renderMarkdown('<!-- 思路整理 · revision 1 · 结构化文档视图 V0.1 -->\n\n# 标题\n'),
    )
    expect(html).not.toContain('思路整理')
    expect(html).not.toContain('<!--')
    expect(html).toContain('<h1 class="sdv-heading">标题</h1>')
  })

  it('多行 HTML 注释整体跳过', () => {
    const html = renderToStaticMarkup(
      renderMarkdown('<!-- 第一行\n第二行 -->\n\n正文段落\n'),
    )
    expect(html).not.toContain('第一行')
    expect(html).not.toContain('第二行')
    expect(html).toContain('正文段落')
  })

  it('普通段落与标题正常渲染', () => {
    const html = renderToStaticMarkup(
      renderMarkdown('# 一级标题\n\n一段普通文本。\n'),
    )
    expect(html).toContain('<h1 class="sdv-heading">一级标题</h1>')
    expect(html).toContain('一段普通文本。')
  })
})
