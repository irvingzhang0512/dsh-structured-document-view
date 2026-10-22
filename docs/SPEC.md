# dsh-structured-document-view 当前功能规格

## 本次 Desktop 工作流文档版

文档版：`discussion-desktop-workflows-20261014-v1`（2026-10-14）。本次先落成[目标技术契约](DESKTOP-WORKFLOWS-20261014.md)，**具体文件待用户确认**；F012–F014 与 F001–F011 的相关目标适配待实现。旧包 0.4.0、历史实现及证据保留，新组合未验证；本版相关契约优先于 2026-10-11 历史升级草案。

本次升级文档版：`dsh-upgrade-20261011-v1`（2026-10-11，待用户确认）。F001–F011 的目标宿主适配与迁移验收见 [DSH 升级适配契约](DSH-UPGRADE-20261011.md)；本次变更待实现，尚未通过目标版本验证。其余功能与原有待确认设计保持原状态，下面的历史证据不自动证明 DSH 0.2.0-rc.2 兼容。

基线日期：2026-10-03；包版本：0.2.0；核对的源码提交：`4059ec3e8f378f4c19c92143f2020b60d3c05d01`。此提交是首次整理前的实现基线，后续文档提交不提高包版本。

本规格可编辑，功能任务先改预期与验收及相关技术契约，交用户明确确认该版文档后再开发；确认前不得修改对应源码／测试实现或运行配置。用户已明确要求按同一版文档实现且含义未变时，不重复询问；新增语义差异须重新确认，确认范围写入规格变更或任务交付记录。Bug 按已有且不变的预期直接定位源码。流程见 [根文档驱动开发规范](../../docs/DOC-DRIVEN-DEVELOPMENT.md)。原始需求保持只读，技术文档保留现有名称。

依据与技术入口：[../requirements.md](../requirements.md)、[architecture.md](architecture.md)、[views.md](views.md)、[tools.md](tools.md)、[document-provider.md](document-provider.md)、[sidebar-integration.md](sidebar-integration.md)。

实现状态与验证状态分别记录。“已实现”表示有当前源码依据，不表示本次已通过运行测试。下面的测试链接是核对过的现有验证入口；2026-10-03 本次只静态核对源码、测试与文档，没有运行产品测试、构建、GUI 或外部服务验证。具体遗漏见条目与末尾待办。

## F001 文档 Provider 与会话隔离

- 实现状态：已实现。
- 场景与预期：通过 Document Bridge 获取结构化文档及选择；宿主未安装文档内核时提供会议／项目／思路 Mock；按会话管理连接与状态。
- 边界与异常：固定目标由工作台优先协调，普通浏览可由文件桥提供；无文档需显示空状态；示例数据只在宿主明确声明"无文档内核"时使用，"尚未握手"不等于"无内核"（见 F010）。
- 验收条件：切换会话不串状态；安装内核时读取实际 IR；无内核时 Mock 可读。
- 实现依据：[../src/host/document-integrator.ts](../src/host/document-integrator.ts)、[../src/client/document/host-backed-provider.ts](../src/client/document/host-backed-provider.ts)、[../src/client/session-manager.ts](../src/client/session-manager.ts)、[../src/document/mock-provider.ts](../src/document/mock-provider.ts)。
- 验证记录：2026-10-03 静态核对；已有测试入口：[../tests/document-integrator.spec.ts](../tests/document-integrator.spec.ts)、[../tests/host-backed-provider.spec.ts](../tests/host-backed-provider.spec.ts)、[../tests/session-manager.spec.ts](../tests/session-manager.spec.ts)、[../tests/mock-provider.spec.ts](../tests/mock-provider.spec.ts)（覆盖范围以用例为准，本次未执行）。

## F002 视图状态与内容分离

- 实现状态：已实现。
- 场景与预期：Markdown／思维导图／表格共用文档 id，独立保存视图、选择、展开、深度、布局、过滤和视口状态。
- 边界与异常：视图操作不改文档正文；各视图深度独立；根深度为 1、0 表示不限，显式展开路径优先；表格不按折叠隐藏行。
- 验收条件：切换视图保留对应设置；设置过滤／深度后文档内容不变；重置只重置视图。
- 实现依据：[../src/shared/view-state.ts](../src/shared/view-state.ts)、[../src/shared/view-tree.ts](../src/shared/view-tree.ts)、[../src/client/view-state-store.ts](../src/client/view-state-store.ts)。
- 验证记录：2026-10-03 静态核对；已有测试入口：[../tests/view-state.spec.ts](../tests/view-state.spec.ts)、[../tests/view-tree.spec.ts](../tests/view-tree.spec.ts)、[../tests/adapters.spec.ts](../tests/adapters.spec.ts)（覆盖范围以用例为准，本次未执行）。

