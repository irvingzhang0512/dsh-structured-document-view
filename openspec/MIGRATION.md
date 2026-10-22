# dsh-structured-document-view OpenSpec 迁移索引

迁移日期：2026-10-22。范围是开发需求与规格的文档整理；不修改原始需求、旧 docs、项目内容、examples、运行 Skill、源码、测试、配置或版本。README 与 AGENTS 只更新路由。

## 唯一规格源与使用规则

- 当前行为以本库 openspec/specs 为唯一可编辑规格；旧 docs/SPEC.md 原位冻结，其中“可编辑”及旧开发入口描述不再作为维护入口。
- 未实现或待确认设计在 openspec/changes，批准、实施与验证分别登记；本轮整理授权不等于批准业务开发。
- 旧 SPEC、原始需求及既有历史证据冻结保留；ARCHITECTURE、CONFIG、tools、usage 等当前技术与使用文档仅本轮保持字节不变。后续功能的契约变化先写 change/design，与规格一起审阅；实现后可同步当前技术／使用说明，保持引用一致，不改写原始需求或既有历史证据。个人项目资料不因开发需求整理而修改。
- 新功能：proposal/specs/design/tasks → 具体版本确认 → 实现与验证 → 同步主规格并归档。预期不变的 Bug 按现行规格修复。
- 使用维护仓库固定 OpenSpec 1.14.3 CLI 校验本库，不安装第二套开发依赖、不新增运行 Skill。

## 原文档分类

| 原文件 | 分类与处理 |
|---|---|
| [docs/DESKTOP-WORKFLOWS-20261014.md](../docs/DESKTOP-WORKFLOWS-20261014.md) | 原待确认技术设计；完整规则迁入对应 change |
| [AGENTS.md](../AGENTS.md) | 开发／阅读入口；仅追加 OpenSpec 路由 |
| [CHANGELOG.md](../CHANGELOG.md) | 本轮原位保留；当前技术／使用说明后续可随已确认实现同步，历史证据保持原记录 |
| [README.md](../README.md) | 开发／阅读入口；仅追加 OpenSpec 路由 |
| [README.zh-CN.md](../README.zh-CN.md) | 开发／阅读入口；仅追加 OpenSpec 路由 |
| [docs/DSH-UPGRADE-20261011.md](../docs/DSH-UPGRADE-20261011.md) | 本轮原位保留；当前技术／使用说明后续可随已确认实现同步，历史证据保持原记录 |
| [docs/DSH-UPGRADE-20261017.md](../docs/DSH-UPGRADE-20261017.md) | 本轮原位保留；当前技术／使用说明后续可随已确认实现同步，历史证据保持原记录 |
| [docs/SPEC.md](../docs/SPEC.md) | 旧规格；原文冻结，编号已迁入下表 |
| [docs/VERIFICATION-OFFICE-20261018.md](../docs/VERIFICATION-OFFICE-20261018.md) | 本轮原位保留；当前技术／使用说明后续可随已确认实现同步，历史证据保持原记录 |
| [docs/architecture.md](../docs/architecture.md) | 本轮原位保留；当前技术／使用说明后续可随已确认实现同步，历史证据保持原记录 |
| [docs/document-provider.md](../docs/document-provider.md) | 本轮原位保留；当前技术／使用说明后续可随已确认实现同步，历史证据保持原记录 |
| [docs/sidebar-integration.md](../docs/sidebar-integration.md) | 本轮原位保留；当前技术／使用说明后续可随已确认实现同步，历史证据保持原记录 |
| [docs/skill.md](../docs/skill.md) | 本轮原位保留；当前技术／使用说明后续可随已确认实现同步，历史证据保持原记录 |
| [docs/tools.md](../docs/tools.md) | 本轮原位保留；当前技术／使用说明后续可随已确认实现同步，历史证据保持原记录 |
| [docs/usage.md](../docs/usage.md) | 本轮原位保留；当前技术／使用说明后续可随已确认实现同步，历史证据保持原记录 |
| [docs/views.md](../docs/views.md) | 本轮原位保留；当前技术／使用说明后续可随已确认实现同步，历史证据保持原记录 |
| [requirements.md](../requirements.md) | 原始需求，只读历史 |
| [skills/structured-document-view/SKILL.md](../skills/structured-document-view/SKILL.md) | 运行 Skill，原位保护 |

## 稳定编号、Requirement 与场景映射

每条 F 编号对应同名 Requirement；场景编号为 Fxxx-S01 起顺序，完整保留原行为、边界和验收段落。迁移不把旧测试结果改记为本轮运行通过。

