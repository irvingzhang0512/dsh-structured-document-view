# Changelog

## 2026-10-03 补齐需求文档确认（不变更包版本）

- 功能任务先改规格与相关技术契约，用户明确确认该版文档后再开发；未确认不改对应源码／测试实现或运行配置，已确认同一版不重复询问。
- 新增语义差异重新确认；预期不变的 Bug 可直接修复。本次只修改维护文档。

## 2026-10-03 文档基线（不变更包版本）

- 新增 [当前功能规格](docs/SPEC.md)，建立功能与 Bug 两条开发入口，记录实现依据、现有验证入口和待办。
- 本次只修改维护文档，不变更公开 API、数据格式或运行逻辑；静态核对不代替产品测试及 GUI 兼容验证。


本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [0.3.0] - 2026-10-10

### Fixed

- **未绑定文档时不再把示例数据当"当前文档"渲染**（SPEC F010）。旧实现运行时的初始数据源固定是 `MockDocumentProvider`，因此只要宿主桥尚未握手完成（新窗口首帧、DSH 重启、插件热重载、页面先于宿主就绪），视图就会显示内置示例文档（如「第二技术路线」）并标注 Mock——用户容易误认为那是自己的文档。
  - 数据源改为显式三态：`connecting`（未收到 `hello-ack`）／`host`（宿主声明有文档内核）／`mock`（宿主明确声明无内核）。`connecting` 用新增的 `EmptyDocumentProvider` 占位：内容区显示「正在连接视图桥…」，不渲染任何文档，也不显示示例数据切换器。
  - 示例数据只在宿主 hello-ack 明确 `structuredDocument: false` 后启用，并新增可见的「示例数据」提示条与状态栏标注；状态单向（`connecting → host | mock`），断线保留画面只标注重试，不回落示例数据；真实文档推送始终优先（`connecting`/`mock` → `host`）。
  - `connecting` 状态下 `expand_node` / `collapse_node` / `focus_node` / `open_node` / `navigate_section` 返回 `SOURCE_NOT_READY`，不再对着一份并不存在的文档"假装成功"。
  - 无文档且宿主有内核时沿用空状态；「示例数据」模式才显示示例文档切换器。

### Added

- `src/document/empty-provider.ts`：`connecting` 阶段的空数据源（文档恒 null、零订阅）。
- 新用例：`tests/tab-view.spec.tsx`（首帧不出现示例数据 / mock 标识 / host 空状态）、`tests/host-backed-provider.spec.ts` 的状态机用例（四态迁移、`SOURCE_NOT_READY`、真实文档优先）。

### Changed

- 文档同步：SPEC F010、document-provider（三态契约）、architecture（D13，更正 D11 关于"消除首帧闪烁"的描述）、views（视图页外壳三态表）、sidebar-integration、usage、README / README.zh-CN / AGENTS / 打包 Skill。

## Unreleased

- **修复：视图打开默认停留在 Mock 示例文档**。旧实现桥断线重连失败 8 次（16 秒）后永久放弃，且同会话 `setActiveSession` 幂等短路没有再连入口——DSH 重启、插件热重载或页面先于宿主就绪时，浏览器端永远收不到 hello-ack 能力声明，视图因此一直显示 Mock 数据源（「模拟文档提供器（Mock）」）。现在改为指数退避（2s 起、翻倍、30s 封顶）的不限次重连：连接成功即清零退避，宿主恢复后最迟约 30 秒自动切回真实文档数据源；退避等待期 `connect()` 不提前重试，避免高频界面事件绕过限流。
- `set_filter` 筛选语义修正为 AND：role 与 properties 之间、properties 各键之间全部同时满足才显示（原为 OR，与「键值都要匹配」的描述矛盾）。支撑「只看张三的进行中任务」这类组合筛选。
- 指令目录新增项目管理常用语：「只看任务」「只看风险」「只看进行中的任务」「只看进行中的策略」「清除筛选」。

## [0.2.0] - 2026-09

### Added（与 dsh-structured-document 配合）

