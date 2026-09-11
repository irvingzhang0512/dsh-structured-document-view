/**
 * View 桥接的 wire 编码 / 解码。
 *
 * 消息是小 JSON 文档；解码严格校验信封（防御畸形或伪造流量），失败抛
 * {@link WireError}，调用方丢弃该消息并保持连接。
 * 本模块被宿主（Node）与客户端（浏览器）共享。
 */
import type {
  ClientToHostMessage,
  CommandAck,
  HostToClientMessage,
  ViewCommand,
  ViewStateWire,
} from './types.ts'
import { VIEW_COMMAND_NAMES } from './types.ts'
import { MIND_MAP_LAYOUTS, VIEW_NAMES, type MindMapLayout, type ViewFilter, type ViewName } from './view-state.ts'

/** wire 解析失败。 */
export class WireError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WireError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') throw new WireError(`missing or invalid "${key}"`)
  return value
}

function requireBool(record: Record<string, unknown>, key: string): boolean {
  const value = record[key]
  if (typeof value !== 'boolean') throw new WireError(`missing or invalid "${key}"`)
  return value
}

function stringArray(value: unknown, key: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new WireError(`invalid "${key}"`)
  }
  return value
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new WireError(`invalid "${key}"`)
  return value
}

function optionalNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key]
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new WireError(`invalid "${key}"`)
  return value
}

function isViewName(value: unknown): value is ViewName {
  return typeof value === 'string' && (VIEW_NAMES as readonly string[]).includes(value)
}

function isLayout(value: unknown): value is MindMapLayout {
  return typeof value === 'string' && (MIND_MAP_LAYOUTS as readonly string[]).includes(value)
}

function parseFilter(value: unknown): ViewFilter | null {
  if (value === null || value === undefined) return null
  if (!isRecord(value)) throw new WireError('invalid filter')
  const filter: ViewFilter = {}
  if (value.role !== undefined) {
    if (typeof value.role !== 'string' || value.role === '') throw new WireError('invalid filter.role')
    filter.role = value.role
  }
  if (value.properties !== undefined) {
    if (!isRecord(value.properties)) throw new WireError('invalid filter.properties')
    const props: ViewFilter['properties'] = {}
    for (const [key, propValue] of Object.entries(value.properties)) {
      if (typeof propValue !== 'string' && typeof propValue !== 'number' && typeof propValue !== 'boolean') {
        throw new WireError('invalid filter.properties value')
      }
      props[key] = propValue
    }
    filter.properties = props
  }
  if (filter.role === undefined && filter.properties === undefined) throw new WireError('empty filter')
  return filter
}

/** 校验一个命令（{@link ViewCommand} 的形状）。 */
export function parseCommand(raw: unknown): ViewCommand {
  if (!isRecord(raw) || typeof raw.name !== 'string') throw new WireError('invalid command')
  const name = raw.name
  if (!(VIEW_COMMAND_NAMES as readonly string[]).includes(name)) {
    throw new WireError(`unknown command "${name}"`)
  }
  switch (name) {
    case 'set_view': {
      if (!isViewName(raw.view)) throw new WireError('invalid view')
      return { name, view: raw.view }
    }
    case 'expand_node':
    case 'collapse_node':
    case 'focus_node': {
      const node = optionalString(raw, 'node')
      return { name, ...(node !== undefined && node !== '' ? { node } : {}) }
    }
    case 'set_depth': {
      const depth = raw.depth
      if (depth !== null) {
        if (typeof depth !== 'number' || !Number.isInteger(depth) || depth < 0 || depth > 20) {
          throw new WireError('invalid depth')
        }
      }
      return { name, depth: depth === null ? null : depth }
    }
    case 'set_layout': {
      if (!isLayout(raw.layout)) throw new WireError('invalid layout')
      return { name, layout: raw.layout }
    }
    case 'set_filter':
      return { name, filter: parseFilter(raw.filter) }
    case 'reset_view':
    case 'sync_state':
      return { name }
    default:
      throw new WireError(`unknown command "${name}"`)
  }
}

