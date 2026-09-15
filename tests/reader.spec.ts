import { describe, expect, it } from 'vitest'
import type { StructuredDocument } from '../src/shared/ir.ts'
import { findPath, searchNodes } from '../src/client/views/markdown-view.tsx'

function largeDocument(): StructuredDocument {
  return {
    id: 'large', title: '大型会议纪要', profile: 'meeting', revision: 1,
    root: {
      id: 'root', title: '大型会议纪要', role: 'meeting', content: '', properties: {},
      children: Array.from({ length: 49 }, (_, group) => ({
        id: `section-${group}`, title: `主题 ${group}`, role: 'topic', content: `主题内容 ${group}`, properties: {},
        children: Array.from({ length: 9 }, (_, item) => ({ id: `node-${group}-${item}`, title: `事项 ${group}-${item}`, role: 'note', content: item === 8 ? `包含检索词 COMSOL-${group}` : '普通内容', properties: { group }, children: [] })),
      })),
    },
  }
}

describe('章节阅读模型', () => {
  it('按节点 ID 返回完整面包屑', () => {
    const path = findPath(largeDocument().root, 'node-4-8')
    expect(path?.map(node => node.id)).toEqual(['root', 'section-4', 'node-4-8'])
  })

  it('500 节点内搜索正文和属性并返回路径', () => {
    const document = largeDocument()
    const started = performance.now()
    const matches = searchNodes(document, 'COMSOL-17')
    expect(matches.map(item => item.node.id)).toEqual(['node-17-8'])
    expect(matches[0]?.path.map(item => item.id)).toEqual(['root', 'section-17', 'node-17-8'])
    expect(performance.now() - started).toBeLessThan(1000)
  })
})