## F003 Markdown 阅读器

- 实现状态：已实现。
- 场景与预期：默认大纲＋章节阅读，选节点读取该章节，可切换全文、前后导航、面包屑和搜索；未选择时显示概览。
- 边界与异常：章节阅读不继承思维导图的 depth／collapse 截断；大纲搜索包含标题、正文、角色、属性并有数量上限；窄屏大纲用抽屉。
- 验收条件：正文可完整阅读；切换章节选择同步；全文模式高亮当前节点；搜索可定位，窄屏需 GUI 回归。
- 实现依据：[../src/client/views/markdown-view.tsx](../src/client/views/markdown-view.tsx)、[../src/client/views/markdown-render.tsx](../src/client/views/markdown-render.tsx)、[../src/client/adapters/outline.ts](../src/client/adapters/outline.ts)。
- 验证记录：2026-10-03 静态核对；已有测试入口：[../tests/reader.spec.ts](../tests/reader.spec.ts)、[../tests/markdown-render.spec.ts](../tests/markdown-render.spec.ts)、[../tests/viewport-runtime.spec.ts](../tests/viewport-runtime.spec.ts)（覆盖范围以用例为准，本次未执行）。

## F004 只读思维导图与视口

- 实现状态：已实现。
- 场景与预期：基于 Mind Elixir 显示节点，支持 mind／logical／down 布局、深度、展开、缩放、平移、fit 与 reset；点击选择，双击读正文。
- 边界与异常：节点编辑／拖动改文档禁用；focus 尽量保持缩放并最少平移，选中不强制全图重建；默认 logical 右向、深度 2。
- 验收条件：焦点节点可见且比例保持；选择不丢平移；各布局可显示同一 id；输入不会修改正文。
- 实现依据：[../src/client/views/mindmap-view.tsx](../src/client/views/mindmap-view.tsx)、[../src/client/adapters/mindmap.ts](../src/client/adapters/mindmap.ts)、[../src/shared/viewport.ts](../src/shared/viewport.ts)。
- 验证记录：2026-10-03 静态核对；已有测试入口：[../tests/viewport.spec.ts](../tests/viewport.spec.ts)、[../tests/viewport-runtime.spec.ts](../tests/viewport-runtime.spec.ts)、[../tests/adapters.spec.ts](../tests/adapters.spec.ts)（覆盖范围以用例为准，本次未执行）。

## F005 表格与过滤

- 实现状态：已实现。
- 场景与预期：表格显示节点角色、属性等投影；角色与属性过滤共同作用，并保留祖先路径，深度限制仍生效。
- 边界与异常：表格只读，折叠状态不隐藏表格行；过滤是视图投影，不删除节点。
- 验收条件：筛选同时满足所设条件；祖先可定位；清除筛选恢复数据，IR 不变。
- 实现依据：[../src/client/adapters/table.ts](../src/client/adapters/table.ts)、[../src/client/views/table-view.tsx](../src/client/views/table-view.tsx)、[../src/shared/view-tree.ts](../src/shared/view-tree.ts)。
- 验证记录：2026-10-03 静态核对；已有测试入口：[../tests/adapters.spec.ts](../tests/adapters.spec.ts)、[../tests/view-tree.spec.ts](../tests/view-tree.spec.ts)（覆盖范围以用例为准，本次未执行）。

## F006 17 个视图工具与指代

- 实现状态：已实现。
- 场景与预期：工具控制视图、展开／折叠、focus／open、阅读模式与章节、zoom／fit／reset、帮助、深度、布局、过滤、重置及打开视图标签。
- 边界与异常：每个工具单一职责；模糊标题多候选需反馈；视图不能调用工具直接改文档结构。
- 验收条件：17 工具注册；同名引用返回候选；参数错误有结构化反馈；reset 不修改文档。
- 实现依据：[../src/tools/view-tools.ts](../src/tools/view-tools.ts)、[../src/document/node-ref.ts](../src/document/node-ref.ts)。
- 验证记录：2026-10-03 静态核对；已有测试入口：[../tests/tools.spec.ts](../tests/tools.spec.ts)、[../tests/node-ref.spec.ts](../tests/node-ref.spec.ts)（覆盖范围以用例为准，本次未执行）。