/** 解码一条客户端 → 宿主消息。 */
export function parseClientMessage(text: string): ClientToHostMessage {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new WireError('invalid JSON')
  }
  if (!isRecord(parsed) || typeof parsed.type !== 'string') throw new WireError('invalid message envelope')
  switch (parsed.type) {
    case 'hello': {
      const sessionId = requireString(parsed, 'sessionId')
      if (sessionId === '') throw new WireError('empty sessionId')
      return { type: 'hello', sessionId }
    }
    case 'state': {
      const state = parsed.state
      if (!isRecord(state)) throw new WireError('invalid state payload')
      const wire: ViewStateWire = {
        sessionId: requireString(state, 'sessionId'),
        currentView: requireString(state, 'currentView') as ViewName,
        expandedNodeIds: stringArray(state.expandedNodeIds, 'expandedNodeIds'),
        collapsedNodeIds: stringArray(state.collapsedNodeIds, 'collapsedNodeIds'),
        depth: state.depth === null ? null : optionalNumber(state, 'depth') ?? null,
        zoom: optionalNumber(state, 'zoom') ?? 1,
        pan: { x: optionalNumber(state.pan as Record<string, unknown>, 'x') ?? 0, y: optionalNumber(state.pan as Record<string, unknown>, 'y') ?? 0 },
        layout: requireString(state, 'layout') as MindMapLayout,
        filter: parseFilter(state.filter),
        outline: [],
        updatedAt: optionalNumber(state, 'updatedAt') ?? 0,
      }
      const selected = optionalString(state, 'selectedNodeId')
      if (selected !== undefined) wire.selectedNodeId = selected
      const selectedTitle = optionalString(state, 'selectedNodeTitle')
      if (selectedTitle !== undefined) wire.selectedNodeTitle = selectedTitle
      const focused = optionalString(state, 'focusedNodeId')
      if (focused !== undefined) wire.focusedNodeId = focused
      if (isRecord(state.document)) {
        const doc = state.document
        wire.document = {
          id: requireString(doc, 'id'),
          title: requireString(doc, 'title'),
          profile: requireString(doc, 'profile'),
          revision: optionalNumber(doc, 'revision') ?? 0,
          providerId: requireString(doc, 'providerId'),
          providerName: requireString(doc, 'providerName'),
        }
      }
      if (Array.isArray(state.outline)) {
        wire.outline = (state.outline as unknown[]).map(node => parseOutlineNode(node)).filter((node): node is OutlineNodeWire => node !== undefined)
        wire.outlineTruncated = state.outlineTruncated === true
      }
      return { type: 'state', state: wire }
    }
    case 'command-result': {
      const result = parsed.result
      if (!isRecord(result)) throw new WireError('invalid command-result payload')
      const ack: CommandAck = {
        id: requireString(result, 'id'),
        ok: requireBool(result, 'ok'),
        code: requireString(result, 'code'),
        message: typeof result.message === 'string' ? result.message : '',
        ...(isRecord(result.value) ? { value: result.value } : {}),
      }
      return { type: 'command-result', result: ack }
    }
    case 'select-node': {
      const nodeId = parsed.nodeId
      if (nodeId !== null && typeof nodeId !== 'string') throw new WireError('invalid nodeId')
      return { type: 'select-node', nodeId: nodeId === null ? null : nodeId }
    }
    case 'current-file': {
      const path = parsed.path
      if (path !== null && typeof path !== 'string') throw new WireError('invalid path')
      return { type: 'current-file', path: path === null ? null : path }
    }
    default:
      throw new WireError(`unknown message type "${parsed.type}"`)
  }
}

interface OutlineNodeWire {
  id: string
  title: string
  role: string
  children: OutlineNodeWire[]
}

function parseOutlineNode(value: unknown): OutlineNodeWire | undefined {
  if (!isRecord(value)) return undefined
  try {
    return {
      id: requireString(value, 'id'),
      title: requireString(value, 'title'),
      role: requireString(value, 'role'),
      children: Array.isArray(value.children)
        ? value.children.map(child => parseOutlineNode(child)).filter((node): node is OutlineNodeWire => node !== undefined)
        : [],
    }
  } catch {
    return undefined
  }
}

