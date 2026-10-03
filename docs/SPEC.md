# dsh-structured-document-view 当前功能规格

基线日期：2026-10-03；包版本：0.2.0；核对的源码提交：`4059ec3e8f378f4c19c92143f2020b60d3c05d01`。此提交是首次整理前的实现基线，后续文档提交不提高包版本。

本规格可编辑，功能任务先改预期与验收及相关技术契约，交用户明确确认该版文档后再开发；确认前不得修改对应源码／测试实现或运行配置。用户已明确要求按同一版文档实现且含义未变时，不重复询问；新增语义差异须重新确认，确认范围写入规格变更或任务交付记录。Bug 按已有且不变的预期直接定位源码。流程见 [根文档驱动开发规范](../../docs/DOC-DRIVEN-DEVELOPMENT.md)。原始需求保持只读，技术文档保留现有名称。

依据与技术入口：[../requirements.md](../requirements.md)、[architecture.md](architecture.md)、[views.md](views.md)、[tools.md](tools.md)、[document-provider.md](document-provider.md)、[sidebar-integration.md](sidebar-integration.md)。

实现状态与验证状态分别记录。“已实现”表示有当前源码依据，不表示本次已通过运行测试。下面的测试链接是核对过的现有验证入口；2026-10-03 本次只静态核对源码、测试与文档，没有运行产品测试、构建、GUI 或外部服务验证。具体遗漏见条目与末尾待办。

## F001 文档 Provider 与会话隔离

- 实现状态：已实现。
- 场景与预期：通过 Document Bridge 获取结构化文档及选择；宿主未安装文档内核时提供会议／项目／思路 Mock；按会话管理连接与状态。
- 边界与异常：固定目标由工作台优先协调，普通浏览可由文件桥提供；无文档需显示空状态，Mock 不代表真实文件持久化。
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

## 差异与验证待办

- AGENTS／README 等旧数量需统一为注册表实际的 17 个工具。
- views.md 旧段落将 depth／collapse 描述为 Markdown 全部内容截断，与新增阅读器语义冲突；本次澄清章节阅读与树形投影差异。
- 跨插件测试不等于真实浏览器验证；Mind Elixir 布局、抽屉、焦点和标签生命周期本次未实测。

## 规格变更记录

- 2026-10-03：首次从现行文档、实现和现有测试建立功能基线；仅修改维护文档，未变更 API、存储或运行逻辑。
