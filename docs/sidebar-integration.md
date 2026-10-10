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

## 配置契约（侧边卡片设置）

本插件的用户设置挂在 better-sidebar 自己注册的**设置 → 侧边卡片**页
（`settings.section`，`id: better-sidebar`，`order: 100`，页面组件 `SideCardSection`；
页名取自该插件的 locale，中文界面为「侧边卡片」）。本插件不新增自己的设置页，
也不读宿主 `dsh-settings` 命名空间。

### 字段

| 键 | 控件 | 取值 | 默认 | 含义 |
| --- | --- | --- | --- | --- |
| `autoOpenTab` | `switch` | `true` / `false` | `true` | 会话首次激活时自动打开「结构化文档」页签；关闭后只注册页签，不主动打开（工具 `open_view_tab` 与页签点击仍可用）。 |
| `defaultView` | `select` | `markdown` / `mindmap` / `table` | `markdown` | 新会话／新运行时的初始视图。 |
| `defaultLayout` | `select` | `mind` / `logical` / `down` | `logical` | 新会话／新运行时思维导图的初始布局。 |
| `defaultMindmapDepth` | `number` | 整数，`min: 0` | `2` | 新会话／新运行时思维导图的初始层级；`0` 表示不限层级。 |

字段名与 `pluginSettings['structured-document-view']` 中的键**逐字一致**，不做 snake_case
转换（该机制不经过宿主 PrefsSchema，键由本插件自己定义）。

`defaultMindmapDepth` 的 `0` 需映射为视图状态内部的 `null`
（`ViewState.viewDepths.mindmap` 是 `number | null`，`null` 才表示不限层级）——
控件返回 `0` 与内部「不限」不是同一个值，转换必须显式且可测。

### 依赖的 better-sidebar 扩展机制

| 项 | 事实 |
| --- | --- |
| 声明入口 | `registerTab(TabDescriptor)` 的 `settings.pluginToggles`（**v0.12.0+**）；`toggles` 的键必须是 better-sidebar 宿主 PrefsSchema 的字段（非该 schema 的键会被设置层丢弃），本插件不能用它。 |
| 键的所有权 | `pluginToggles` 的键是插件本地键，不查宿主 PrefsSchema，因此不需要在宿主侧注册任何字段。 |
| 持久化位置 | better-sidebar 自己的设置文档，`SidebarPrefs.pluginSettings[<描述符 id>]`，本插件即 `pluginSettings['structured-document-view']`；值为 JSON 可序列化（字符串／数字／布尔）。 |
| 控件 | `SidebarSettingToggleType` = `switch` / `text` / `number` / `select`；`number` 在提交时按 `min` / `max` 收敛，`select` 用 `options`（`multi` 默认 false）。**注意**：`pluginToggles` 的类型注释只列举 `switch` / `text` / `number`，`select` 由共用类型定义；实现时以 0.19.1 实际渲染为准并做一次页面核对。 |
| 读回方式 | 公开快照 `service.getSnapshot().prefs.pluginSettings['structured-document-view']`（`SidebarSnapshot.prefs` 就在快照里，prefs 变更会触发 `subscribeState` 回调），因此**不需要**新增订阅或直连私有 store。 |
| 何时可改 | 设置行只在对应卡片启用时可达：`prefs.tabsEnabled['structured-document-view'] !== false` 才渲染齿轮入口（缺省为启用；显式 `false` 时该页签类型从 + 菜单隐藏、`openTab` 拒绝）。 |
| 自定义面板 | `settings.render`（v0.12.0+）入参含 `prefs`、该描述符的 `pluginSettings` blob、`updatePluginSetting(key, value)`、`close()`。类型注释称它「取代行列表」，但 **0.19.1 的实现是在行列表之后追加**（`SettingsBody`：先 `toggles`／`pluginToggles`，再 `render`）。本版用 `pluginToggles` 行，不用 `render`，避免依赖这一差异。 |

### 能力差异（与宿主插件配置卡片相比）

