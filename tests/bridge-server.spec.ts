/**
 * ViewBridgeServer 测试：派发 / 入队重放 / ack 超时 / 镜像。
 */
import { describe, expect, it } from 'vitest'
import { ViewBridgeServer } from '../src/host/bridge-server.ts'
import { ViewMirrorStore } from '../src/host/mirror-store.ts'
import type { ViewStateWire } from '../src/shared/types.ts'
import { encodeAck, encodeClientState, encodeHello, encodeHostCommand, parseHostMessage } from '../src/shared/wire.ts'

function makeWire(sessionId: string): ViewStateWire {
  return {
    sessionId,
    currentView: 'markdown',
    expandedNodeIds: [],
    collapsedNodeIds: [],
    depth: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    layout: 'mind',
    filter: null,
    outline: [],
    updatedAt: 1,
  }
}

describe('ViewBridgeServer', () => {
  it('已连接会话：派发等待 ack', async () => {
    const store = new ViewMirrorStore()
    const bridge = new ViewBridgeServer({ store })
    const received: string[] = []
    const detach = bridge.attach('s1', (message) => received.push(message))

    const dispatchPromise = bridge.dispatch('s1', { name: 'set_view', view: 'table' }, 500)
    // 客户端收到命令并回 ack
    expect(received).toHaveLength(1)
    const hostMessage = parseHostMessage(received[0]!)
    const ackText = encodeAck({ id: hostMessage.id, ok: true, code: 'OK', message: '已切换', value: { currentView: 'table' } })
    bridge.handleClientMessage('s1', JSON.parse(ackText))
    const outcome = await dispatchPromise
    expect(outcome.delivered).toBe(true)
    expect(outcome.queued).toBe(false)
    expect(outcome.ack?.ok).toBe(true)
    expect(outcome.ack?.value).toEqual({ currentView: 'table' })

    detach()
  })

  it('未连接会话：命令入队，连接后 hello 重放', async () => {
    const store = new ViewMirrorStore()
    const bridge = new ViewBridgeServer({ store })
    const outcome = await bridge.dispatch('s1', { name: 'set_depth', depth: 2 }, 50)
    expect(outcome.delivered).toBe(false)
    expect(outcome.queued).toBe(true)

    // 客户端接入 → hello 触发重放（并收到 hello-ack）
    const received: string[] = []
    bridge.attach('s1', message => received.push(message))
    bridge.handleClientMessage('s1', JSON.parse(encodeHello('s1')))
    expect(received).toHaveLength(2)
    const ack = parseHostMessage(received[0]!)
    expect(ack.type).toBe('hello-ack')
    expect(parseHostMessage(received[1]!).command).toEqual({ name: 'set_depth', depth: 2 })
  })

  it('hello 应答能力协商（默认无宿主文档；可注入）', () => {
    const store = new ViewMirrorStore()
    const bridge = new ViewBridgeServer({ store })
    const received: string[] = []
    const detach = bridge.attach('s1', message => received.push(message))
    bridge.handleClientMessage('s1', JSON.parse(encodeHello('s1')))
    const ack = parseHostMessage(received[0]!)
    expect(ack.type).toBe('hello-ack')
    if (ack.type === 'hello-ack') expect(ack.capabilities.structuredDocument).toBe(false)

    // 定向发送给发起 socket（origin），不广播给该会话其他发送器。
    const originReceived: string[] = []
    const bridge2 = new ViewBridgeServer({ store: new ViewMirrorStore(), capabilities: { structuredDocument: true } })
    const bystander: string[] = []
    const detach2 = bridge2.attach('s1', message => bystander.push(message))
    bridge2.handleClientMessage('s1', JSON.parse(encodeHello('s1')), (message) => originReceived.push(message))
    const originAck = parseHostMessage(originReceived[0]!)
    expect(originAck.type).toBe('hello-ack')
    if (originAck.type === 'hello-ack') expect(originAck.capabilities.structuredDocument).toBe(true)
    expect(bystander).toHaveLength(0)
    detach()
    detach2()
  })

  it('ack 超时返回 null', async () => {
    const store = new ViewMirrorStore()
    const bridge = new ViewBridgeServer({ store })
    bridge.attach('s1', () => undefined) // 客户端不回 ack
    const outcome = await bridge.dispatch('s1', { name: 'reset_view' }, 30)
    expect(outcome.delivered).toBe(true)
    expect(outcome.queued).toBe(false)
    expect(outcome.ack).toBeNull()
  })

  it('状态推送进入镜像；断连标记', () => {
    const store = new ViewMirrorStore()
    const bridge = new ViewBridgeServer({ store })
    const detach = bridge.attach('s1', () => undefined)
    bridge.handleClientMessage('s1', JSON.parse(encodeClientState(makeWire('s1'))))
    expect(store.get('s1')?.connected).toBe(true)
    expect(store.get('s1')?.state?.sessionId).toBe('s1')
    detach()
    expect(store.get('s1')?.connected).toBe(false)
  })

  it('排队命令有界（超过 64 条丢弃）', async () => {
    const store = new ViewMirrorStore()
    const bridge = new ViewBridgeServer({ store })
    for (let i = 0; i < 70; i += 1) {
      await bridge.dispatch('s1', { name: 'reset_view' }, 5)
    }
    const received: string[] = []
    bridge.attach('s1', message => received.push(message))
    bridge.handleClientMessage('s1', JSON.parse(encodeHello('s1')))
    // 64 条重放命令 + 1 条 hello-ack
    expect(received.length).toBe(65)
    expect(received.slice(1).every(message => parseHostMessage(message).type === 'command')).toBe(true)
  })

  it('dispose 结束挂起等待与队列', async () => {
    const store = new ViewMirrorStore()
    const bridge = new ViewBridgeServer({ store })
    bridge.attach('s1', () => undefined)
    const dispatchPromise = bridge.dispatch('s1', { name: 'sync_state' }, 10000)
    bridge.dispose()
    const outcome = await dispatchPromise
    expect(outcome.ack).toBeNull()
  })
})
