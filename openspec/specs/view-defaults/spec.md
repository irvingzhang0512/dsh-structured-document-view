# F011 侧边卡片设置（默认视图与自动打开）

## Purpose

为 dsh-structured-document-view 的侧边卡片设置（默认视图与自动打开）维护唯一可编辑的行为与验收规格，保留原编号 F011，区分当前预期、尚未实现设计和历史验证；原始需求、项目资料及旧文档继续原位只读保留。

## Requirements

### Requirement: F011 侧边卡片设置（默认视图与自动打开）

系统 SHALL 按下列完整场景落实侧边卡片设置（默认视图与自动打开）的预期、边界与验收。本节迁入已有功能规则；本次仅迁移文档，没有重新执行产品验收。

#### Scenario: F011-S01 场景与预期

- **WHEN** 用户设置默认视图或显式重置
- **THEN** 场景与预期：本插件在 better-sidebar 的**设置 → 侧边卡片**页（`settings.section`，id `better-sidebar`）暴露自己的设置行，字段与语义见 [sidebar-integration.md](../../../docs/sidebar-integration.md)「配置契约」：`autoOpenTab`（`switch`，默认 `true`）、`defaultView`（`select`：`markdown`／`mindmap`／`table`，默认 `markdown`）、`defaultLayout`（`select`：`mind`／`logical`／`down`，默认 `logical`）、`defaultMindmapDepth`（`number`，默认 `2`，最小 `0`，`0` 表示不限层级）。四项取代原来的硬编码：`autoOpenTab` 恒为真的自动打开，以及 `currentView: 'markdown'`／`layout: 'logical'`／`viewDepths.mindmap: 2` 的内置默认。设置经 better-sidebar 的 `settings.pluginToggles`（v0.12.0+）声明并持久化在 `pluginSettings['structured-document-view']`，运行时用公开快照读回。

#### Scenario: F011-S02 边界与异常

- **WHEN** 用户设置默认视图或显式重置
- **THEN** 边界与异常：
    - **软依赖**：`dsh-better-sidebar` 缺失或低于 0.12.0（描述符没有 `pluginToggles`）时，四项全部回退为现有硬编码默认值（`true`／`markdown`／`logical`／`2`），插件照常挂载、页签照常渲染，不因缺少设置能力而失败；只用公开 `service`（`registerTab`／`getSnapshot`／`subscribeState`／`openTab`），不依赖该插件的私有 store。
    - **优先级**：侧边卡片里设置过就用它；键缺失、类型不符或取值不在枚举内则回落本插件内置默认。该机制**没有**「重置为默认值」和「字段已被覆盖」标记，也**没有** revision／CAS 冲突保护（那些是宿主插件配置卡片的能力），并发写入以最后一次为准；本版不提供「清除覆盖」入口。
    - **可达性**：设置行只在对应卡片启用时渲染——`prefs.tabsEnabled['structured-document-view'] !== false`（缺省为启用）；显式关闭该页签类型时设置入口一并消失。
    - **不追溯**：配置只影响**新会话／新运行时**的初始视图状态，不改写已存在会话当前已经持有的视图状态；也不改文档内容。视图状态与文档内容分离的既有边界（视图只影响「怎么看」，见 F002）不因本功能改变。
    - **越界取值**：`defaultMindmapDepth` 只会按控件契约收到 `min: 0` 的整数，但直接改写设置文档或旧版本遗留值可能越界或非数字，必须按非法取值回落默认，不做隐式截断或抛出。
    - `defaultMindmapDepth = 0` 需映射为内部 `null`（`viewDepths.mindmap` 的 `null` 才表示不限层级），不能把 `0` 直接写进层级判断。
    - **「恢复默认视图」的口径（已定：采用侧边卡片默认值）**：`resetView`（工具栏「重置」与工具 `reset_view`，[../src/shared/view-state.ts](../../../src/shared/view-state.ts)）实现前直接调用 `createDefaultViewState()`；本版要求它重置到侧边卡片里配置的默认值（与「新运行时」口径一致；它是用户显式要求的动作，不属于追溯改写已存在会话的当前状态）。用户已于 2026-10-10 选定该口径，不再提供“恒用内置默认”的备选。实现方式见下方实现依据（`resetView(state, initial)`）。

#### Scenario: F011-S03 验收条件

- **WHEN** 用户设置默认视图或显式重置
- **THEN** 验收条件：
    - A1：默认配置（四个键都未设置）下行为与本变更前一致：新会话自动打开页签、初始 `markdown`、布局 `logical`、导图层级 2。
    - A2：`autoOpenTab: false` 时新会话不再自动打开页签，工具 `open_view_tab` 与手动点击页签仍可打开。
    - A3：`defaultView: 'mindmap'`／`'table'` 时，新会话初始视图为对应视图；`defaultLayout` 三个取值在思维导图初始布局上生效。
    - A4：`defaultMindmapDepth: 0` 时新会话思维导图为不限层级，`3` 时为 3 层。
    - A5：改设置后，**已存在**会话当前的视图状态不变；新建会话／新运行时才采用新默认。
    - A6：非法值（类型不符、`defaultView: 'kanban'`、`defaultMindmapDepth: -1` 或非数字）回落内置默认且不抛错、不阻断挂载。
    - A7：模拟没有 `pluginToggles` 能力的 better-sidebar（软依赖缺失或 < 0.12.0）时插件仍挂载、页签仍注册、四项均为内置默认。
    - A8：设置行出现在「设置 → 侧边卡片」的本插件卡片下；关闭该卡片后设置入口不再可达（回归项，页面核对）。
    - A9：「恢复默认视图」（工具栏「重置」与工具 `reset_view`）重置到配置的 `defaultView`／`defaultLayout`／`defaultMindmapDepth`（未设置或非法时回落内置默认 `markdown`／`logical`／2；`0` 表示不限层级）；保留当前选中节点，见 F002 既有语义。
