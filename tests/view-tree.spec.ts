/**
 * 视图树（View Tree）折叠测试。
 */
import { describe, expect, it } from 'vitest'
import type { DocNode, StructuredDocument } from '../src/shared/ir.ts'
import { buildViewTree, flattenViewTree } from '../src/shared/view-tree.ts'
import { createDefaultViewState, collapseNode, expandNode, setDepth, setFilter } from '../src/shared/view-state.ts'

function makeNode(id: string, title: string, role = 'note', children: DocNode[] = []): DocNode {
  return { id, title, role, content: '', properties: {}, children, metadata: {} }
}

/** 树：root(1) → a(2) → b(3) → c(4)；root(1) → x(2, role=risk)。 */
function makeDocument(): StructuredDocument {
  return {
    id: 'doc-test',
    title: '测试文档',
    profile: 'thinking',
    revision: 1,
    root: makeNode('root', '测试文档', 'note', [
      makeNode('a', '议题 A', 'topic', [makeNode('b', '子项 B', 'note', [makeNode('c', '孙项 C', 'note')])]),
      makeNode('x', '风险 X', 'risk'),
    ]),
  }
}

function byId(tree: ReturnType<typeof buildViewTree>, id: string): ReturnType<typeof buildViewTree> | undefined {
  return flattenViewTree(tree).find(node => node.node.id === id)
}

describe('buildViewTree', () => {
  it('默认状态全部可见', () => {
    const tree = buildViewTree(makeDocument(), createDefaultViewState())
    const flat = flattenViewTree(tree)
    expect(flat.map(n => n.node.id).sort()).toEqual(['a', 'b', 'c', 'root', 'x'])
    expect(flat.every(n => n.visible)).toBe(true)
    expect(flat.every(n => !n.collapsed)).toBe(true)
  })

  it('层级限制：depth=2 隐藏第 3、4 层', () => {
    const state = setDepth(createDefaultViewState(), 2)
    const tree = buildViewTree(makeDocument(), state)
    const flat = flattenViewTree(tree)
    expect(flat.map(n => n.node.id).sort()).toEqual(['a', 'root', 'x'])
    expect(byId(tree, 'b')).toBeUndefined() // level 3 > depth 2
    expect(byId(tree, 'c')).toBeUndefined() // level 4 > depth 2
    expect(byId(tree, 'a')).toBeDefined()   // level 2 <= depth 2
  })

  it('显式展开可突破层级限制', () => {
    let state = setDepth(createDefaultViewState(), 2)
    state = expandNode(state, 'a')
    const tree = buildViewTree(makeDocument(), state)
    const b = byId(tree, 'b')!
    expect(b.collapsed).toBe(false)
    expect(b.visible).toBe(true)
    const c = byId(tree, 'c')!
    expect(c.collapsed).toBe(false)
    expect(c.visible).toBe(true)
  })

  it('显式收起隐藏整个子树', () => {
    const state = collapseNode(createDefaultViewState(), 'a')
    const tree = buildViewTree(makeDocument(), state)
    const a = byId(tree, 'a')!
    expect(a.collapsed).toBe(true)
    expect(a.children).toEqual([])
    // 收起节点的后代不会出现在扁平结果中（子树被剪掉）
    expect(byId(tree, 'b')).toBeUndefined()
    expect(byId(tree, 'c')).toBeUndefined()
  })

  it('筛选：保留"自身不匹配但后代匹配"的祖先', () => {
    const state = setFilter(createDefaultViewState(), { role: 'risk' })
    const tree = buildViewTree(makeDocument(), state)
    const flat = flattenViewTree(tree)
    const visibleIds = flat.filter(n => n.visible).map(n => n.node.id)
    // x 命中；root 强制可见；a 分支整枝隐藏
    expect(visibleIds).toEqual(['root', 'x'])
    // 根永远可见
    expect(tree.visible).toBe(true)
  })

  it('ignoreCollapse：表格模式忽略收起但尊重层级与筛选', () => {
    let state = collapseNode(createDefaultViewState(), 'a')
    state = setDepth(state, 3)
    const tree = buildViewTree(makeDocument(), state, { ignoreCollapse: true })
    const a = byId(tree, 'a')!
    expect(a.collapsed).toBe(false) // 忽略收起
    expect(a.children.map(n => n.node.id)).toEqual(['b']) // b 在第 3 层（<=3）可见
    expect(byId(tree, 'c')).toBeUndefined() // c 在第 4 层（>3）被层级隐藏
  })
})
