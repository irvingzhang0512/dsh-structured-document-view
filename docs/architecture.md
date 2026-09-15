# 架构设计（Architecture）

> 本文件记录 dsh-structured-document-view 的架构与设计决策（DD）。
> 需求文档中的假设与 DSH / dsh-better-sidebar 真实 API 冲突之处，以本文件
> 的决策为准（产品目标不变，实现取舍记录如下）。

## 1. 定位

一个 **DSH 插件（Plugin）**：复用 dsh-better-sidebar 的侧边栏（Tab / 文件展示
区域 / 插件扩展接口 / 生命周期），为"结构化文档"提供三种可切换视图
（Markdown / 思维导图 / 表格），并通过 **View Tool + 中文 Skill** 让 Agent
与用户控制"视图状态"，通过 **Document Bridge + Document Provider 接口** 与
`dsh-structured-document` 解耦集成。

```
┌───────────────────────────────────────────────────────────────────┐
│ 浏览器（客户端半区）                                               │
│                                                                    │
│  TabView ── MarkdownView / MindMapView / TableView                 │
│      │                                                             │
│      ▼                                                             │
│  ViewRuntime（每会话一个）                                          │
│      ├── DocumentBridge ── DocumentProvider（当前：Mock）           │
│      ├── ViewStateStore（权威视图状态，纯 reducer）                 │
│      └── 命令执行（set_view / expand_node / ...）                  │
│      │                                                             │
│      ▼  状态镜像（ViewStateWire）                                  │
│  ViewBridgeClient ── WebSocket ──► ViewBridgeServer（宿主）        │
└──────────────────────────────────────┬─────────────────────────────┘
                                       │
┌──────────────────────────────────────▼─────────────────────────────┐
│ 宿主（Node 半区）                                                   │
│  ViewMirrorStore（每会话状态镜像） ◄── 客户端推送                    │
│  ViewBridgeServer（命令派发 / 入队重放 / ack）                      │
│  View Tools（17 个，读镜像 + 派发命令） ──► ctx.tools               │
│  自注册 SKILL.md ──► ctx.skills                                     │
└───────────────────────────────────────────────────────────────────┘
```

## 2. 模块划分

| 目录 | 内容 | 运行环境 |
| --- | --- | --- |
| `src/shared/` | IR 类型、视图状态 reducer、视图树、wire 编解码、共享类型 | 宿主 + 客户端 |
| `src/document/` | DocumentProvider 接口、节点引用解析、Mock Provider、Document Bridge | 宿主语义 + 客户端 |
| `src/client/` | 客户端入口、会话管理、运行时、Sidebar 适配层、三种视图、样式 | 浏览器 |
| `src/host/` | 镜像存储、桥服务器、socket 适配、信任围栏、技能注册 | Node |
| `src/tools/` | 17 个 View Tool | Node |
| `skills/` | 随包发布的中文 Skill | 文档/技能 |
| `examples/` | 三类示例文档（meeting / project / thinking） | 数据 |

## 3. 设计决策（Design Decisions）

### D1 客户端权威视图状态 + 宿主镜像（沿用 controller 桥接模式）

View State 的唯一权威在**浏览器客户端**（`ViewStateStore`，纯 reducer 不可变
更新）；宿主只保留最近一次镜像（`ViewMirrorStore`）与命令通道（`ViewBridgeServer`）。
工具**读镜像、派发命令**，客户端执行后 ack 并推送新镜像。这是
dsh-better-sidebar-controller 的成熟模式，避免宿主/客户端双写竞态。

### D2 同步 DocumentProvider（V0.1）；桥是未来异步接缝

`DocumentProvider` 接口当前为**同步**（`getDocument(): StructuredDocument | null`
等），理由是 Mock 数据源与未来 `dsh-structured-document` 的
`SessionWorkspace.getDocument()` 同步可得；一旦真源变为异步（网络 / IPC），
只需把接口改为 Promise 并在 DocumentBridge 内等待——**工具与视图不感知**。
该桥即异步接缝。

### D3 自包含轻量 Markdown 渲染器

不直接复用 dsh-better-sidebar 的编辑器/marked 实例：DSH 客户端 bundle 相互隔离
（跨插件 value import 被禁止），且 `openFile` 需要临时文件、与"展示当前文档"
语义不符。V0.1 自实现覆盖结构化文档常见语法的轻量渲染器
（标题 / 段落 / 列表 / 任务项 / 行内样式 / 表格 / 代码块 / 链接），HTML 一律按
文本处理（安全）。

