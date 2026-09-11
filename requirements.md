
# dsh-structured-document-view 需求规格说明书 V0.1

## 1. 项目名称

`dsh-structured-document-view`

中文名称：

**DSH 结构化文档视图插件**

---

## 2. 项目目标

该插件用于：

> 将结构化文档以更适合阅读和理解的方式展示，并支持通过界面操作或中文自然语言控制展示方式。

第一阶段主要支持：

* Markdown 视图（Markdown View）
* 思维导图视图（Mind Map View）
* 表格视图（Table View）

后续可继续增加：

* 流程图
* PPT 大纲
* 时间线
* 看板
* 其他结构化视图

---

# 3. 插件定位

整个系统中几个插件的职责：

```text
dsh-better-sidebar
负责：在哪里展示

dsh-better-sidebar-controller
负责：当前打开哪个文件

dsh-structured-document
负责：文档内容是什么、怎么修改

dsh-structured-document-view
负责：文档怎么展示
```

本插件不负责：

* 文件管理
* 文件选择
* 文档内容的增删改
* 语音识别
* 项目管理逻辑
* 会议纪要生成逻辑

---

# 4. 插件整体组成

插件主要包含四部分：

```text
dsh-structured-document-view

├─ 1. 视图展示 View / Renderer
│
├─ 2. 视图工具 View Tools
│
├─ 3. 视图技能 View Skill
│
└─ 4. 桥接与适配 Bridge / Adapter
```

---

# 5. 第一部分：视图展示

## 5.1 作用

读取结构化文档，将同一份文档以不同方式展示。

例如同一份项目文档：

```text
第二技术路线
├─ 9月验证
│  ├─ 热红外验证
│  └─ 人员检测
└─ 项目风险
```

可以分别展示为：

```text
Markdown
思维导图
表格
```

文档内容本身不发生变化。

---

# 6. Markdown 视图

主要用于：

* 阅读完整正文
* 查看详细内容
* 查看标题层级
* 查看属性

例如：

```markdown
# 第二技术路线

## 9月验证

### 热红外验证

- 负责人：张三
- 状态：进行中
- 进度：50%
```

第一阶段优先复用 `dsh-better-sidebar` 已有 Markdown 展示能力。

---

# 7. 思维导图视图

思维导图是第一阶段重点能力。

不能只是将文档静态转换成图片，而应支持交互。

至少支持：

```text
显示节点
展开节点
收起节点
选择节点
聚焦节点
缩放
拖动画布
切换布局
拖动节点
```

---

## 7.1 思维导图数据来源

数据来源为统一结构化文档：

```text
Document 文档
└─ Node 节点
   ├─ id
   ├─ title
   ├─ content
   ├─ role
   ├─ properties
   └─ children
```

需要增加：

```text
Mind Map Adapter
思维导图适配层
```

负责：

```text
Structured Document IR
        ↓
Mind Map Adapter
        ↓
思维导图库需要的数据格式
```

---

## 7.2 Node ID 必须保持一致

思维导图中的节点必须使用结构化文档原始 Node ID。

例如：

```text
结构化文档：

node_023
标题：热红外验证
```

思维导图中也必须：

```text
id = node_023
```

以支持后续：

```text
点击节点
↓
知道对应哪个文档节点
```

---

## 7.3 第一阶段思维导图库

优先考虑：

```text
MindElixir
```

原因：

* 支持节点展开 / 收起
* 支持节点选择
* 支持拖拽
* 支持缩放和平移
* 支持节点事件
* 更接近结构化 Node 模型

具体库在开发阶段仍可评估调整，但需要满足本需求中的交互能力。

---

# 8. 思维导图节点展示

思维导图节点默认不显示全部正文。

优先显示：

```text
Title 标题
```

如果没有标题，可以使用：

```text
Content 内容摘要
```

例如：

```text
☑ 热红外验证
⚠ 开发板性能风险
? 是否需要增加锅具分类
```

Role（角色）后续可以影响：

* 图标
* 节点样式
* 标签

V0.1 不要求复杂视觉设计。

---

# 9. 思维导图交互

## 9.1 展开 / 收起