- **宿主文档集成（软依赖 + 回退）**
  - 宿主半区 `ctx.get('structuredDocument')` 探测服务 → `HostDocumentIntegrator`
    订阅会话工作区变化（bound/document/selection/unbound），把文档快照 /
    选中经 View 桥推送到浏览器；不声明 inject，服务缺失时完整回退 Mock；
  - 桥消息扩展：下行 `document` / `selection` / `hello-ack`，上行
    `select-node` / `current-file`（wire 严格校验）；
  - **握手能力协商**：hello 应答 `hello-ack` 携带 `structuredDocument` 标志，
    客户端开机即定数据源模式（消除"先渲染 Mock 再切换"的闪烁与隐式激活）；
  - **推送去重**：宿主按 (revision, 选中, 当前文件) 去重、客户端同款防御
    ——Agent 连续操作不再重复全量推送/重渲染，currentFile 变化仍会推送；
  - 浏览器端 `HostBackedDocumentProvider`：收到宿主能力/文档推送即从 Mock
    切换数据源（渲染 / 工具 / 技能零改动）；点击节点回写 `select_node`；
  - **当前文件联动**：better-sidebar 快照推导活动编辑器文件（`.md`）→
    `current-file` 消息 → `setCurrentFile` → dsh-structured-document 懒绑定 /
    重绑（解析 Markdown 为 IR）。
- **dsh-structured-document 侧（最小、向后兼容增强）**
  - `SessionWorkspace` 增加变化事件（bound/unbound/document/selection），
    `WorkspaceRegistry.onSessionChanged` 会话级订阅；
  - 新增 `ctx.structuredDocument` 服务（selectNode / setCurrentFile /
    getCurrentFile / ensureBound / subscribe / getDocumentSnapshot）；
  - 接线 InMemoryCurrentFileStore（其预留的当前文件集成接缝）。
- **测试**：新增 wire 消息、hello-ack 能力协商、推送去重、HostDocumentIntegrator、
  HostBackedDocumentProvider、运行时宿主模式切换测试（109 个）；
  dsh-structured-document 侧新增事件/服务测试（88 个）。

## [0.1.0] - 2026-09

### Added（首发）

- **三种视图（基于 dsh-better-sidebar 的侧边栏页）**
  - Markdown 视图：标题层级 + 角色标签 + 属性列表（自包含轻量渲染器）；
  - 思维导图视图：mind-elixir v5.15.1，展开/收起、点击选中、缩放、平移、
    聚焦居中、mind/logical/down 三种布局，Node ID 与文档一致；
  - 表格视图：按角色分组 + 属性列，忽略收起、尊重层级与筛选。
- **视图状态（与文档分离）**
  - 纯 reducer 的不可变状态：currentView / selected / focused / expanded /
    collapsed / depth / zoom / pan / layout / filter；
  - 层级语义：根 = 1 层，0 = 不限，显式展开突破层级；三种视图解释一致。
- **Document Provider 接口 + Mock**
  - 稳定接口（get_document / get_selected_node / select_node /
    subscribe_document_changed / subscribe_selected_node_changed）；
  - 三份示例文档（会议纪要 / 项目管理 / 思路整理）与文档切换、mockMutate；
  - 节点引用解析（id / current / 标题，多候选返回明确错误）。
- **View Bridge（工具 ↔ 视图）**
  - WebSocket 桥 `/structured-document-view/ws` + 信任围栏；
  - 命令派发 / 入队重放 / ack 超时（4s）；状态镜像（每会话）；
  - 会话隔离（每会话独立运行时，切换不丢状态）。
- **9 个 View Tool**：set_view / get_view_state / expand_node / collapse_node /
  focus_node / set_depth / set_layout / set_filter / reset_view。
- **中文 Skill**：随包自注册，覆盖「切成思维导图」「只显示两层」
  「展开第二个议题」「聚焦当前节点」等自然语言意图。
- **工程化**
  - 87 个自动化测试（含 Skill→Tool 端到端链路）；
  - 构建：宿主 tsc + 客户端 tsdown 单闭包 bundle（mind-elixir 内联）；
  - 文档：docs/ 七篇、README、MIT LICENSE。