### D4 布局：mind / logical / down，无鱼骨图

需求文档提到过"鱼骨图"，但 mind-elixir v5 无对应布局；V0.1 提供
`mind`（两侧）/ `logical`（右侧，即"从左到右"）/ `down`（上下）三种，
映射到 mind-elixir direction（2 / 1 / 3）。未来可在 `MIND_MAP_LAYOUTS` 增补。

### D5 层级语义：根 = 1 层，0 表示不限；显式展开突破层级

`depth` 表示"显示到第几层"（根 = 1），`0` / `null` = 不限。层级限制
**对叶子节点同样生效**（早期只对"有子节点"的节点判定，已修复）。显式展开
（`expanded_node_ids` 中的节点或其祖先）会突破层级限制——这是
"只显示两层，然后展开第二个议题"这类组合指令生效的关键。三种视图（视图树）
对层级解释完全一致。

### D6 Mock 默认文档 = thinking，UI 提供文档切换

默认加载 `thinking`（思路整理）；Toolbar 的文档下拉可在三份示例间切换
（`MockDocumentProvider.setActiveDocument`，Mock 专属能力）。切换即清理选中
（旧文档节点在新文档中无意义）。每个 Provider 实例持有**独立文档副本**，
`mockMutate` 的变更不跨实例泄漏。

### D7 拖拽禁用；moveNode 事件契约定义为未来扩展

V0.1 思维导图 `editable: false`（只读展示）。需求要求区分"视觉位置"与
"父子关系变更"：前者属于 View State（pan / zoom），后者属于文档变更
（未来 `move_node`）。mind-elixir 的 `operation` 事件可观测到
`moveNodeAfter / moveNodeBefore / moveNodeIn`，接口与 Mock 验证已就绪，
但**视图插件不直接修改文档 IR**——未来由数据源侧（dsh-structured-document）
提供移动节点能力，本插件经 Document Bridge 转发。

### D8 桥端点与信任围栏

桥 WebSocket 端点：`/structured-document-view/ws?sessionId=…`（与 controller
同风格）。升级请求过 `isTrustedApiRequest`（回环 / trustedHosts +
sec-fetch-site 非同站 + origin 主机名校验），拒绝直接 destroy。

### D9 工具节点参数：id | current | 标题，客户端解析

`expand_node / collapse_node / focus_node` 的 `node` 接受：Node ID、别名
`current`（= `@selected` / `@current` / `@focused`，缺省值）、或标题（精确优先，
否则包含匹配；多候选返回 `MULTIPLE_NODES_FOUND` 与候选列表）。Agent 先
`get_view_state` 从 outline 拿 Node ID 是标准流程（SKILL 有指引）。

### D10 mind-elixir v5.15.1 固定；CSS 构建期内联

`mind-elixir` 锁定稳定版 `^5.15.1`（npm dist-tag "latest" 指向 6.0.0-next
预发布，需显式指定）。其样式 `MindElixir.css` 由 `scripts/inline-css.mjs` 在
构建期生成 `src/client/generated/mind-elixir-style.ts`（不提交），客户端运行时
注入 `<style>`——DSH 浏览器闭包无法在运行时访问 node_modules。

### D11 宿主文档集成：`ctx.structuredDocument` 软依赖 + 双向桥

与 `dsh-structured-document` 的配合（已实现）：
- 数据真源在宿主端（WorkspaceRegistry）；该插件把内核暴露为 cordis 服务
  `ctx.structuredDocument`（`StructuredDocumentService`：selectNode /
  setCurrentFile / subscribe / getDocumentSnapshot）。
- 本插件宿主半区用 `ctx.get('structuredDocument')` **免 inject 探测**
  （cordis reflect；服务缺失返回 undefined）：服务存在 → 激活
  `HostDocumentIntegrator`；缺失 → 不激活，客户端回退 Mock（两插件
  独立可用）。**inject 里不声明它**，避免 cordis 硬依赖。
- 数据流：宿主订阅会话工作区变化（bound/document/selection/unbound）→
  推 `document` / `selection` 桥消息 → 浏览器 `HostBackedDocumentProvider`
  更新镜像（运行时从 Mock 切到宿主源）；用户点节点 → `select-node` 上行 →
  `SessionWorkspace.selectNode`（双向同步闭环）。
- **握手能力协商**：hello 应答 `hello-ack` 携带 `structuredDocument` 标志
  （桥构造时由宿主注入），客户端据此**开机即定数据源模式**——不再等第一条
  document 消息隐式激活，消除了"先渲染 Mock 再切换"的闪烁；未绑定时自然
  呈现空态（提示打开 Markdown）。
