# Document Provider（文档提供器接口）

结构化文档的**数据真源接口**。视图层不依赖任何具体实现，只依赖本接口——
这是与 `dsh-structured-document` 解耦的关键。

## 接口（src/document/provider.ts）

```ts
interface DocumentProvider {
  /** 稳定标识（如 'mock' / 'structured-document'）。 */
  readonly id: string
  /** 展示名（中文）。 */
  readonly displayName: string
  /** 当前文档（同步深拷贝；无文档返回 null）。 */
  getDocument(): StructuredDocument | null
  /** 当前选中节点（同步；无返回 null）。 */
  getSelectedNode(): DocNode | null
  /** 设置当前节点（向数据源同步选中状态）。 */
  selectNode(nodeId: string | null): void
  /** 订阅文档变化；返回退订函数。 */
  subscribeDocumentChanged(listener: () => void): () => void
  /** 订阅选中节点变化；返回退订函数。 */
  subscribeSelectedNodeChanged(listener: () => void): () => void
  /** 释放资源。 */
  dispose(): void
}
```

**V0.1 为同步接口**（D2）：Mock 与未来 `SessionWorkspace.getDocument()` 均同步
可得。真源变异步时只需把方法改 Promise，工具与视图不感知（DocumentBridge
是异步接缝）。

## 数据源状态机（F010，待实现）

运行时（`ViewRuntime`）**不再以 Mock 作为初始数据源**，而是显式三态：

| 状态 | 进入条件 | 数据源 | 界面表现 |
| --- | --- | --- | --- |
| `connecting` | 客户端启动后尚未收到 `hello-ack`（含重连中） | `EmptyDocumentProvider`（文档恒为 null） | 内容区显示"正在连接视图桥…"；隐藏示例文档切换器；文档类命令返回 `SOURCE_NOT_READY` |
| `host` | `hello-ack.capabilities.structuredDocument === true` | `HostBackedDocumentProvider` | 未绑定时显示空状态（"当前没有可展示的文档。"／"无文档"） |
| `mock` | `hello-ack.capabilities.structuredDocument === false` | `MockDocumentProvider` | 内置示例数据 + 显式"示例数据"标识；文档切换器可见 |

规则：

- **未握手 ≠ 无内核**：只有宿主明确声明 `false` 才允许展示示例数据；
  连接断开保留当前数据源与画面，仅标注重试中，不回退为示例数据。
- 状态只前进不回落（`connecting → host | mock`）；`host` 与 `mock` 之间不互换。
- `isHostMode()` 收敛为 `source === 'host'`，供既有调用与测试兼容。

## EmptyDocumentProvider（src/document/empty-provider.ts，拟新增）

`DocumentProvider` 的空实现：`getDocument()` / `getSelectedNode()` 恒返回
`null`，`selectNode` 无副作用，零订阅。它只是 `connecting` 阶段的占位数据源，
使运行时的 bridge、命令与界面代码无需判空分支。

## MockDocumentProvider（src/document/mock-provider.ts）

三份内置示例数据（`examples/{meeting,project,thinking}.json`）扮演真源，
完整实现接口。Mock 专属能力：

- `setActiveDocument(id)`：切换文档（触发 document-changed + 清理选中）；
- `mockMutate(mutator)`：模拟外部文档变更（触发 document-changed；
  选中节点若被删除则清理）；**每个实例持有独立文档副本**，变更不跨实例泄漏；
- `listDocuments()` / `getActiveDocumentId()` / `getActiveDocumentLabel()`：
  UI 文档切换用。

## 节点引用解析（src/document/node-ref.ts）

`expand / collapse / focus` 工具的 `node` 参数在此解析（id | current | 标题），
多候选 / 缺失返回明确错误，绝不猜测。

## DocumentBridge（src/document/document-bridge.ts）

包一层 Provider：持有"文档 + 选中节点"，订阅 Provider 事件并**重新对齐选中**
（文档变化后选中失效则清理），对外提供 `resolveNode`、`selectNode`、
`getDocument`、`nodeDepthOf` 等视图层友好 API。

## 与 dsh-structured-document 的集成（已实现）

dsh-structured-document 已把文档内核暴露为 cordis 服务
`ctx.structuredDocument`（`StructuredDocumentService`：selectNode /
setCurrentFile / subscribe / getDocumentSnapshot；工作区变化事件
bound/document/selection/unbound）。本插件的配合方式：

- **宿主半区**：`ctx.get('structuredDocument')` 探测服务（软依赖）→
  `HostDocumentIntegrator` 订阅会话工作区变化，把文档快照 / 选中经
  View 桥推送到浏览器；客户端 `select-node` / `current-file` 上行消息
  反写回服务。
- **浏览器端**：`HostBackedDocumentProvider`（实现本接口）从宿主推送的
  文档镜像提供数据；客户端收到 `hello-ack` 声明 `structuredDocument: true`
  即切到宿主源（`ViewRuntime` 换 DocumentBridge，渲染/工具/技能零改动）；
  未收到 hello-ack 前处于 `connecting` 空数据源，不展示示例数据。
- **当前文件联动**：better-sidebar 快照 → 活动编辑器文件（`.md`）→
  `setCurrentFile` → 懒绑定 / 按需重绑（解析 Markdown 为 IR）。

服务缺失时集成层不激活：客户端收到 `hello-ack` 明确 `structuredDocument: false`
后才进入 `mock`（内置示例数据 + 显式标识，独立可用）；未握手则停在
`connecting` 空状态，绝不默认展示示例数据（见 F010）。
dsh-structured-document 侧的改动最小且向后兼容：SessionWorkspace 增加
变化事件、注册服务、接线 InMemoryCurrentFileStore（其 TODO 预留的接缝）。