## F007 桥接与侧边栏页面

- 实现状态：已实现。
- 场景与预期：视图标签接入 better-sidebar，宿主／浏览器通过 WebSocket 同步命令、文档和视图镜像，重连后恢复会话。
- 边界与异常：请求确认、断线排队与递增重连间隔明确；切会话清理旧连接，不能把旧 ack 写到新会话；信任校验保护写入口。
- 验收条件：断线重连恢复对应镜像；会话切换关闭旧资源；跨插件服务与视图可在集成测试连接。
- 实现依据：[../src/client/bridge-client.ts](../src/client/bridge-client.ts)、[../src/client/sidebar-adapter.tsx](../src/client/sidebar-adapter.tsx)、[../src/host/bridge-server.ts](../src/host/bridge-server.ts)、[../src/host/mirror-store.ts](../src/host/mirror-store.ts)。
- 验证记录：2026-10-03 静态核对；已有测试入口：[../tests/bridge-client.spec.ts](../tests/bridge-client.spec.ts)、[../tests/bridge-server.spec.ts](../tests/bridge-server.spec.ts)、[../tests/cross-plugin-e2e.spec.ts](../tests/cross-plugin-e2e.spec.ts)（覆盖范围以用例为准，本次未执行）。

## F008 交互式帮助与中文技能

- 实现状态：已实现。
- 场景与预期：get_view_help 与页面帮助提供可执行的短语示例，中文 Skill 将导航、布局与阅读要求转换为视图工具。
- 边界与异常：帮助不是新的语音识别服务；示例仅操作视图，不能暗示编辑内容或未实现布局。
- 验收条件：帮助可在页面打开，示例触发相应视图行为；技能内容可加载。
- 实现依据：[../src/shared/command-guide.ts](../src/shared/command-guide.ts)、[../src/client/views/command-guide.tsx](../src/client/views/command-guide.tsx)、[../src/host/skill-registration.ts](../src/host/skill-registration.ts)。
- 验证记录：2026-10-03 静态核对；已有测试入口：[../tests/command-guide.spec.tsx](../tests/command-guide.spec.tsx)、[../tests/skill.spec.ts](../tests/skill.spec.ts)（覆盖范围以用例为准，本次未执行）。

## F009 更多布局与内容编辑

- 实现状态：待实现。
- 历史场景：原始需求中的扩展布局及拖动修改文档等设计未作为当前能力交付；现行架构将导图定义为只读。
- 边界与异常：仅保留历史规划来源，不代表已承诺本次开发；尚无对应完整运行实现。
- 验收条件：重新讨论内容编辑的内核事务、权限和布局支持后再实施；当前不能启用拖动编辑。
- 来源依据：[../requirements.md](../requirements.md)。
- 验证记录：未实现，暂无运行验证；实际开发时先拆分规格并明确异常反馈。

## F010 数据源状态机与示例数据边界

- 实现状态：已实现（2026-10-10）。
- 场景与预期：视图数据源显式分三态：`connecting`（未收到 hello-ack）／`host`（宿主声明有文档内核）／`mock`（宿主明确声明无文档内核）。`connecting` 不渲染任何文档内容；`host` 在未绑定时显示空状态；只有 `mock` 才启用内置示例数据，且必须显式标注为示例数据。
- 边界与异常：握手前或握手中不得出现任何示例文档标题、大纲或文档切换器；`connecting` 下文档类命令返回 `SOURCE_NOT_READY`，不产生"已打开章节"这类假成功；连接中断保留最近画面与数据源并标注重试中，不得回退为示例数据；`mock` 仅在宿主 hello-ack 明确 `structuredDocument: false` 时进入。
- 验收条件：
  - A1：新窗口／新会话首帧（握手前）内容区不出现任何文档标题与大纲，显示连接中提示。
  - A2：收到 `structuredDocument: false` 后进入示例模式，页面出现"示例数据"标识，状态栏写明数据源为示例数据。
  - A3：收到 `structuredDocument: true` 且会话未绑定文档时显示空状态，不出现任何示例标题。
  - A4：`connecting` 状态下文档类命令返回 `SOURCE_NOT_READY`。
  - A5：连接断开后画面与数据源保留，界面标注重试中。
  - A6：安装内核且有绑定文档时行为与本变更前一致（回归）。
