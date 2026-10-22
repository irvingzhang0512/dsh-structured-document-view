# Desktop 视图传输、绑定与三场景协作

## Why

原有需求与技术文档已经描述本范围，但尚未作为完整能力交付；统一迁入 OpenSpec，保持原批准边界与未完成状态，使后续讨论、实现和验收有单一入口。

## What Changes

- F012 Desktop 传输、每会话握手与重连，完整行为与验收见对应 delta spec。
- F013 宿主绑定所有权与来源投影，完整行为与验收见对应 delta spec。
- F014 三场景视图与原设置回归，完整行为与验收见对应 delta spec。
- Desktop 视图传输、绑定与三场景协作技术契约，完整行为与验收见对应 delta spec。
- 本次只整理文档，原始需求和项目资料不变；所有业务实施任务未完成。

## Capabilities

### New Capabilities

- `desktop-session-transport`：F012 Desktop 传输、每会话握手与重连。
- `binding-source-projection`：F013 宿主绑定所有权与来源投影。
- `view-workflow-integration`：F014 三场景视图与原设置回归。
- `desktop-workflow-contract`：Desktop 视图传输、绑定与三场景协作技术契约。

### Modified Capabilities

无已实现行为在本轮被修改；相关旧功能的回归要求随增量保留。

## Impact

影响本插件的领域服务、客户端或模型工具，具体接口和持久化规则见 design 与 specs。与其他插件的联调由维护仓库的协调变更安排；此公开子库不复制个人项目路径和业务正文。
