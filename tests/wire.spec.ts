/**
 * wire 编解码测试（命令 / 消息信封严格校验）。
 */
import { describe, expect, it } from 'vitest'
import {
  WireError,
  encodeAck,
  encodeClientCurrentFile,
  encodeClientSelectNode,
  encodeClientState,
  encodeHello,
  encodeHostCommand,
  encodeHostDocument,
  encodeHostHelloAck,
  encodeHostSelection,
  parseClientMessage,
  parseCommand,
  parseHostMessage,
} from '../src/shared/wire.ts'
import type { ViewStateWire } from '../src/shared/types.ts'

function makeWire(overrides: Partial<ViewStateWire> = {}): ViewStateWire {
  return {
    sessionId: 's1',
    currentView: 'mindmap',
    expandedNodeIds: ['node_001'],
    collapsedNodeIds: [],
    depth: null,
    viewDepths: { markdown: null, mindmap: 2, table: null },
    readerMode: 'section',
    outlineCollapsedNodeIds: [],
    zoom: 1,
    pan: { x: 0, y: 0 },
    layout: 'mind',
    filter: null,
    outline: [],
    updatedAt: 1234,
    ...overrides,
  }
}

describe('parseCommand', () => {
  it('合法命令通过', () => {
    expect(parseCommand({ name: 'set_view', view: 'table' })).toEqual({ name: 'set_view', view: 'table' })
    expect(parseCommand({ name: 'expand_node' })).toEqual({ name: 'expand_node' })
    expect(parseCommand({ name: 'expand_node', node: 'node_003' })).toEqual({ name: 'expand_node', node: 'node_003' })
    expect(parseCommand({ name: 'set_depth', depth: null })).toEqual({ name: 'set_depth', depth: null })
    expect(parseCommand({ name: 'set_depth', depth: 0 })).toEqual({ name: 'set_depth', depth: 0 })
    expect(parseCommand({ name: 'set_layout', layout: 'down' })).toEqual({ name: 'set_layout', layout: 'down' })
    expect(parseCommand({ name: 'focus_node', mode: 'visible' })).toEqual({ name: 'focus_node', mode: 'visible' })
    expect(parseCommand({ name: 'open_node', node: '第二技术路线' })).toEqual({ name: 'open_node', node: '第二技术路线' })
    expect(parseCommand({ name: 'set_reader_mode', mode: 'document' })).toEqual({ name: 'set_reader_mode', mode: 'document' })
    expect(parseCommand({ name: 'navigate_section', direction: 'next' })).toEqual({ name: 'navigate_section', direction: 'next' })
    expect(parseCommand({ name: 'set_zoom', zoom: 0.8 })).toEqual({ name: 'set_zoom', zoom: 0.8 })
    expect(parseCommand({ name: 'set_zoom', factor: 1.25 })).toEqual({ name: 'set_zoom', factor: 1.25 })
    expect(parseCommand({ name: 'fit_view' })).toEqual({ name: 'fit_view' })
    expect(parseCommand({ name: 'reset_viewport' })).toEqual({ name: 'reset_viewport' })
    expect(parseCommand({ name: 'set_filter', filter: { role: 'task' } })).toEqual({ name: 'set_filter', filter: { role: 'task' } })
    expect(parseCommand({ name: 'set_filter', filter: null })).toEqual({ name: 'set_filter', filter: null })
    expect(parseCommand({ name: 'reset_view' })).toEqual({ name: 'reset_view' })
    expect(parseCommand({ name: 'open_tab' })).toEqual({ name: 'open_tab' })
    expect(parseCommand({ name: 'sync_state' })).toEqual({ name: 'sync_state' })
  })

  it('非法命令抛 WireError', () => {
    expect(() => parseCommand({ name: 'nope' })).toThrow(WireError)
    expect(() => parseCommand({ name: 'set_view', view: 'pdf' })).toThrow(WireError)
    expect(() => parseCommand({ name: 'set_layout', layout: 'fish' })).toThrow(WireError)
    expect(() => parseCommand({ name: 'set_depth', depth: 21 })).toThrow(WireError)
    expect(() => parseCommand({ name: 'set_depth', depth: 1.5 })).toThrow(WireError)
    expect(() => parseCommand({ name: 'set_depth', depth: -1 })).toThrow(WireError)
    expect(() => parseCommand({ name: 'focus_node', mode: 'nearby' })).toThrow(WireError)
    expect(() => parseCommand({ name: 'set_reader_mode', mode: 'page' })).toThrow(WireError)
    expect(() => parseCommand({ name: 'navigate_section', direction: 'down' })).toThrow(WireError)
    expect(() => parseCommand({ name: 'set_zoom' })).toThrow(WireError)
    expect(() => parseCommand({ name: 'set_zoom', zoom: 1, factor: 2 })).toThrow(WireError)
    expect(() => parseCommand({ name: 'set_zoom', zoom: 0.2 })).toThrow(WireError)
    expect(() => parseCommand({ name: 'set_filter', filter: {} })).toThrow(WireError) // 空筛选
    expect(() => parseCommand({ name: 'set_filter', filter: { role: '' } })).toThrow(WireError)
    expect(() => parseCommand({ name: 'set_filter', filter: { properties: { p: {} } } })).toThrow(WireError)
    expect(() => parseCommand({})).toThrow(WireError)
    expect(() => parseCommand(null)).toThrow(WireError)
  })
})

