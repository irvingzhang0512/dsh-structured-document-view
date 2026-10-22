# F001 文档 Provider 与会话隔离

## Purpose

为 dsh-structured-document-view 的文档 Provider 与会话隔离维护唯一可编辑的行为与验收规格，保留原编号 F001，区分当前预期、尚未实现设计和历史验证；原始需求、项目资料及旧文档继续原位只读保留。

## Requirements

### Requirement: F001 文档 Provider 与会话隔离

系统 SHALL 按下列完整场景落实文档 Provider 与会话隔离的预期、边界与验收。本节迁入已有功能规则；本次仅迁移文档，没有重新执行产品验收。

#### Scenario: F001-S01 场景与预期

- **WHEN** 宿主或客户端切换会话及文档 Provider
- **THEN** 场景与预期：通过 Document Bridge 获取结构化文档及选择；宿主未安装文档内核时提供会议／项目／思路 Mock；按会话管理连接与状态。

#### Scenario: F001-S02 边界与异常

- **WHEN** 宿主或客户端切换会话及文档 Provider
- **THEN** 边界与异常：固定目标由工作台优先协调，普通浏览可由文件桥提供；无文档需显示空状态；示例数据只在宿主明确声明"无文档内核"时使用，"尚未握手"不等于"无内核"（见 F010）。

#### Scenario: F001-S03 验收条件

- **WHEN** 宿主或客户端切换会话及文档 Provider
- **THEN** 验收条件：切换会话不串状态；安装内核时读取实际 IR；无内核时 Mock 可读。
