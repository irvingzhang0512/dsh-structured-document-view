/**
 * 节点引用（Node Reference）解析测试。
 */
import { describe, expect, it } from 'vitest'
import type { DocNode, StructuredDocument } from '../src/shared/ir.ts'
import {
  findNodeById,
  findNodesByTitle,
  nodeDepth,
  resolveNodeRef,
  walkDocument,
} from '../src/document/node-ref.ts'

function makeNode(id: string, title: string, children: DocNode[] = []): DocNode {
  return { id, title, role: 'note', content: '', properties: {}, children, metadata: {} }
}

function makeDocument(): StructuredDocument {
  return {
    id: 'doc-test',
    title: '测试文档',
    profile: 'thinking',
    revision: 1,
    root: makeNode('node_001', '测试文档', [
      makeNode('node_002', '议题 A', [makeNode('node_003', '子项')]),
      makeNode('node_004', '议题 B'),
      makeNode('node_005', '议题 A'), // 与 node_002 同标题
    ]),
  }
}

describe('node-ref', () => {
  it('walkDocument / findNodeById / nodeDepth', () => {
    const doc = makeDocument()
    const ids: string[] = []
    walkDocument(doc.root, node => ids.push(node.id))
    expect(ids).toEqual(['node_001', 'node_002', 'node_003', 'node_004', 'node_005'])
    expect(findNodeById(doc.root, 'node_003')?.title).toBe('子项')
    expect(findNodeById(doc.root, 'missing')).toBeUndefined()
    expect(nodeDepth(doc.root, 'node_001')).toBe(0)
    expect(nodeDepth(doc.root, 'node_003')).toBe(2)
    expect(nodeDepth(doc.root, 'missing')).toBeNull()
  })

  it('findNodesByTitle 大小写不敏感包含匹配', () => {
    const doc = makeDocument()
    expect(findNodesByTitle(doc.root, '议题 a').map(n => n.id)).toEqual(['node_002', 'node_005'])
  })

  it('缺省引用 = current（无选中 → NO_SELECTED_NODE）', () => {
    const doc = makeDocument()
    const result = resolveNodeRef(doc, null, undefined)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('NO_SELECTED_NODE')
  })

  it('current 别名解析到选中节点', () => {
    const doc = makeDocument()
    for (const alias of ['current', '@selected', '@current', '@focused']) {
      const result = resolveNodeRef(doc, 'node_004', alias)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.node.id).toBe('node_004')
    }
  })

  it('选中节点已不存在 → NODE_NOT_FOUND', () => {
    const doc = makeDocument()
    const result = resolveNodeRef(doc, 'node_gone', 'current')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('NODE_NOT_FOUND')
  })

  it('精确 Node ID 优先', () => {
    const doc = makeDocument()
    const result = resolveNodeRef(doc, null, 'node_003')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.node.title).toBe('子项')
  })

  it('标题精确匹配唯一 → 命中', () => {
    const doc = makeDocument()
    const result = resolveNodeRef(doc, null, '子项')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.node.id).toBe('node_003')
  })

  it('标题包含匹配多候选 → MULTIPLE_NODES_FOUND', () => {
    const doc = makeDocument()
    const result = resolveNodeRef(doc, null, '议题 A')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('MULTIPLE_NODES_FOUND')
      expect(result.candidates.map(n => n.id)).toEqual(['node_002', 'node_005'])
    }
  })

  it('无匹配 → NODE_NOT_FOUND', () => {
    const doc = makeDocument()
    const result = resolveNodeRef(doc, null, '不存在的标题')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('NODE_NOT_FOUND')
  })
})