describe('parseClientMessage', () => {
  it('hello', () => {
    expect(parseClientMessage('{"type":"hello","sessionId":"s1"}')).toEqual({ type: 'hello', sessionId: 's1' })
    expect(() => parseClientMessage('{"type":"hello","sessionId":""}')).toThrow(WireError)
  })

  it('state（含文档与大纲）', () => {
    const wire = makeWire({
      selectedNodeId: 'node_003',
      selectedNodeTitle: '热红外验证',
      focusedNodeId: 'node_002',
      filter: { role: 'problem' },
      depth: 3,
      readerMode: 'document',
      selectedNodePath: [{ id: 'node_001', title: '根' }, { id: 'node_003', title: '热红外验证' }],
      document: { id: 'd1', title: '第二技术路线', profile: 'thinking', revision: 2, providerId: 'mock', providerName: 'Mock' },
      outline: [{ id: 'node_001', title: '根', role: 'note', children: [] }],
    })
    const parsed = parseClientMessage(JSON.stringify({ type: 'state', state: wire }))
    expect(parsed.type).toBe('state')
    if (parsed.type === 'state') {
      expect(parsed.state.sessionId).toBe('s1')
      expect(parsed.state.selectedNodeId).toBe('node_003')
      expect(parsed.state.depth).toBe(3)
      expect(parsed.state.readerMode).toBe('document')
      expect(parsed.state.selectedNodePath?.[1]?.id).toBe('node_003')
      expect(parsed.state.document?.profile).toBe('thinking')
      expect(parsed.state.outline[0]!.id).toBe('node_001')
    }
  })

  it('command-result', () => {
    const text = '{"type":"command-result","result":{"id":"abc","ok":true,"code":"OK","message":"好","value":{"nodeId":"n1"}}}'
    const parsed = parseClientMessage(text)
    expect(parsed.type).toBe('command-result')
    if (parsed.type === 'command-result') {
      expect(parsed.result.id).toBe('abc')
      expect(parsed.result.value).toEqual({ nodeId: 'n1' })
    }
  })

  it('select-node / current-file（宿主文档集成上行消息）', () => {
    const select = parseClientMessage('{"type":"select-node","nodeId":"node_003"}')
    expect(select).toEqual({ type: 'select-node', nodeId: 'node_003' })
    expect(parseClientMessage('{"type":"select-node","nodeId":null}')).toEqual({ type: 'select-node', nodeId: null })
    expect(parseClientMessage('{"type":"current-file","path":"/tmp/a.md"}')).toEqual({ type: 'current-file', path: '/tmp/a.md' })
    expect(parseClientMessage('{"type":"current-file","path":null}')).toEqual({ type: 'current-file', path: null })
    expect(() => parseClientMessage('{"type":"select-node","nodeId":42}')).toThrow(WireError)
    expect(() => parseClientMessage('{"type":"current-file","path":42}')).toThrow(WireError)
  })

  it('畸形消息抛 WireError', () => {
    expect(() => parseClientMessage('not-json')).toThrow(WireError)
    expect(() => parseClientMessage('{"type":"bogus"}')).toThrow(WireError)
    expect(() => parseClientMessage('{"type":"state"}')).toThrow(WireError) // 缺 state
  })
})