/** 校验一个文档快照（宽松结构校验；根节点只要求对象形态）。 */
function parseDocumentPayload(value: unknown): import('./ir.ts').StructuredDocument | null {
  if (value === null || value === undefined) return null
  if (!isRecord(value)) throw new WireError('invalid document payload')
  if (!isRecord(value.root)) throw new WireError('invalid document.root')
  return {
    id: requireString(value, 'id'),
    title: requireString(value, 'title'),
    profile: requireString(value, 'profile'),
    revision: optionalNumber(value, 'revision') ?? 0,
    root: value.root as unknown as import('./ir.ts').StructuredDocument['root'],
  }
}

/** 解码一条宿主 → 客户端消息。 */
export function parseHostMessage(text: string): HostToClientMessage {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new WireError('invalid JSON')
  }
  if (!isRecord(parsed) || typeof parsed.type !== 'string') throw new WireError('invalid message envelope')
  switch (parsed.type) {
    case 'command': {
      const id = requireString(parsed, 'id')
      const command = parseCommand(parsed.command)
      return { type: 'command', id, command }
    }
    case 'document': {
      const selectedNodeId = parsed.selectedNodeId
      if (selectedNodeId !== null && typeof selectedNodeId !== 'string') throw new WireError('invalid selectedNodeId')
      const currentFile = parsed.currentFile
      if (currentFile !== null && typeof currentFile !== 'string') throw new WireError('invalid currentFile')
      return {
        type: 'document',
        document: parseDocumentPayload(parsed.document),
        selectedNodeId: selectedNodeId === null ? null : selectedNodeId,
        currentFile: currentFile === null ? null : currentFile,
      }
    }
    case 'selection': {
      const selectedNodeId = parsed.selectedNodeId
      if (selectedNodeId !== null && typeof selectedNodeId !== 'string') throw new WireError('invalid selectedNodeId')
      return { type: 'selection', selectedNodeId: selectedNodeId === null ? null : selectedNodeId }
    }
    case 'hello-ack': {
      const capabilities = parsed.capabilities
      if (!isRecord(capabilities)) throw new WireError('invalid capabilities')
      const structuredDocument = capabilities.structuredDocument
      if (typeof structuredDocument !== 'boolean') throw new WireError('invalid capabilities.structuredDocument')
      return { type: 'hello-ack', capabilities: { structuredDocument } }
    }
    default:
      throw new WireError(`unknown message type "${parsed.type}"`)
  }
}

/** 编码一条宿主 → 客户端命令消息。 */
export function encodeHostCommand(id: string, command: ViewCommand): string {
  return JSON.stringify({ type: 'command', id, command })
}

/** 编码一条宿主 → 客户端文档快照推送。 */
export function encodeHostDocument(message: import('./types.ts').HostDocumentMessage): string {
  return JSON.stringify(message)
}

/** 编码一条宿主 → 客户端选中变化推送。 */
export function encodeHostSelection(message: import('./types.ts').HostSelectionMessage): string {
  return JSON.stringify(message)
}

/** 编码一条宿主 → 客户端 hello 应答（能力协商）。 */
export function encodeHostHelloAck(ack: import('./types.ts').HostHelloAckMessage): string {
  return JSON.stringify(ack)
}

/** 编码一条客户端 → 宿主状态推送。 */
export function encodeClientState(state: ViewStateWire): string {
  return JSON.stringify({ type: 'state', state })
}

/** 编码一条客户端 → 宿主确认。 */
export function encodeAck(result: CommandAck): string {
  return JSON.stringify({ type: 'command-result', result })
}

/** 编码一条客户端 → 宿主 hello。 */
export function encodeHello(sessionId: string): string {
  return JSON.stringify({ type: 'hello', sessionId })
}

/** 编码一条客户端 → 宿主选中同步（select-node）。 */
export function encodeClientSelectNode(nodeId: string | null): string {
  return JSON.stringify({ type: 'select-node', nodeId })
}

/** 编码一条客户端 → 宿主当前文件同步（current-file）。 */
export function encodeClientCurrentFile(path: string | null): string {
  return JSON.stringify({ type: 'current-file', path })
}
