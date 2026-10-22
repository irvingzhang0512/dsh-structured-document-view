# F007 桥接与侧边栏页面

## Purpose

为 dsh-structured-document-view 的桥接与侧边栏页面维护唯一可编辑的行为与验收规格，保留原编号 F007，区分当前预期、尚未实现设计和历史验证；原始需求、项目资料及旧文档继续原位只读保留。

## Requirements

### Requirement: F007 桥接与侧边栏页面

系统 SHALL 按下列完整场景落实桥接与侧边栏页面的预期、边界与验收。本节迁入已有功能规则；本次仅迁移文档，没有重新执行产品验收。

#### Scenario: F007-S01 场景与预期

- **WHEN** 客户端连接、断线、重连或切换会话
- **THEN** 场景与预期：视图标签接入 better-sidebar，宿主／浏览器通过 WebSocket 同步命令、文档和视图镜像，重连后恢复会话。

#### Scenario: F007-S02 边界与异常

- **WHEN** 客户端连接、断线、重连或切换会话
- **THEN** 边界与异常：请求确认、断线排队与递增重连间隔明确；切会话清理旧连接，不能把旧 ack 写到新会话；信任校验保护写入口。

#### Scenario: F007-S03 验收条件

- **WHEN** 客户端连接、断线、重连或切换会话
- **THEN** 验收条件：断线重连恢复对应镜像；会话切换关闭旧资源；跨插件服务与视图可在集成测试连接。

### Requirement: Desktop-20261017 已交付兼容接缝

系统 SHALL 保持已交付的兼容修复，未确认的工作流设计仍留在 change。

#### Scenario: Desktop-20261017-S01 原生兼容接缝

- **WHEN** 在对应固定 Desktop 组合读取会话或建立视图连接
- **THEN** 官方 Connection 替换退役 webRuntime，bundle inject 同步；Desktop WebSocket 使用公开 __DSH_TRANSPORT__.streamBaseUrl，网页保留代理目录，删除启动查询参数。解决原生一直等待 hello 的故障。文档内核是软依赖，通过ctx.inject跟随其到达／卸载，向现有连接重新协商能力并同步文档，修复加载顺序导致已安装内核却永久显示示例的问题。
