/**
 * MockDocumentProvider 测试（数据真源 + 事件管线）。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  BUILTIN_MOCK_DOCUMENTS,
  DEFAULT_MOCK_DOCUMENT_ID,
  MockDocumentProvider,
} from '../src/document/mock-provider.ts'

describe('MockDocumentProvider', () => {
  it('默认文档为 thinking，三类内置文档齐全', () => {
    const provider = new MockDocumentProvider()
    expect(provider.getActiveDocumentId()).toBe(DEFAULT_MOCK_DOCUMENT_ID)
    expect(provider.listDocuments().map(d => d.id)).toEqual(['meeting', 'project', 'thinking'])
    const doc = provider.getDocument()
    expect(doc?.profile).toBe('thinking')
    expect(doc?.root.id).toBe('node_001')
    expect(doc?.revision).toBeGreaterThan(0)
  })

  it('getDocument 返回深拷贝（外部修改不影响内部）', () => {
    const provider = new MockDocumentProvider()
    const doc = provider.getDocument()!
    doc.root.title = '被篡改'
    doc.root.children = []
    expect(provider.getDocument()!.root.title).toBe('第二技术路线')
    expect(provider.getDocument()!.root.children.length).toBeGreaterThan(0)
  })

  it('selectNode 校验存在性并触发选中变化', () => {
    const provider = new MockDocumentProvider()
    const onSelected = vi.fn()
    provider.subscribeSelectedNodeChanged(onSelected)
    provider.selectNode('node_003')
    expect(onSelected).toHaveBeenCalledTimes(1)
    expect(provider.getSelectedNode()?.id).toBe('node_003')
    expect(() => provider.selectNode('node_missing')).toThrow(/不存在/)
    // 幂等：相同节点不重复通知
    provider.selectNode('node_003')
    expect(onSelected).toHaveBeenCalledTimes(1)
  })

  it('setActiveDocument 触发文档变化 + 选中清理', () => {
    const provider = new MockDocumentProvider()
    const onDocument = vi.fn()
    const onSelected = vi.fn()
    provider.subscribeDocumentChanged(onDocument)
    provider.subscribeSelectedNodeChanged(onSelected)
    provider.selectNode('node_003')
    expect(onSelected).toHaveBeenCalledTimes(1)
    provider.setActiveDocument('meeting')
    expect(provider.getActiveDocumentId()).toBe('meeting')
    expect(onDocument).toHaveBeenCalledTimes(1)
    expect(onSelected).toHaveBeenCalledTimes(2) // 第 2 次 = 选中被清理
    expect(provider.getSelectedNode()).toBeNull()
    // 未知文档抛错
    expect(() => provider.setActiveDocument('nope')).toThrow(/未知文档/)
  })

  it('mockMutate 触发文档变化管线并清理失效选中', () => {
    const provider = new MockDocumentProvider()
    const onDocument = vi.fn()
    const onSelected = vi.fn()
    provider.subscribeDocumentChanged(onDocument)
    provider.subscribeSelectedNodeChanged(onSelected)
    provider.selectNode('node_003')
    onSelected.mockClear()

    // 变更：删除 node_003 的父分支（node_002）
    provider.mockMutate((doc) => {
      doc.root.children = doc.root.children.filter(n => n.id !== 'node_002')
      doc.revision += 1
    })
    expect(onDocument).toHaveBeenCalledTimes(1)
    // 选中节点随删除被清理
    expect(onSelected).toHaveBeenCalledTimes(1)
    expect(provider.getSelectedNode()).toBeNull()
    expect(provider.getDocument()!.revision).toBe(2)
    expect(provider.getDocument()!.root.children.some(n => n.id === 'node_002')).toBe(false)
  })

  it('mockMutate 保留仍存在的选中', () => {
    const provider = new MockDocumentProvider()
    provider.selectNode('node_003')
    provider.mockMutate((doc) => {
      doc.revision += 1
    })
    expect(provider.getSelectedNode()?.id).toBe('node_003')
  })

  it('各实例文档相互独立（mockMutate 不跨实例泄漏）', () => {
    const providerA = new MockDocumentProvider()
    const providerB = new MockDocumentProvider()
    providerA.mockMutate((doc) => {
      doc.root.children = doc.root.children.filter(n => n.id !== 'node_002')
      doc.revision += 1
    })
    // B 实例不受 A 变更影响
    expect(providerB.getDocument()!.root.children.some(n => n.id === 'node_002')).toBe(true)
    expect(providerB.getDocument()!.revision).toBe(1)
    // 新实例同样干净
    expect(new MockDocumentProvider().getDocument()!.root.children.some(n => n.id === 'node_002')).toBe(true)
  })

  it('dispose 后不再通知', () => {
    const provider = new MockDocumentProvider()
    const onDocument = vi.fn()
    provider.subscribeDocumentChanged(onDocument)
    provider.dispose()
    provider.mockMutate(doc => { doc.revision += 1 })
    provider.setActiveDocument('project')
    expect(onDocument).not.toHaveBeenCalled()
  })

  it('内置文档 profile 符合三类场景', () => {
    const ids = new Map(BUILTIN_MOCK_DOCUMENTS.map(d => [d.id, d.document]))
    expect(ids.get('meeting')!.profile).toBe('meeting')
    expect(ids.get('project')!.profile).toBe('project')
    expect(ids.get('thinking')!.profile).toBe('thinking')
  })
})
