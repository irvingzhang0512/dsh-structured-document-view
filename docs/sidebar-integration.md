# Sidebar 集成（Sidebar Integration）

复用 dsh-better-sidebar 的侧边栏体系（Tab / 文件展示区域 / 插件扩展接口 /
生命周期），不重复实现侧边栏、文件树、标签页。

## 软依赖

`dsh-better-sidebar` 是 **optional peerDependency**：

- **宿主半区**不依赖它——工具 / 桥 / 技能照常挂载；
- **客户端半区**（`src/client/index.ts`）`inject: ['betterSidebar']`：
  cordis 仅当 `ctx.betterSidebar` 服务可用时激活客户端半区，否则静默不装
  （视图页不出现，但 Agent 仍可用工具——命令入队，视图打开后自动应用）。

## SidebarAdapter（src/client/sidebar-adapter.tsx）

本插件所有对 `ctx.betterSidebar` 的接触**收敛在这一层**（未来 better-sidebar
升级 / 换宿主只改这一处）。使用其公开扩展点：

| better-sidebar 能力 | 用途 |
| --- | --- |
| `registerTab(TabDescriptor)` | 注册「结构化文档」侧边栏页（`single: true`，幂等聚焦） |
| `subscribeState(fn)` / `getSnapshot()` | 跟随当前活动会话（切换会话时重连桥） |
| `openTab(...)` | 按需打开视图页 |

注册的 Tab：

- `id` / `type`: `structured-document-view`
- `title`: 结构化文档
- `component`: `TabView`（懒引用，避免循环依赖）
- `order`: 90（+ 菜单排序靠前）

## TabView（src/client/views/tab-view.tsx）

better-sidebar 传 `TabComponentProps`（含 `scope.sessionId`、`visible`）。
TabView 按会话从 `ViewSessionManager` 取运行时，订阅其状态并渲染：

- 工具栏：视图切换 / 文档切换（Mock）/ 层级 / 布局（思维导图）/ 筛选 / 重置；
- 状态栏：当前文档（provider / revision）与当前节点；
- 内容区：按 `currentView` 渲染三种视图之一；
- `visible === false` 时不渲染内容（节省资源）。

## 生命周期

客户端 `apply(ctx)`：

1. 注入插件样式（幂等）；
2. `SidebarAdapter.registerTab()` 注册页；
3. 订阅 better-sidebar 状态，跟随活动会话：会话变化 →
   `ViewSessionManager.setActiveSession(id)`（关闭旧连接、连新桥、懒建运行时）；
4. **当前文件联动**：从快照推导活动编辑器文件（`sidebar-file.ts`，
   active pane 的 active editor tab）→ `.md / .markdown` 文件经
   `current-file` 桥消息同步给宿主文档服务（dsh-structured-document
   据此懒绑定/重绑）；非 Markdown 发送 null（清除指针）；
5. `ctx.effect` 返回 disposer：退订 + `disposeAll()`（断开桥、释放运行时）。

会话切换时，各会话的运行时（文档 + 视图状态）按会话保留，切回不丢状态。

## 数据源切换（Mock ↔ 结构化文档）

- 未装 dsh-structured-document：浏览器端用 Mock 数据源（文档切换下拉可见）；
- 已装 dsh-structured-document：宿主 `HostDocumentIntegrator` 激活，收到
  宿主文档推送后运行时从 Mock 切换为 `HostBackedDocumentProvider`
  （文档切换下拉隐藏；状态栏显示当前文件与 revision）；
- 切换是**软依赖 + 回退**：两个插件各自独立可用，装齐自动配合。