- 实现依据：[../src/client/runtime.ts](../src/client/runtime.ts)、[../src/client/views/tab-view.tsx](../src/client/views/tab-view.tsx)、[../src/document/empty-provider.ts](../src/document/empty-provider.ts)、[../src/client/plugin-style.ts](../src/client/plugin-style.ts)。
- 验证记录：2026-10-10 实现并运行验证——`npm run typecheck`、`npm test`（21 文件 / 150 用例）、`npm run build` 三绿；新增/更新用例：[../tests/host-backed-provider.spec.ts](../tests/host-backed-provider.spec.ts)（四态迁移、`SOURCE_NOT_READY`、真实文档优先）、[../tests/tab-view.spec.tsx](../tests/tab-view.spec.tsx)（首帧不出现示例数据、mock 标识、host 空状态）、[../tests/client-bundle.spec.ts](../tests/client-bundle.spec.ts)（构建产物以包名注册并成功挂载）、[../tests/skill.spec.ts](../tests/skill.spec.ts)（E2E 走 hello-ack）、[../tests/viewport-runtime.spec.ts](../tests/viewport-runtime.spec.ts)。GUI 回归尚未执行（见待办）。

## F011 侧边卡片设置（默认视图与自动打开）

- 实现状态：已实现（2026-10-10）。
- 场景与预期：本插件在 better-sidebar 的**设置 → 侧边卡片**页（`settings.section`，id `better-sidebar`）暴露自己的设置行，字段与语义见 [sidebar-integration.md](sidebar-integration.md)「配置契约」：`autoOpenTab`（`switch`，默认 `true`）、`defaultView`（`select`：`markdown`／`mindmap`／`table`，默认 `markdown`）、`defaultLayout`（`select`：`mind`／`logical`／`down`，默认 `logical`）、`defaultMindmapDepth`（`number`，默认 `2`，最小 `0`，`0` 表示不限层级）。四项取代原来的硬编码：`autoOpenTab` 恒为真的自动打开，以及 `currentView: 'markdown'`／`layout: 'logical'`／`viewDepths.mindmap: 2` 的内置默认。设置经 better-sidebar 的 `settings.pluginToggles`（v0.12.0+）声明并持久化在 `pluginSettings['structured-document-view']`，运行时用公开快照读回。
- 边界与异常：
  - **软依赖**：`dsh-better-sidebar` 缺失或低于 0.12.0（描述符没有 `pluginToggles`）时，四项全部回退为现有硬编码默认值（`true`／`markdown`／`logical`／`2`），插件照常挂载、页签照常渲染，不因缺少设置能力而失败；只用公开 `service`（`registerTab`／`getSnapshot`／`subscribeState`／`openTab`），不依赖该插件的私有 store。
  - **优先级**：侧边卡片里设置过就用它；键缺失、类型不符或取值不在枚举内则回落本插件内置默认。该机制**没有**「重置为默认值」和「字段已被覆盖」标记，也**没有** revision／CAS 冲突保护（那些是宿主插件配置卡片的能力），并发写入以最后一次为准；本版不提供「清除覆盖」入口。
  - **可达性**：设置行只在对应卡片启用时渲染——`prefs.tabsEnabled['structured-document-view'] !== false`（缺省为启用）；显式关闭该页签类型时设置入口一并消失。
  - **不追溯**：配置只影响**新会话／新运行时**的初始视图状态，不改写已存在会话当前已经持有的视图状态；也不改文档内容。视图状态与文档内容分离的既有边界（视图只影响「怎么看」，见 F002）不因本功能改变。
  - **越界取值**：`defaultMindmapDepth` 只会按控件契约收到 `min: 0` 的整数，但直接改写设置文档或旧版本遗留值可能越界或非数字，必须按非法取值回落默认，不做隐式截断或抛出。
  - `defaultMindmapDepth = 0` 需映射为内部 `null`（`viewDepths.mindmap` 的 `null` 才表示不限层级），不能把 `0` 直接写进层级判断。
  - **「恢复默认视图」的口径（已定：采用侧边卡片默认值）**：`resetView`（工具栏「重置」与工具 `reset_view`，[../src/shared/view-state.ts](../src/shared/view-state.ts)）实现前直接调用 `createDefaultViewState()`；本版要求它重置到侧边卡片里配置的默认值（与「新运行时」口径一致；它是用户显式要求的动作，不属于追溯改写已存在会话的当前状态）。用户已于 2026-10-10 选定该口径，不再提供“恒用内置默认”的备选。实现方式见下方实现依据（`resetView(state, initial)`）。
