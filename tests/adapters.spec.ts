/**
 * 适配层（Markdown / MindMap / Table / Outline）测试。
 */
import { describe, expect, it } from 'vitest'
import thinking from '../examples/thinking.json'
import project from '../examples/project.json'
import meeting from '../examples/meeting.json'
import type { StructuredDocument } from '../src/shared/ir.ts'
import { toMarkdown, summarize, nodeDisplayTitle } from '../src/client/adapters/markdown.ts'
import { toMindMapViewModel } from '../src/client/adapters/mindmap.ts'
import { toTableViewModel, roleLabel, rowProperty } from '../src/client/adapters/table.ts'
import { toOutline } from '../src/client/adapters/outline.ts'
import {
  createDefaultViewState,
  collapseNode,
  expandNode,
  setDepth,
  setFilter,
  setLayout,
} from '../src/shared/view-state.ts'

const thinkingDoc = thinking as unknown as StructuredDocument
const projectDoc = project as unknown as StructuredDocument
const meetingDoc = meeting as unknown as StructuredDocument

describe('markdown adapter', () => {
  it('toMarkdown 输出标题层级与角色标签', () => {
    const md = toMarkdown(thinkingDoc, createDefaultViewState())
    // 根节点 # 标题 + 角色标签
    expect(md).toContain('# 第二技术路线　（topic）')
    expect(md).toContain('## 9月验证　（topic）')
    expect(md).toContain('### 热红外验证　（idea）')
    // 正文段落
    expect(md).toContain('利用热红外相机验证高温环境下的目标识别能力')
    // HTML 注释头
    expect(md).toContain('<!-- 思路整理 · revision 1')
  })

  it('depth 限制隐藏深层节点', () => {
    const md = toMarkdown(thinkingDoc, setDepth(createDefaultViewState(), 2))
    expect(md).toContain('## 9月验证')
    expect(md).not.toContain('### 热红外验证')
  })

  it('filter 只保留匹配子树', () => {
    const md = toMarkdown(thinkingDoc, setFilter(createDefaultViewState(), { role: 'problem' }))
    expect(md).toContain('天气影响')
    // 非匹配分支（idea 节点）不出现
    expect(md).not.toContain('热红外验证')
    expect(md).not.toContain('方案A：YOLOv8 蒸馏')
  })

  it('collapsed 隐藏子树', () => {
    const md = toMarkdown(thinkingDoc, collapseNode(createDefaultViewState(), 'node_002'))
    expect(md).toContain('## 9月验证')
    expect(md).not.toContain('热红外验证')
  })

  it('显式展开突破层级限制', () => {
    let state = setDepth(createDefaultViewState(), 2)
    state = expandNode(state, 'node_002')
    const md = toMarkdown(thinkingDoc, state)
    expect(md).toContain('### 热红外验证')
  })

  it('summarize / nodeDisplayTitle', () => {
    expect(summarize('  很多  空格  ')).toBe('很多 空格')
    expect(summarize('a'.repeat(100)).endsWith('…')).toBe(true)
    expect(nodeDisplayTitle(thinkingDoc.root)).toBe('第二技术路线')
  })
})

describe('mindmap adapter', () => {
  it('根节点 ID 与文档一致，direction 随布局', () => {
    const model = toMindMapViewModel(thinkingDoc, createDefaultViewState())
    expect(model.root.id).toBe(thinkingDoc.root.id)
    expect(model.direction).toBe(1) // logical（默认向右展开）
    const mind = toMindMapViewModel(thinkingDoc, setLayout(createDefaultViewState(), 'mind'))
    expect(mind.direction).toBe(2)
    const logical = toMindMapViewModel(thinkingDoc, setLayout(createDefaultViewState(), 'logical'))
    expect(logical.direction).toBe(1)
    const down = toMindMapViewModel(thinkingDoc, setLayout(createDefaultViewState(), 'down'))
    expect(down.direction).toBe(3)
  })

  it('层级限制：depth=1 只保留根；depth=2 隐藏第 3 层；展开可突破', () => {
    const one = toMindMapViewModel(thinkingDoc, setDepth(createDefaultViewState(), 1))
    expect(one.root.children).toEqual([]) // 第 2 层全部隐藏
    const two = toMindMapViewModel(thinkingDoc, setDepth(createDefaultViewState(), 2))
    const node002 = two.root.children.find(n => n.id === 'node_002')!
    expect(node002.children).toEqual([]) // 第 3 层（node_003 等）隐藏
    // 展开 node_002（显式展开链）→ 第 3 层可见
    let state = setDepth(createDefaultViewState(), 2)
    state = expandNode(state, 'node_002')
    const three = toMindMapViewModel(thinkingDoc, state)
    const node002b = three.root.children.find(n => n.id === 'node_002')!
    expect(node002b.children.map(n => n.id)).toEqual(['node_003', 'node_004', 'node_005'])
  })

  it('显式展开的节点 expanded:true', () => {
    let state = setDepth(createDefaultViewState(), 2)
    state = expandNode(state, 'node_002')
    const model = toMindMapViewModel(thinkingDoc, state)
    const node002 = model.root.children.find(n => n.id === 'node_002')!
    expect(node002.expanded).toBe(true)
    // 不限层级时子节点直接可见
    const unlimited = toMindMapViewModel(thinkingDoc, createDefaultViewState())
    const unlimitedNode002 = unlimited.root.children.find(n => n.id === 'node_002')!
    expect(unlimitedNode002.expanded).toBe(true)
    expect(unlimitedNode002.children.length).toBeGreaterThan(0)
  })

  it('filter 裁剪不匹配子树但保留祖先', () => {
    const model = toMindMapViewModel(thinkingDoc, setFilter(createDefaultViewState(), { role: 'problem' }))
    const node002 = model.root.children.find(n => n.id === 'node_002')!
    // node_002 自身不匹配，但其子节点 node_005（problem）匹配 → 保留
    expect(node002).toBeDefined()
    expect(node002.children.map(n => n.id)).toEqual(['node_005'])
    // 算法方案整枝无匹配 → 被裁剪
    expect(model.root.children.find(n => n.id === 'node_006')).toBeUndefined()
  })

  it('roleIcons 覆盖常用角色', () => {
    const model = toMindMapViewModel(thinkingDoc, createDefaultViewState())
    expect(model.roleIcons.task).toBe('☑')
    expect(model.roleIcons.risk).toBe('⚠')
    expect(model.roleIcons.question).toBe('?')
  })
})

