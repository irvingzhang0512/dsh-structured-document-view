# Desktop 视图传输、绑定与三场景协作技术契约

## Purpose

迁入已有文档中的Desktop 视图传输、绑定与三场景协作技术契约完整技术边界和验收条件，以 OpenSpec 维护待确认的行为契约；本次不改变产品规则、不写配置、不执行迁移，也不把文档结构校验当成运行通过。

## ADDED Requirements

### Requirement: desktop-workflow-contract-C1 1. 每会话 runtime 与宿主来源

系统 SHALL 在实现本变更时遵守以下接口、状态和异常处理契约。

#### Scenario: desktop-workflow-contract-C1-S01 1. 每会话 runtime 与宿主来源

- **WHEN** 执行每会话 runtime 与宿主来源相关操作
- **THEN** 满足以下全部规则，任何未实现部分保持待实现状态：

- 继续保留 17 个视图工具、Markdown 章节／全文阅读、思维导图／布局、表格、过滤／定位、缩放、示例边界和内容／视图状态分离。
- 客户端按目标公开会话、better-sidebar store 与原生标签生命周期创建每会话 runtime；读取当前活动会话不把后台工具命令改投前台。原生与底部文件选择复用公开接口及 controller 的事实，不读取私有 DOM 或布局。
- 连接 URL 由公开 hostRouteUrl 和 streamBaseUrl 生成，`/structured-document-view/ws` path 单次注册；精确 `dsh-app://app` 与真实 Host 通过，跨站／任意 null Origin 拒绝。
- hello 时重新取得真实 `structuredDocument` 能力与当前快照，不在 apply 捕获永久能力。缺内核才可启用明确标识的示例；connecting／无绑定固定空态不显示示例。
- 同步 bindings 从宿主 `getBindingState` 读取。mode=fixed 时忽略浏览器 current-file 引起的隐式改绑；包括 filePath=null 的固定空态。移除依赖 window 全局标记判断谁拥有文档的机制。
- 没有 fixed owner 时保留原独立视图的 Markdown 文件跟随，服务缺失按旧示例约定。客户端不能请求设置 owner；绑定成功由宿主实际快照证明。

### Requirement: desktop-workflow-contract-C2 2. 握手、重连与确认

系统 SHALL 在实现本变更时遵守以下接口、状态和异常处理契约。

#### Scenario: desktop-workflow-contract-C2-S01 2. 握手、重连与确认

- **WHEN** 执行握手、重连与确认相关操作
- **THEN** 满足以下全部规则，任何未实现部分保持待实现状态：

- 首次连接与每次重连 hello 后强制推一次 document（可为 null）、selection、binding 和 data source；即使 revision 未变也不得被上一次连接的去重键吞掉。
- 文档／选中来自宿主服务；内容更改、文档切换、解除目标和 lease 变化清理不再适用的去重键与选中。UI 不把另一份文件里同名 node ID 当同一节点。
- 每条命令绑定原 sessionId，只有目标 runtime 确认接受操作才能返回 OK；未连接是 QUEUED，确认超时／SOURCE_NOT_READY／VIEW_UNAVAILABLE 与文件保存成功区分，不因发送成功虚报执行。
- 保存后打开视图失败保留业务文档；同一会话再次打开复用 runtime，不把重新打开当作重置当前阅读位置。所有订阅、连接、队列和定时器按实例销毁。

### Requirement: desktop-workflow-contract-C3 3. 最小公共投影增量

系统 SHALL 在实现本变更时遵守以下接口、状态和异常处理契约。

#### Scenario: desktop-workflow-contract-C3-S01 3. 最小公共投影增量

- **WHEN** 执行最小公共投影增量相关操作
- **THEN** 满足以下全部规则，任何未实现部分保持待实现状态：

现有 hello／document／state／command-result wire 不重命名；新增可缺省字段：

```ts
binding?: { mode: 'follow' | 'fixed', ownerId: string | null, filePath: string | null }
source?: { mode: 'connecting' | 'host' | 'example', currentFile: string | null }
```

- 由宿主文档消息／hello 描述绑定来源；状态镜像与 `get_view_state` 对外投影采用 `binding_mode`、`binding_owner`、`current_file`、`data_source`。connecting 下缺字段不推断已准备，示例不冒充真实文件。
- canonical 结果和模型文本均包含真实视图、节点候选、源文件／来源状态及 delivered／queued／ack 的实际状态；状态查询不能用估计视图值替代已确认镜像。
- 与工作台的 `structuredDocumentView.getState/subscribe/dispatch` 既有服务方法保持，追加来源字段不删既有 shape。软依赖恢复／摘除及时更新源能力，不能用 Context 代理对象引用相等判断服务世代。

### Requirement: desktop-workflow-contract-C4 4. 设置与旧持久值

系统 SHALL 在实现本变更时遵守以下接口、状态和异常处理契约。

#### Scenario: desktop-workflow-contract-C4-S01 4. 设置与旧持久值

- **WHEN** 执行设置与旧持久值相关操作
- **THEN** 满足以下全部规则，任何未实现部分保持待实现状态：

- `autoOpenTab/defaultView/defaultLayout/defaultMindmapDepth` 保留在 better-sidebar `pluginSettings['structured-document-view']`，由实际上游条目保存；不复制到插件 Config 或全局 settings.yaml。
- 原四项设置的默认、非法回退、0 表示不限、新 runtime 生效与 reset_view 读取当前默认保留；不追溯改变已经打开的会话视图。
- 侧边卡片声明按 0.25.0 公开描述符验证；保留未知 prefs 与其他插件设置。旧 prefs 仅在实际存储所有者迁移时预览／备份／映射，不为刷新默认值覆写旧原始值。
- 配置卡关闭影响入口／自动打开，不能擅自清除文档内核、已保存正文或另一个会话的视图状态。

### Requirement: desktop-workflow-contract-C5 5. 三场景验收

系统 SHALL 在实现本变更时遵守以下接口、状态和异常处理契约。

#### Scenario: desktop-workflow-contract-C5-S01 5. 三场景验收

- **WHEN** 执行三场景验收相关操作
- **THEN** 满足以下全部规则，任何未实现部分保持待实现状态：

- thinking：明确创建后展示同一固定稿；选中、章节阅读、思维导图与批量修改／撤销能同步。
- 会议：原始材料浏览不会改变记录／纪要目标；显式切稿、空态、图片来源核对与保存后打开能区分；重连后真实稿恢复，旧连接的镜像不盖新快照。
- project：固定主文档的 OKR／KR OGSM／WBS 可按角色／状态过滤并定位，同名编号按章节消歧；查看项目 JSON／周报／Excel 不隐式替换该主文档。表格视图只投影文档，不冒充 Excel 编辑器。
- 两会话、两个窗口、客户端先于内核、内核重挂载、原生文件标签与底部标签、浅深色／窄栏、键盘／标签生命周期均检查；现有 17 工具与四设置回归。

本次仅编写契约，不修改源码、协议实现、prefs、构建产物或包版本；已有 Web 测试不作为 Desktop 兼容结论。