- 验收条件：
  - A1：默认配置（四个键都未设置）下行为与本变更前一致：新会话自动打开页签、初始 `markdown`、布局 `logical`、导图层级 2。
  - A2：`autoOpenTab: false` 时新会话不再自动打开页签，工具 `open_view_tab` 与手动点击页签仍可打开。
  - A3：`defaultView: 'mindmap'`／`'table'` 时，新会话初始视图为对应视图；`defaultLayout` 三个取值在思维导图初始布局上生效。
  - A4：`defaultMindmapDepth: 0` 时新会话思维导图为不限层级，`3` 时为 3 层。
  - A5：改设置后，**已存在**会话当前的视图状态不变；新建会话／新运行时才采用新默认。
  - A6：非法值（类型不符、`defaultView: 'kanban'`、`defaultMindmapDepth: -1` 或非数字）回落内置默认且不抛错、不阻断挂载。
  - A7：模拟没有 `pluginToggles` 能力的 better-sidebar（软依赖缺失或 < 0.12.0）时插件仍挂载、页签仍注册、四项均为内置默认。
  - A8：设置行出现在「设置 → 侧边卡片」的本插件卡片下；关闭该卡片后设置入口不再可达（回归项，页面核对）。
  - A9：「恢复默认视图」（工具栏「重置」与工具 `reset_view`）重置到配置的 `defaultView`／`defaultLayout`／`defaultMindmapDepth`（未设置或非法时回落内置默认 `markdown`／`logical`／2；`0` 表示不限层级）；保留当前选中节点，见 F002 既有语义。
- 实现依据（2026-10-10 实现落点）：
  - [../src/client/sidebar-adapter.tsx](../src/client/sidebar-adapter.tsx)——`registerTab` 声明 `settings.pluginToggles` 四项设置行（`SETTING_ROWS`，键 `autoOpenTab`／`defaultView`／`defaultLayout`／`defaultMindmapDepth`；控件 `switch`／`select`／`select`／`number`，`min: 0`），仅在 `supportsPluginSettings()`（公开 `service.features` 含 `'pluginSettings'`）为真时声明；`readPluginSettings()` 只读公开快照 `getSnapshot().prefs.pluginSettings['structured-document-view']`，`readViewDefaults()` 交给纯解析并回退内置默认，`shouldAutoOpenTab()` 供门控使用。适配层仍是唯一接触 better-sidebar 的地方。
  - [../src/shared/view-settings.ts](../src/shared/view-settings.ts)（新增）——`ViewDefaults`、`BUILTIN_VIEW_DEFAULTS`、`VIEW_OPTIONS`／`LAYOUT_OPTIONS`、`parseViewDefaults()`（逐字段回退、不抛错）、`mindmapDepthToInternal()`（`0` → 内部 `null`）、`initialViewState()`（把配置投影成新的初始状态）。纯函数，不接触 better-sidebar。
  - [../src/shared/view-state.ts](../src/shared/view-state.ts)——`DEFAULT_VIEW_STATE`（零引用的第二份默认）已**删除**，`createDefaultViewState()` 成为内置默认的唯一字面量来源；`BUILTIN_VIEW_DEFAULTS` 从它推导。`resetView(state, initial = createDefaultViewState())` 增加可选的「初始状态」入参以采用配置（缺省仍是内置默认，既有调用不变）。
  - [../src/client/runtime.ts](../src/client/runtime.ts)、[../src/client/view-state-store.ts](../src/client/view-state-store.ts)——运行时的视图状态由 `new ViewStateStore(readDefaults)` 构造，初始状态在构造时读一次配置（A5 不追溯）；`applyReset()`（`reset_view`）用 `initialViewState(this.readDefaults())` 重置，回执 `value.currentView` 报告真实结果（原为写死的 `'markdown'`）。
  - [../src/client/session-manager.ts](../src/client/session-manager.ts)——新增 `setViewDefaultsReader()`，把适配层的读取器注入每个新建运行时（**这是对「预期改动只含四个文件」的第二次修正**：运行时由 `ViewSessionManager` 创建，不经过该处无法把配置带进新运行时）。
  - [../src/client/index.ts](../src/client/index.ts)——`autoOpenTab` 门控：`if (adapter.shouldAutoOpenTab()) adapter.openViewTab()`（原为无条件打开，A2）。
  - [../src/tools/view-tools.ts](../src/tools/view-tools.ts)、[../skills/structured-document-view/SKILL.md](../skills/structured-document-view/SKILL.md)——`reset_view` 的描述与输出说明改为「重置到侧边卡片配置的默认值（未设置时为 Markdown／逻辑图／2 层）」，并优先采用客户端回执里的 `value.currentView`（宿主侧看不到浏览器配置，未送达时按内置默认估计）。这是语义变更后的**描述准确性同步**，不是新增产品规则。
  - 实现中发现的规格未覆盖细节（已按规格口径处理）：`state.depth` 必须与 `viewDepths[currentView]` 一致（`setView` 既有不变式），否则 `defaultView: 'mindmap'` 时工具栏层级控件与 `get_view_state` 会把已配置的层级报告成「不限」，与画面不一致；`initialViewState()` 同步设置 `depth`。