这套机制是**开放映射**，不是带事务的配置卡片：

- 没有「重置为默认值」，也没有「该字段已被用户覆盖」的标记——只能读到「有没有这个键」，
  「清除覆盖」需要由本插件自己删除键（本版不提供）；
- 没有 revision／CAS 冲突保护（插件配置卡片有），并发写入以最后一次为准；
- 取值校验由本插件自己承担（`pluginToggles` 的 `min` 只约束控件输入；直接改写设置文档
  或旧版本遗留的字符串值必须按非法处理，见「优先级与回退」）。

### 优先级与回退

1. `pluginSettings['structured-document-view']` 里存在该键且取值合法 → 用它；
2. 键缺失、类型不符或取值不在枚举内 → 回落到本插件内置默认（即上表「默认」列，
   也是本变更前的硬编码值），并保持插件可用；
3. `dsh-better-sidebar` 未安装或低于 0.12.0（描述符没有 `pluginToggles` 支持）→ 四项
   全部回退内置默认，插件照常挂载、照常渲染页签，**不得**因为缺少设置能力而报错或
   不挂载；这属于已有的软依赖边界（见上文「软依赖」），只使用公开 `service` 面。

## TabView（src/client/views/tab-view.tsx）

better-sidebar 传 `TabComponentProps`（含 `scope.sessionId`、`visible`）。
TabView 按会话从 `ViewSessionManager` 取运行时，订阅其状态并渲染：

- 工具栏：视图切换 / 文档切换（仅 `mock` 状态可见）/ 层级 / 布局（思维导图）/ 筛选 / 重置；
- 状态栏：数据源与连接状态（正在连接 / 结构化文档 + 当前文件 + revision / 示例数据）；
- 内容区：按 `currentView` 渲染三种视图之一；`connecting` 显示连接中提示，
  无文档显示空状态，`mock` 额外显示"示例数据"提示条；
- `visible === false` 时不渲染内容（节省资源）。

## 生命周期

客户端 `apply(ctx)`：

1. 注入插件样式（幂等）；
2. `SidebarAdapter.registerTab()` 注册页；
3. 订阅 better-sidebar 状态，跟随活动会话：会话变化 →
   `ViewSessionManager.setActiveSession(id)`（关闭旧连接、连新桥、懒建运行时）；
   会话首次激活时自动打开「结构化文档」页签（`openViewTab`）——页签随即可见，
   但内容区在握手完成前是 `connecting` 空状态，不会先显示示例数据；
4. **当前文件联动**：从快照推导活动编辑器文件（`sidebar-file.ts`，
   active pane 的 active editor tab）→ `.md / .markdown` 文件经
   `current-file` 桥消息同步给宿主文档服务（dsh-structured-document
   据此懒绑定/重绑）；非 Markdown 发送 null（清除指针）；
5. `ctx.effect` 返回 disposer：退订 + `disposeAll()`（断开桥、释放运行时）。

会话切换时，各会话的运行时（文档 + 视图状态）按会话保留，切回不丢状态。

## 数据源切换（connecting / host / mock）

- 客户端启动后先进入 `connecting`：内容区显示"正在连接视图桥…"，不渲染任何
  文档，也不显示示例文档切换器；
- 未装 dsh-structured-document：宿主 `hello-ack` 回 `structuredDocument: false`
  → 进入 `mock`，浏览器端用内置示例数据（文档切换下拉可见，界面必须带
  "示例数据"标识）；
- 已装 dsh-structured-document：`hello-ack` 回 `true` → 进入 `host`，
  运行时从空数据源切到 `HostBackedDocumentProvider`（文档切换下拉隐藏；
  状态栏显示当前文件与 revision；未绑定时显示空状态）；
- 断线保留当前数据源与画面，只标注重试中，不回落为示例数据；
- 切换是**软依赖 + 显式协商**：两个插件各自独立可用，装齐自动配合；示例数据
  只在宿主明确声明无内核时出现（见 SPEC F010）。
