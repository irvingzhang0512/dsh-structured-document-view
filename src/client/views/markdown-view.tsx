/**
 * Markdown 视图（Markdown View）：展示完整正文与标题层级。
 */
import { toMarkdown } from '../adapters/markdown.ts'
import type { ViewRuntime } from '../runtime.ts'
import type { ViewState } from '../../shared/view-state.ts'
import { renderMarkdown } from './markdown-render.tsx'

/** Markdown 视图组件。 */
export function MarkdownView({ runtime, state }: { runtime: ViewRuntime; state: ViewState }): React.ReactElement {
  const document = runtime.bridge.getDocument()
  if (document === null) {
    return <div className="sdv-empty">当前没有可展示的文档。</div>
  }
  const markdown = toMarkdown(document, state)
  return (
    <div className="sdv-markdown-scroll">
      {renderMarkdown(markdown)}
    </div>
  )
}