- 验证记录：2026-10-10 实现并运行验证——`npm run typecheck` 通过、`npm test`（24 文件 / 181 用例）、`npm run build` 通过（`lib/client.js` 303.50 kB）；新增用例：[../tests/view-settings.spec.ts](../tests/view-settings.spec.ts)（解析：缺失／非法／`0` → `null`／选项与枚举同源／内置默认由默认状态推导／`depth` 不变式）、[../tests/view-settings-runtime.spec.ts](../tests/view-settings-runtime.spec.ts)（新运行时采用配置、A5 不追溯、`reset_view` 采用此刻配置并保留选中、store `reset()`）、[../tests/sidebar-adapter.spec.ts](../tests/sidebar-adapter.spec.ts)（四项设置行声明、读回解析、非法回退、无 `pluginSettings` 能力回退、只读公开快照）、[../tests/client-bundle.spec.ts](../tests/client-bundle.spec.ts)（构建产物中声明四行、`autoOpenTab: false` 不打开页签、无能力时不声明设置行仍自动打开）、[../tests/tools.spec.ts](../tests/tools.spec.ts)（回执 `currentView` 优先、未送达时按内置默认估计）。`select` 行控件可用性：**确认可用**——0.19.1 的 `src/client/SideCardSection.tsx` 中 `FeatureSettingsRows` 对 `toggle.type === 'select'` 渲染 `SelectRow`，插件行经 `valueSource`（`prefs.pluginSettings[<id>]`）取值、经 `onPluginSelectValue` 写回；实际加载的 `lib/client.js`／`lib/client-registry.js` 同样含 `type === "select"`、`pluginBlob`、`onPluginSelectValue`、`aria-haspopup`。**未执行**：真实页面核对（A8 的设置行可见性与关闭卡片后入口消失、以及 A1–A4 的界面观感）需要浏览器交互，本轮未做；宿主侧 `dsh-better-sidebar` 行为以已安装 0.19.1 的源码与产物为准。

## F012 Desktop 传输、每会话握手与重连

- 实现状态：待实现；承接 F001／F006／F007／F010。
- 场景与预期：通过原生公开 URL／会话／侧边栏接口提供每会话 runtime；首次与重连强制推真实文档、选中、绑定和来源状态，不被旧去重键吞掉。
- 边界与异常：connecting、真实空态与示例数据分开；命令留在调用会话，发送、排队、确认和超时不同；源服务重挂载及时刷新能力，不凭 Context 引用相等判断。
- 验收条件：真实 dsh-app 传输和 Origin 检查；客户端先启动、源恢复／摘除、两会话、重连与多窗口、native／底部标签通过；已保存文件的视图打开失败明确反馈。
- 实现依据：尚无本版实现；[技术契约](DESKTOP-WORKFLOWS-20261014.md) 第 1／2 节。
- 验证记录：本版只写文档，无目标运行测试。

## F013 宿主绑定所有权与来源投影

