# 架构设计（Architecture）

目标版技术契约：见 [DSH 0.2.0-rc.2 升级适配](DSH-UPGRADE-20261011.md)（`dsh-upgrade-20261011-v1`，待确认／待实现）。本文原宿主 API 和设置存储说明保留作为当前组合基线；目标版采用该补充中的接口、配置迁移与验收边界，不将旧 API 继续当作目标版可用接口。

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
│      ├── DocumentBridge ── DocumentProvider（见 D13）              │
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
| `src/document/` | DocumentProvider 接口、空数据源（拟新增）、节点引用解析、Mock Provider、Document Bridge | 宿主语义 + 客户端 |
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

### D6 Mock 默认文档 = thinking，UI 提供文档切换（仅 `mock` 状态）

只在数据源状态为 `mock`（宿主明确声明无文档内核）时加载 `thinking`（思路整理）；
Toolbar 的文档下拉可在三份示例间切换（`MockDocumentProvider.setActiveDocument`，
Mock 专属能力）。切换即清理选中（旧文档节点在新文档中无意义）。每个 Provider
实例持有**独立文档副本**，`mockMutate` 的变更不跨实例泄漏。`mock` 状态的边界
与标注要求见 D13。

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
  `HostDocumentIntegrator`；缺失 → 不激活，hello-ack 回
  `structuredDocument: false`，客户端据此才进入示例数据模式（见 D13）。
  **inject 里不声明它**，避免 cordis 硬依赖。
- 数据流：宿主订阅会话工作区变化（bound/document/selection/unbound）→
  推 `document` / `selection` 桥消息 → 浏览器 `HostBackedDocumentProvider`
  更新镜像（运行时切到宿主数据源）；用户点节点 → `select-node` 上行 →
  `SessionWorkspace.selectNode`（双向同步闭环）。
- **握手能力协商**：hello 应答 `hello-ack` 携带 `structuredDocument` 标志，
  客户端据此**在首帧之后立即定数据源模式**：`true` → 宿主源，`false` → 示例
  数据。握手完成前处于 `connecting` 空数据源（不渲染任何文档内容，见 D13），
  因此既没有"先渲染示例数据再切换"的闪帧，也不会把示例数据当成当前文档；
  未绑定时自然呈现空态（提示打开 Markdown）。
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

### D13 数据源状态机：`connecting` / `host` / `mock`（F010，待实现）

运行时的数据源是显式状态，而不是"默认 Mock、收到推送再换"：

- `connecting`：初始态，尚未收到 `hello-ack`（含重连中）。bridge 指向
  `EmptyDocumentProvider`（文档恒 null），内容区显示连接中提示，隐藏示例
  文档切换器；文档类命令返回 `SOURCE_NOT_READY`，不对示例数据假装成功。
- `host`：`hello-ack.structuredDocument === true` → `switchToHost()`；
  未绑定文档时显示空状态。
- `mock`：`hello-ack.structuredDocument === false` → `switchToMock()`；
  启用内置示例数据，且界面必须有"示例数据"标识（内容区提示条 + 状态栏）。

不变量：未握手不等于"无内核"，只有宿主明确声明 `false` 才允许展示示例数据；
状态单向（`connecting → host | mock`），断线保留当前画面与数据源、只标注重试，
不回落示例数据。原设计"初始即 Mock"是 `ViewRuntime` 构造时固定使用
`MockDocumentProvider` 所致（旧实现），已由本决策取代。

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
│   ├ 17 个工具（改文档）         │◀──命令──────│   ├ 订阅工作区变化 → document/    │
│   ├ selectNode/selectedNode    │             │  │   selection 桥消息             │
│   └ 变化事件（bound/document/  │──快照推送──▶│   └ select-node/current-file 上行│
│     selection/unbound）        │             │  ViewBridgeServer                │
└───────────────┬───────────────┘             └───────────────┬──────────────────┘
                │                                             │ WebSocket
                ▼                                             ▼
       当前文件联动：                         浏览器端：HostBackedDocumentProvider
       better-sidebar 快照 →                  （握手声明有内核即切宿主源；
       current-file 消息 → setCurrentFile     点节点 → select-node 回宿主）
```

要点（见 D11/D12/D13）：
- **软依赖**：宿主 `ctx.get` 探测，不声明 inject；客户端按 `hello-ack` 明确
  决定数据源（`true` → 宿主源、`false` → 示例数据），握手前是 `connecting`
  空状态，不会把示例数据当当前文档（两个插件各自独立可用，装齐自动配合）；
- **单向真源**：文档只能被 dsh-structured-document 修改（其 17 个工具 /
  Skill），本插件的视图工具只改 View State；"选中"双向同步；
- **当前文件联动**：浏览器打开 `.md` 文件 → setCurrentFile → 懒绑定 /
  重绑（解析为 IR 并回推视图）。

## 6. 测试策略

- 纯模块（reducer / 视图树 / 节点解析 / 适配层 / wire / Mock）在 Node 直接测试；
- 桥（派发 / 入队重放 / ack 超时 / 镜像）用桩发送器测试；
- 工具用注入 fake deps 测试（真实 `registerViewTools`）；
- Skill 契约 + 端到端：真实工具 + 真实桥 + 真实 ViewRuntime 跑通中文意图链路；
- 浏览器组件（mindmap / React）不在 Node 单测，由构建 + 类型检查兜底。

## 2026-10-18 统一展示与套件交付契约

依据用户已确认的 office-suite-implementation-20261018-v1。Irving · 结构化文档视图／Irving · Structured Document Views，包 dsh-structured-document-view 统一 0.2.1-rc.2+rev.1。展示资源通过 locale 导出提供；原条目 id、服务／工具／客户端身份、配置及存储保持。组合分组为 dsh-office-bundle-members；保留本成员原始 patch 行，用户覆盖继续按原 id 命中；子开关不因总开关恢复而重置。版本按完整字符串与固定散列核对；本节不授权原先待确认的业务扩展。
