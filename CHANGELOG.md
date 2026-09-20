# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## Unreleased

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