- 实现状态：待实现；承接 F001／F002／F010。
- 场景与预期：跟随宿主 getBindingState；fixed 的文档／空态不接受浏览材料引起的隐式改绑；hello／document／get_view_state 投影真实 binding 与 data source。
- 边界与异常：移除依靠 window 全局标记的所有权判断；无 fixed owner 时独立视图跟随保持；例子不冒充真实稿，另一文档同 node ID 不继承旧选中。
- 验收条件：记录／纪要、项目主文档浏览材料后目标不变；清目标仍为空；重连与内核变化正确刷新；canonical 和模型文本都可得源文件／绑定模式及真实确认结果。
- 实现依据：尚无本版实现；[公开投影契约](DESKTOP-WORKFLOWS-20261014.md) 第 1–3 节。
- 验证记录：未执行本版协议实现或 Desktop 验收。

## F014 三场景视图与原设置回归

- 实现状态：待实现；本次主要为目标适配与集成验收，保留 F003–F011 已有产品规则。
- 场景与预期：17 工具支持 thinking、会议双稿、project 的阅读／过滤／定位；四项设置继续由 better-sidebar 原 prefs 维护，新 runtime 和 reset_view 使用当前默认。
- 边界与异常：表格视图不成为 Excel 编辑器；视图操作不改业务正文；旧值／未知 prefs 保留，不追溯重置已打开会话，关闭卡片不销毁文档内核。
- 验收条件：三视图／章节／布局／编辑和现有工具回归；同名编号按章节定位；四设置保存／重置与原生入口通过；浅深色、窄栏、键盘、标签销毁检查。
- 实现依据：尚无本版集成实现／证据；[设置与场景契约](DESKTOP-WORKFLOWS-20261014.md) 第 4／5 节。
- 验证记录：旧 Web 用例不作为本版原生界面通过，待实际执行。

## 差异与验证待办

- AGENTS／README 等旧数量需统一为注册表实际的 17 个工具。
- views.md 旧段落将 depth／collapse 描述为 Markdown 全部内容截断，与新增阅读器语义冲突；本次澄清章节阅读与树形投影差异。
- 跨插件测试不等于真实浏览器验证；Mind Elixir 布局、抽屉、焦点和标签生命周期本次未实测。
- 宿主侧诊断项（本轮范围外，需重启承载会话的实例）：`ViewStateWire` 增加数据源字段、`get_view_state` 投影数据源与连接状态、宿主 capabilities 改为 hello 时求值——留到下一次开发。
- F010 的 GUI 回归（新窗口首帧、未绑定空状态、无内核环境的示例数据标注）尚未执行；浏览器刷新后即可验证（本轮只改客户端，无需重启宿主）。
- F011 的真实页面核对尚未执行（A8：设置行出现在「设置 → 侧边卡片」的本插件卡片下、关闭该卡片后设置入口消失；以及 A1–A4 的界面观感）。本轮只改客户端，重建 `lib/client.js` 后刷新浏览器即可核对，无需重启宿主；控件可用性已按 0.19.1 的源码与实际加载产物核实（见 F011 验证记录）。
- CHANGELOG 的 `## Unreleased` 段仍列着更早已提交但未归版的改动（桥断线退避重连、`set_filter` 改为 AND、指令目录新增），且位置在 `0.3.0` 与 `0.2.0` 之间。本次只追加 `0.4.0` 段，未移动或改写这些条目（避免误归属），发布时由发布提交统一归版。

## 规格变更记录

- 2026-10-14：新增 F012–F014 与 `discussion-desktop-workflows-20261014-v1` 传输／绑定／来源与三场景回归契约；具体文档待确认。未改源码、测试实现、prefs、构建产物和 0.4.0 包版本。

