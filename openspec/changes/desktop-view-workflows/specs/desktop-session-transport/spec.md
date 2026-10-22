# F012 Desktop 传输、每会话握手与重连

## Purpose

为 dsh-structured-document-view 的Desktop 传输、每会话握手与重连维护唯一可编辑的行为与验收规格，保留原编号 F012，区分当前预期、尚未实现设计和历史验证；原始需求、项目资料及旧文档继续原位只读保留。

## ADDED Requirements

### Requirement: F012 Desktop 传输、每会话握手与重连

系统 SHALL 按下列完整场景落实Desktop 传输、每会话握手与重连的预期、边界与验收。本节为原有待实现设计的格式迁移，尚未获得实施批准，不作为现有能力。

#### Scenario: F012-S01 场景与预期

- **WHEN** Desktop 创建 runtime、握手或重连
- **THEN** 场景与预期：通过原生公开 URL／会话／侧边栏接口提供每会话 runtime；首次与重连强制推真实文档、选中、绑定和来源状态，不被旧去重键吞掉。

#### Scenario: F012-S02 边界与异常

- **WHEN** Desktop 创建 runtime、握手或重连
- **THEN** 边界与异常：connecting、真实空态与示例数据分开；命令留在调用会话，发送、排队、确认和超时不同；源服务重挂载及时刷新能力，不凭 Context 引用相等判断。

#### Scenario: F012-S03 验收条件

- **WHEN** Desktop 创建 runtime、握手或重连
- **THEN** 验收条件：真实 dsh-app 传输和 Origin 检查；客户端先启动、源恢复／摘除、两会话、重连与多窗口、native／底部标签通过；已保存文件的视图打开失败明确反馈。
