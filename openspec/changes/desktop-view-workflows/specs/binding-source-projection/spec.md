# F013 宿主绑定所有权与来源投影

## Purpose

为 dsh-structured-document-view 的宿主绑定所有权与来源投影维护唯一可编辑的行为与验收规格，保留原编号 F013，区分当前预期、尚未实现设计和历史验证；原始需求、项目资料及旧文档继续原位只读保留。

## ADDED Requirements

### Requirement: F013 宿主绑定所有权与来源投影

系统 SHALL 按下列完整场景落实宿主绑定所有权与来源投影的预期、边界与验收。本节为原有待实现设计的格式迁移，尚未获得实施批准，不作为现有能力。

#### Scenario: F013-S01 场景与预期

- **WHEN** 宿主固定绑定发生变化或用户浏览材料
- **THEN** 场景与预期：跟随宿主 getBindingState；fixed 的文档／空态不接受浏览材料引起的隐式改绑；hello／document／get_view_state 投影真实 binding 与 data source。

#### Scenario: F013-S02 边界与异常

- **WHEN** 宿主固定绑定发生变化或用户浏览材料
- **THEN** 边界与异常：移除依靠 window 全局标记的所有权判断；无 fixed owner 时独立视图跟随保持；例子不冒充真实稿，另一文档同 node ID 不继承旧选中。

#### Scenario: F013-S03 验收条件

- **WHEN** 宿主固定绑定发生变化或用户浏览材料
- **THEN** 验收条件：记录／纪要、项目主文档浏览材料后目标不变；清目标仍为空；重连与内核变化正确刷新；canonical 和模型文本都可得源文件／绑定模式及真实确认结果。