- 2026-10-10：F011（侧边卡片设置：默认视图与自动打开）实现完成，包版本提高为 0.4.0（minor）：四项设置（`autoOpenTab`／`defaultView`／`defaultLayout`／`defaultMindmapDepth`）经 better-sidebar 的 `settings.pluginToggles` 声明并持久化在 `pluginSettings['structured-document-view']`，配置默认值作用于**新会话／新运行时**的初始视图状态与 `reset_view`；已存在会话当前状态不追溯；无 `pluginToggles` 能力、键缺失、类型不符或枚举外取值一律回退内置默认。实现中同步了规格未覆盖的两点：`state.depth` 与 `viewDepths[currentView]` 的一致不变式；`reset_view` 的描述与回执 `currentView` 随配置（描述准确性同步）。**未改变** F002「视图只影响怎么看」与 A5「不追溯已存在会话」的语义。
- 2026-10-10：新增 F011（侧边卡片设置：默认视图与自动打开）及技术契约「配置契约」（写在 [sidebar-integration.md](sidebar-integration.md)）。本版为**待用户确认**的文档增量：仅改维护文档，未改动源码、测试、构建产物或运行配置，包版本不变。字段、持久化位置（`pluginSettings['structured-document-view']`）、软依赖回退与能力差异见 F011 与契约。
- 2026-10-10：F010（数据源状态机与示例数据边界）实现完成，包版本提高为 0.3.0（minor）：握手前 `connecting` 不渲染任何文档、示例数据只在宿主明确声明无内核时启用并带可见标识、`connecting` 下文档类命令返回 `SOURCE_NOT_READY`；同时修正 F001 边界表述。规格与实现同版，A1–A6 与用例对应关系见 F010 验证记录。
- 2026-10-10：新增 F010 规格与相关技术契约（仅文档），交用户确认后开发。

- 2026-10-03：首次从现行文档、实现和现有测试建立功能基线；仅修改维护文档，未变更 API、存储或运行逻辑。


## F015 插件列表与详情的显示名称

- 文档版：office-suite-implementation-20261018-v1；用户在本会话完整引用该实施方案并明确 PLEASE IMPLEMENT THIS PLAN，确认同版名称、简介、版本、组合和验收。原有其他待确认功能不在授权范围。
- 实现状态：已实现；验证另记。
- 场景与预期：中文显示「Irving · 结构化文档视图」，英文显示「Irving · Structured Document Views」；保留完整包名 dsh-structured-document-view 与全部运行标识。
- 中文简介：为结构化文档提供 Markdown、思维导图和表格展示，支持切换视图、定位与筛选。
- 英文简介：Display structured documents as Markdown, mind maps, and tables, with view switching, navigation, and filtering.
- 技术契约：导出 locale/en.json 与 locale/zh.json 的 meta.title／meta.description；exports["./locale/*.json"] 指向对应资源，files 分发 locale，package.description 使用中文简介兜底。客户端设置／详情标题同步；功能导航不强制改名。
- 验收：目标宿主从固定 tgz 解析两语言名称／简介，原生列表、详情、成员行一致；无新增布局溢出，原工具／配置／存储保持。新套件成员在隔离验证后交付日常。

## F016 统一版本与固定交付

- 实现状态：已实现；依据同版已确认实施方案。
- 包版本统一为 0.2.1-rc.2+rev.1；宿主与官方 peers 仍为实际要求的原版本。完整字符串、源码 SHA 和产物散列同时校验，不能使用忽略 build metadata 的 SemVer 判断修订升级。
- Chatty／Automation 的原比较接口保留，规范后缀改为 +rev.N，N 为无前导零的安全正整数；跨官方基线拒绝。旧版本仅由明确迁移映射及原锁／散列接管，不能把旧后缀 .1 与 rev.1 当作无需更新。
- 本包可独立安装，也可由 dsh-office-bundle 携带；套件采用 cordis:group 保留本包原条目 id、config、inject。总开关卸载全部成员，重开恢复各自 disabled；原单独 Bundle 停用选择在接管时迁移为本条目 disabled。独立入口与套件入口不能重复组装。
- 配置／数据：没有业务字段改名或存储搬迁；套件接管仅处理组合选择与既有 disabled 字段，保留未知配置、工具引用、文档和凭据。迁移 CAS／备份／冲突／回滚由根维护入口执行。
- 验收：完整产物、版本迁移、原功能回归；成员还需唯一实例、旧配置命中、总／子开关与业务资料保留。具体记录见 VERIFICATION-OFFICE-20261018.md（完成后生成）。

- 本次自动验证：191项测试通过，类型／构建或Chatty客户端／lint通过；隔离固定包、原生办公组合已通过；日常验收由维护仓库本次交付记录单独登记。

- 本次既有预期Bug：原生底部面板220px时导图内容区可压至0，scaleFit生成0%；修复导图最小内容尺寸、隐藏时延迟fit及有效缩放边界，不改变工具／配置／文档语义。新增6项回归，191项测试及类型／构建通过，原生修复后复验待安装。