| 编号 | 唯一编辑位置 | 场景与状态 |
|---|---|
| F001 文档 Provider 与会话隔离 | [规格](specs/document-provider/spec.md) | F001-S01–S03；既有行为；验证按历史证据分层 |
| F002 视图状态与内容分离 | [规格](specs/view-state/spec.md) | F002-S01–S03；既有行为；验证按历史证据分层 |
| F003 Markdown 阅读器 | [规格](specs/markdown-reader/spec.md) | F003-S01–S03；既有行为；验证按历史证据分层 |
| F004 只读思维导图与视口 | [规格](specs/mindmap-viewport/spec.md) | F004-S01–S03；既有行为；验证按历史证据分层 |
| F005 表格与过滤 | [规格](specs/table-filter/spec.md) | F005-S01–S03；既有行为；验证按历史证据分层 |
| F006 17 个视图工具与指代 | [规格](specs/view-tools/spec.md) | F006-S01–S03；既有行为；验证按历史证据分层 |
| F007 桥接与侧边栏页面 | [规格](specs/view-bridge/spec.md) | F007-S01–S03；既有行为；验证按历史证据分层 |
| F008 交互式帮助与中文技能 | [规格](specs/view-help-skill/spec.md) | F008-S01–S03；既有行为；验证按历史证据分层 |
| F009 更多布局与内容编辑 | [规格](changes/future-view-layout-editing/specs/future-layout-editing/spec.md) | F009-S01–S05；待确认／未实现 |
| F010 数据源状态机与示例数据边界 | [规格](specs/view-source-state/spec.md) | F010-S01–S03；既有行为；验证按历史证据分层 |
| F011 侧边卡片设置（默认视图与自动打开） | [规格](specs/view-defaults/spec.md) | F011-S01–S03；既有行为；验证按历史证据分层 |
| F012 Desktop 传输、每会话握手与重连 | [规格](changes/desktop-view-workflows/specs/desktop-session-transport/spec.md) | F012-S01–S03；待确认／未实现 |
| F013 宿主绑定所有权与来源投影 | [规格](changes/desktop-view-workflows/specs/binding-source-projection/spec.md) | F013-S01–S03；待确认／未实现 |
| F014 三场景视图与原设置回归 | [规格](changes/desktop-view-workflows/specs/view-workflow-integration/spec.md) | F014-S01–S03；待确认／未实现 |
| F015 插件列表与详情的显示名称 | [规格](specs/plugin-presentation/spec.md) | F015-S01–S05；既有行为；验证按历史证据分层 |
| F016 统一版本与固定交付 | [规格](specs/fixed-delivery/spec.md) | F016-S01–S05；既有行为；验证按历史证据分层 |

## 原始需求章节去向

原始需求中的样例、个人项目正文、图示与建议接口原位保留；下表逐组区分已承接、被替代、明确边界和历史候选，不宣称原需求全数实现。

| 原章节 | 内容 | 去向 | 状态与差异 |
|---|---|---|---|
| 1–5 | 定位、结构与视图展示 | F001–F008 | 三视图与文档桥现状保留；内容编辑归文档内核。 |
| 6 | Markdown视图 | F003 | 已有章节/全文阅读替代只复用上游Markdown组件的初步技术建议；示例个人文档不复制。 |
| 7–8 | MindElixir、节点ID和节点展示 | F004 | 节点ID一一对应、标题/正文阅读；当前三布局与只读限制有效。 |
| 9.1–9.2 | 展开/收起和选择 | F002/F004 | 只改视图状态，选中经桥同步。 |
| 9.3 | 拖动视觉位置与父子结构 | future-view-layout-editing/F009 | 现有导图只读；拖节点或改变父子关系未交付，需确认事务、权限与异常规则。 |
| 10 | 表格 | F005 | 展示与筛选已实现，复杂表格编辑不在当前范围。 |
| 11–12 | View State与View Tools | F002/F006/F011 | 工具实际为17个，含原后续set_filter；重置到当前侧边设置默认并保留选择。 |
| 13–14 | 中文Skill与LLM边界 | F008/F006 | 文档内容变更仍由文档工具执行，运行Skill不改。 |
| 15–17 | Bridge、Mock和文档变化 | F001/F007/F010；desktop-view-workflows | 无内核明确声明才示例；未握手不能推断无内核；原生绑定和重连投影增量待确认。 |
| 18–20 | Sidebar、架构、典型流程 | F007/F003–F006；desktop-view-workflows | 独立适配层与场景阅读已有；固定目标宿主所有权仍待实现。 |
| 21–22 | 阶段重点与不实现 | F001–F011；future-view-layout-editing | 已有mind/logical/down；其余扩展布局和内容编辑不按原阶段愿景视为完成。 |
| 23 | 测试数据 | examples原位保留 | 会议/项目/思路JSON仅原有测试或示例资料，本次不重排、重写或改业务内容。 |
| 24–25 | 发布与定义 | F015/F016；迁移索引 | 交付事实与验证边界按真实记录，文档迁移不提高包版本或执行发布。 |

## 历史验证与状态差异

- [原 SPEC](../docs/SPEC.md) 保留逐项实现依据、测试文件、历史批准与未验证项；[2026-10-17兼容记录](../docs/DSH-UPGRADE-20261017.md) 与 [2026-10-18交付验证](../docs/VERIFICATION-OFFICE-20261018.md) 分别记录实际通过范围。
- 本次只做文档结构、来源覆盖、链接、差异与保护散列检查，没有执行产品测试、真实模型调用、GUI、数据迁移、安装或重启；没有提高版本、提交或推送。
- 2026-10-17 已交付的冷会话/原生传输兼容修复纳入主规格；它们不代表 2026-10-14 全部工作流（F012–F014）已实现。旧 Web 设置与GUI记录不外推为目标 Desktop 配置卡可用。
- F009 始终是待重新讨论的历史规划，迁入 future-view-layout-editing；没有把只读导图描述为可拖动编辑。F010/F011 的旧GUI未验证项仍保留；后续原生三视图验证仅证明其实际记录的场景。

### 未定事项入口

- 原 SPEC 的“差异与验证待办”原样留存；其中历史状态必须结合上面的较新证据，不重复建立已完成任务。
- 原 SPEC 的“规格变更记录”原样留存；其中历史状态必须结合上面的较新证据，不重复建立已完成任务。
- 未定义完整验收的历史候选不默认批准；实施时先补齐可审核场景，确认后再动代码。

## 本轮文档验证

- 使用固定 OpenSpec 1.14.3 执行 validate --all --strict --no-interactive：14 项通过、零失败；git diff --check 通过。
- 与本轮开始前逐文件 SHA-256 比较：99 个原文件字节不变；只修改 AGENTS/README 路由文件并新增 openspec 文档。已有未提交文档差异保持。
- 新 OpenSpec Markdown 本地链接及锚点检查通过；未完成业务任务全部未勾选，没有产品测试、安装、迁移、提交或推送。