例如用户点击：

```text
[-] 第二技术路线
```

收起其子节点。

该操作：

> 只修改视图状态，不修改结构化文档。

---

## 9.2 点击节点

用户点击：

```text
热红外验证
```

应产生：

```text
Selected Node
当前节点 = node_023
```

通过桥接层同步给结构化文档系统。

---

## 9.3 拖动节点

需要区分两种操作。

### 仅调整视觉位置

例如只是为了布局美观：

```text
把节点拖到更右边
```

只修改：

```text
View State
视图状态
```

不修改文档结构。

### 修改父子结构

例如：

```text
把“人员检测”拖到“10月方案实现”下面
```

表示文档关系发生变化。

应调用：

```text
move_node
移动节点
```

真正修改 `dsh-structured-document` 中的结构。

原则：

> 思维导图库不是数据真源，Structured Document IR 才是数据真源。

---

# 10. 表格视图

表格主要用于 Role 和 Properties 较明确的内容。

例如项目 Task（任务）：

| 任务       | 负责人 | 状态   | 进度 |
| ---------- | ------ | ------ | ---- |
| 热红外验证 | 张三   | 进行中 | 50%  |
| 人员检测   | 李四   | 未开始 | 0%   |

适合展示：

* 项目任务
* 风险
* 待办
* 会议 Action Item
* 其他有明确属性的节点

V0.1 以展示和筛选为主，暂不要求复杂表格编辑。

---

# 11. 第二部分：视图状态

插件需要维护独立的 View State（视图状态）。

例如：

```text
Current View
当前视图

Selected / Focused Node
当前聚焦节点

Expanded Nodes
已展开节点

Collapsed Nodes
已收起节点

Depth
显示层级

Zoom
缩放比例

Pan
画布位置

Layout
布局

Filter
筛选条件
```

重要原则：

> View State 影响“怎么看”，不能改变文档真实内容。

---

# 12. 第三部分：视图工具

视图工具供 Agent 调用。

V0.1 建议支持：

```text
set_view
切换视图

get_view_state
获取视图状态

expand_node
展开节点

collapse_node
收起节点

focus_node
聚焦节点

set_depth
设置显示层级

set_layout
设置布局

reset_view
恢复默认视图
```

后续增加：

```text
set_filter
设置筛选
```

---

## 12.1 示例

用户：

```text
切成思维导图。
```

执行：

```text
set_view(mindmap)
```

用户：

```text
只显示三层。
```

执行：

```text
set_depth(3)
```

用户：

```text
展开当前节点。
```

执行：

```text
expand_node(current_node)
```

用户：

```text
聚焦算法方案这一块。
```

执行：

```text
focus_node(...)
```

用户：

```text
恢复默认。
```

执行：

```text
reset_view()
```

---

# 13. 第四部分：View Skill（视图技能）

插件需要提供：

```text
SKILL.md
```

作用：

> 让 LLM 能够根据中文自然语言调用 View Tools。

用户不需要知道 Tool 名。

例如：

```text
“切成思维导图。”

“把第二部分展开。”

“只显示两层。”

“切成表格，只看任务。”

“恢复默认视图。”
```

由 Skill 判断应该调用哪些 Tool。

---

# 14. 与 LLM 的关系

多数文档修改不经过本插件。

例如：

```text
增加一个任务
负责人改成张三
把这个移动到9月下面
```

这些应该由：

```text
dsh-structured-document
```

完成。

只有涉及：

```text
怎么看
显示什么
如何布局
```

才调用本插件。

例如：

```text
切成思维导图
只显示三层
展开这个
聚焦这里
用表格看
```

---

# 15. 第五部分：Document Bridge（文档桥接层）

由于 `dsh-structured-document` 当前尚未完成，本插件不能直接依赖其内部实现。

需要定义一个稳定的：

```text
Document Provider Interface
文档提供接口
```

第一阶段至少包含：

```text
get_document
获取当前文档

get_selected_node
获取当前节点

select_node
选择节点

subscribe_document_changed
监听文档变化

subscribe_selected_node_changed
监听当前节点变化
```

---