describe('table adapter', () => {
  it('按角色分组并统计属性键', () => {
    const model = toTableViewModel(projectDoc, createDefaultViewState())
    expect(model.title).toBe(projectDoc.title)
    expect(model.totalRows).toBeGreaterThan(0)
    const taskGroup = model.groups.find(g => g.role === 'task')
    expect(taskGroup).toBeDefined()
    expect(taskGroup!.propertyKeys).toEqual(expect.arrayContaining(['owner', 'status', 'due_date', 'progress']))
    // 层级从 1（根）开始
    const rootRow = taskGroup!.rows.find(r => r.id === projectDoc.root.id)
    expect(rootRow).toBeUndefined() // 根是 note，不在 task 组
    expect(model.groups.find(g => g.role === 'note')).toBeDefined()
  })

  it('表格忽略收起但尊重 depth 与 filter', () => {
    let state = collapseNode(createDefaultViewState(), 'node_002')
    state = setDepth(state, 3)
    const thinkingModel = toTableViewModel(thinkingDoc, state)
    const noteIds = new Set(thinkingModel.groups.flatMap(g => g.rows.map(r => r.id)))
    // ignoreCollapse：node_003 等仍出现
    expect(noteIds.has('node_003')).toBe(true)
    // depth=3：thinking 最深 4 层节点被滤除
    const maxLevel = Math.max(...thinkingModel.groups.flatMap(g => g.rows.map(r => r.level)))
    expect(maxLevel).toBeLessThanOrEqual(3)
  })

  it('roleLabel / rowProperty', () => {
    expect(roleLabel('action_item')).toBe('待办')
    expect(roleLabel('unknown_role')).toBe('unknown_role')
    const model = toTableViewModel(meetingDoc, createDefaultViewState())
    const actionGroup = model.groups.find(g => g.role === 'action_item')!
    const row = actionGroup.rows[0]!
    expect(rowProperty(row, 'owner')).toBeDefined()
    expect(rowProperty(row, '不存在键')).toBeUndefined()
  })
})

describe('outline adapter', () => {
  it('toOutline 产出带 Node ID 的紧凑大纲', () => {
    const { outline, truncated } = toOutline(thinkingDoc)
    expect(truncated).toBe(false)
    expect(outline.length).toBe(1)
    expect(outline[0]!.id).toBe('node_001')
    const node002 = outline[0]!.children.find(n => n.id === 'node_002')
    expect(node002?.children.map(n => n.id)).toEqual(['node_003', 'node_004', 'node_005'])
  })

  it('超深/超大文档截断', () => {
    const deep: StructuredDocument = {
      id: 'deep',
      title: '深树',
      profile: 'thinking',
      revision: 1,
      root: { id: 'r', title: '根', role: 'note', content: '', properties: {}, children: [] },
    }
    let cursor = deep.root
    for (let i = 0; i < 12; i += 1) {
      const child = { id: `n${i}`, title: `第${i}层`, role: 'note', content: '', properties: {}, children: [] }
      cursor.children = [child]
      cursor = child
    }
    const { outline, truncated } = toOutline(deep)
    expect(truncated).toBe(true)
    expect(outline.length).toBe(1) // 根保留
  })
})