- **推送去重**：宿主按 (revision, 选中, 当前文件) 三元组去重，客户端同款
  防御——Agent 连续操作不会重复全量推送/重渲染；currentFile 变化（同文件
  重绑）仍会推送。
- 桥消息扩展：下行 `hello-ack` / `document` / `selection`，上行
  `select-node` / `current-file`（wire 严格校验）。
- 集成层只依赖**结构类型**（不 import dsh-structured-document 的代码），
  服务形状变化时类型检查即失败。

### D12 当前文件联动（better-sidebar → dsh-structured-document）

better-sidebar 快照不含"当前文件"字段，由本插件按 controller 同款逻辑从
`SidebarState` 推导（active pane 的 active editor tab，`sidebar-file.ts`）。
当前文件变化 → `current-file` 桥消息 → `StructuredDocumentService.setCurrentFile`
→ 触发 dsh-structured-document 懒绑定/按需重绑（解析 Markdown 为 IR）。
仅 `.md / .markdown` 文件参与联动；非 Markdown 文件发送 null（清除指针，
不自动解绑内存文档）。

## 4. 数据流

**文档变化**（Document Changed）：Provider 触发 `document-changed` →
DocumentBridge 重新读取 → 重新对齐选中（失效则清理）→ 运行时刷新视图状态
并推送镜像。V0.1 为全量刷新（无增量），由 `ViewTree` 折叠"IR + ViewState"。

**节点点击**（Node Click）：MindMap `selectNodes` 事件 → 运行时
`handleUserSelectNode(id)` → `bridge.selectNode(id)`（文档侧当前节点同步）+
更新 ViewState.selectedNodeId → 推送镜像。

**工具命令**（Tool Command）：宿主 Tool `dispatch` → 桥 → 客户端执行
`ViewRuntime.applyCommand`（只改 View State）→ ack → 推送新镜像。客户端未连接
时命令入队，连接后（hello）重放。

**原则**：View 不是数据源，结构化文档 IR 才是。所有视图工具只改 View State。

## 5. 与 dsh-structured-document 的配合（已实现）

数据真源 = dsh-structured-document 的会话工作区（宿主端），本插件提供
"视图 + 视图状态 + 当前文件联动"：

```
dsh-structured-document（宿主）                dsh-structured-document-view
┌───────────────────────────────┐             ┌──────────────────────────────────┐
│ WorkspaceRegistry（每会话）     │  ctx.       │ 宿主半区                         │
│  SessionWorkspace             │──provide──▶│  ctx.get('structuredDocument')   │
│   ├ bindFile(解析 Markdown)    │             │  HostDocumentIntegrator         │
│   ├ 14 个工具（改文档）         │◀──命令──────│   ├ 订阅工作区变化 → document/    │
│   ├ selectNode/selectedNode    │             │  │   selection 桥消息             │
│   └ 变化事件（bound/document/  │──快照推送──▶│   └ select-node/current-file 上行│
│     selection/unbound）        │             │  ViewBridgeServer                │
└───────────────┬───────────────┘             └───────────────┬──────────────────┘
                │                                             │ WebSocket
                ▼                                             ▼
       当前文件联动：                         浏览器端：HostBackedDocumentProvider
       better-sidebar 快照 →                  （收到宿主推送即从 Mock 切换；
       current-file 消息 → setCurrentFile     点节点 → select-node 回宿主）
```

要点（见 D11/D12）：
- **软依赖**：宿主 `ctx.get` 探测，不声明 inject；客户端收到宿主文档推送才
  切数据源，未收到则用 Mock（两个插件各自独立可用，装齐自动配合）；
- **单向真源**：文档只能被 dsh-structured-document 修改（其 14 个工具 /
  Skill），本插件的视图工具只改 View State；"选中"双向同步；
- **当前文件联动**：浏览器打开 `.md` 文件 → setCurrentFile → 懒绑定 /
  重绑（解析为 IR 并回推视图）。

## 6. 测试策略

- 纯模块（reducer / 视图树 / 节点解析 / 适配层 / wire / Mock）在 Node 直接测试；
- 桥（派发 / 入队重放 / ack 超时 / 镜像）用桩发送器测试；
- 工具用注入 fake deps 测试（真实 `registerViewTools`）；
- Skill 契约 + 端到端：真实工具 + 真实桥 + 真实 ViewRuntime 跑通中文意图链路；
- 浏览器组件（mindmap / React）不在 Node 单测，由构建 + 类型检查兜底。