describe('parseHostMessage / encode', () => {
  it('命令消息与编码往返', () => {
    const command = { name: 'set_view', view: 'mindmap' } as const
    const text = encodeHostCommand('id-1', command)
    expect(parseHostMessage(text)).toEqual({ type: 'command', id: 'id-1', command })
    expect(() => parseHostMessage('{"type":"state","state":{}}')).toThrow(WireError)
  })

  it('客户端编码往返', () => {
    const hello = parseClientMessage(encodeHello('s1'))
    expect(hello.type).toBe('hello')
    const wire = makeWire({ outline: [{ id: 'r', title: '根', role: 'note', children: [] }] })
    const stateMsg = parseClientMessage(encodeClientState(wire))
    expect(stateMsg.type).toBe('state')
    if (stateMsg.type === 'state') expect(stateMsg.state.outline[0]!.title).toBe('根')
    const ackMsg = parseClientMessage(encodeAck({ id: 'x', ok: false, code: 'NODE_NOT_FOUND', message: '没找到' }))
    expect(ackMsg.type).toBe('command-result')
  })

  it('宿主文档/选中推送与编码往返', () => {
    const doc = {
      id: 'doc-1',
      title: '防干烧项目周会',
      profile: 'meeting',
      revision: 3,
      root: {
        id: 'node_001',
        title: '防干烧项目周会',
        content: '',
        role: 'note',
        properties: {},
        children: [{ id: 'node_002', title: '议题', content: '', role: 'topic', properties: {}, children: [] }],
      },
    }
    const text = encodeHostDocument({ type: 'document', document: doc, selectedNodeId: 'node_002', currentFile: '/tmp/weekly.md' })
    const parsed = parseHostMessage(text)
    expect(parsed.type).toBe('document')
    if (parsed.type === 'document') {
      expect(parsed.document?.id).toBe('doc-1')
      expect(parsed.document?.root.children[0]?.id).toBe('node_002')
      expect(parsed.selectedNodeId).toBe('node_002')
      expect(parsed.currentFile).toBe('/tmp/weekly.md')
    }

    // 无文档推送（未绑定）。
    const empty = parseHostMessage(encodeHostDocument({ type: 'document', document: null, selectedNodeId: null, currentFile: null }))
    expect(empty.type === 'document' && empty.document === null).toBe(true)

    // 选中变化推送。
    const selection = parseHostMessage(encodeHostSelection({ type: 'selection', selectedNodeId: 'node_003' }))
    expect(selection).toEqual({ type: 'selection', selectedNodeId: 'node_003' })

    // 上行编码往返。
    expect(parseClientMessage(encodeClientSelectNode('node_009'))).toEqual({ type: 'select-node', nodeId: 'node_009' })
    expect(parseClientMessage(encodeClientCurrentFile('/x/y.md'))).toEqual({ type: 'current-file', path: '/x/y.md' })

    // 畸形 document 拒绝。
    expect(() => parseHostMessage('{"type":"document","document":{"id":1},"selectedNodeId":null,"currentFile":null}')).toThrow(WireError)
    expect(() => parseHostMessage('{"type":"selection","selectedNodeId":42}')).toThrow(WireError)

    // hello-ack 能力协商。
    const ack = parseHostMessage(encodeHostHelloAck({ type: 'hello-ack', capabilities: { structuredDocument: true } }))
    expect(ack).toEqual({ type: 'hello-ack', capabilities: { structuredDocument: true } })
    expect(parseHostMessage(encodeHostHelloAck({ type: 'hello-ack', capabilities: { structuredDocument: false } }))).toEqual({
      type: 'hello-ack',
      capabilities: { structuredDocument: false },
    })
    expect(() => parseHostMessage('{"type":"hello-ack","capabilities":{}}')).toThrow(WireError)
    expect(() => parseHostMessage('{"type":"hello-ack","capabilities":{"structuredDocument":"yes"}}')).toThrow(WireError)
  })
})