# 16. Mock Provider（模拟文档提供器）

在 `dsh-structured-document` 尚未完成时，View 插件使用：

```text
Mock Document Provider
模拟文档提供器
```

加载测试数据，例如：

```text
meeting.json
project.json
thinking.json
```

完成 View 插件独立开发。

未来：

```text
Mock Provider
    ↓
替换为
    ↓
Structured Document Provider
```

Renderer、View Tool、Skill 不需要重写。

---

# 17. 文档变化处理

第一版只需要监听：

```text
Document Changed
文档变化

Selected Node Changed
当前节点变化
```

收到 Document Changed：

```text
重新获取 Document
↓
IR → View Adapter
↓
刷新当前视图
```

V0.1 不要求复杂增量更新。

---

# 18. Sidebar Adapter（Sidebar 适配层）

本插件与 `dsh-better-sidebar` 强关联。

需要单独提供：

```text
Sidebar Adapter
Sidebar 适配层
```

负责：

* 注册 View
* 注册 Viewer / Tab
* 获取展示容器
* 切换视图
* 更新界面
* 与 Sidebar 生命周期同步

不要让 Renderer 直接大量调用 Sidebar 内部 API。

结构：

```text
better-sidebar
      ↑
Sidebar Adapter
      ↑
Renderer
```

---

# 19. 整体架构

```text
              DSH Agent
                  │
              View Skill
                  │
              View Tools
                  │
              View State
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
    Markdown   Mind Map    Table
    Renderer   Renderer   Renderer
        │         │         │
        └─────────┼─────────┘
                  │
           Sidebar Adapter
                  │
                  ▼
        dsh-better-sidebar


结构化文档数据：

Mock / dsh-structured-document
                  │
           Document Bridge
                  │
                  ▼
              Renderers
```

---

# 20. 典型使用流程

## 场景一：思路整理

当前展示 Markdown。

用户：

```text
切成思维导图。
```

系统切换。

用户：

```text
只显示两层。
```

系统调整 View State。

用户点击：

```text
算法方案
```

当前节点更新。

用户再说：

```text
这个下面增加一个锅具分类方案。
```

该操作由：

```text
dsh-structured-document
```

完成。

文档修改后 View 自动刷新。

---

## 场景二：项目管理

用户：

```text
用表格看任务。
```

显示任务表格。

用户：

```text
切回思维导图，我想看目标拆解。
```

切换 Mind Map View。

整个过程中结构化文档内容没有变化。

---

# 21. V0.1 重点能力

第一阶段优先验证：

```text
1. IR → Markdown
2. IR → Mind Map
3. IR → Table

4. 思维导图展开 / 收起
5. 思维导图点击节点
6. 缩放 / 平移
7. 聚焦
8. 布局切换

9. View Tool
10. 中文 Skill

11. Document Changed → 自动刷新
12. View 点击 → Selected Node
```

---

# 22. V0.1 暂不实现

暂不实现：

* PPT 编辑
* Excel 编辑
* 流程图
* 看板
* 多人协作
* 复杂视觉主题
* 复杂动画
* View 中直接编辑大量正文
* AI 自动选择最佳视图
* 大规模文档增量渲染优化
* 完整 Document Plugin 集成

---

# 23. 测试数据

至少准备：

```text
examples/
├─ meeting.json
├─ project.json
└─ thinking.json
```

分别模拟：

* 会议纪要
* 项目管理
* 思路整理

重点验证三种数据都可以：

```text
Markdown 展示
思维导图展示
表格展示
```

---

# 24. 发布要求

该插件计划独立发布。

需要：

```text
README.md
CHANGELOG.md
LICENSE
docs/
examples/
tests/
SKILL.md
```

文档中文优先。

代码、Tool、接口采用规范英文命名，但必须提供中文对应说明。

---

# 25. 一句话定义

`dsh-structured-document-view`：

> 基于 `dsh-better-sidebar` 提供 Markdown、思维导图、表格等结构化文档多视图展示，并通过 View Tool 和中文 Skill 控制展示状态，通过 Document Bridge 与 `dsh-structured-document` 解耦集成。
