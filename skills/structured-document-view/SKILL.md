---
name: structured-document-view
description: >-
  控制「结构化文档」视图的展示：打开视图页签，在 Markdown / 思维导图 / 表格之间切换，
  设置显示层级、切换思维导图布局、按角色筛选、展开/收起/定位节点、缩放和适配画布、恢复默认视图。
  所有操作只改变「视图状态」，绝不修改文档本身。常用中文说法：打开结构化文档、
  切成思维导图、用表格看一下、只显示两层、展开第二个议题、把其他部分收起来、
  找到当前节点、打开章节、查看全文、下一节、显示全图、放大一点、改成从左到右布局、恢复默认视图、只看待办事项。
  用户要求修改文档内容或节点时不要使用本技能。
---

# 结构化文档视图控制（dsh-structured-document-view）

通过视图工具控制侧边栏「结构化文档」页的展示。**所有工具只改视图状态，
不改文档**；文档优先来自 dsh-structured-document，未安装时回退到三份 Mock 示例。

## 可用的视图工具

| 工具 | 作用 | 示例 |
| --- | --- | --- |
| `open_view_tab` | 打开侧边栏的「结构化文档」页签（已打开则激活它） | 打开结构化文档；打开视图页 |
| `set_view` | 切换视图：`markdown` / `mindmap` / `table` | 切成思维导图；用表格看一下；切回 Markdown |
| `get_view_state` | 查看当前视图状态、文档大纲与 Node ID | 现在是什么视图；列出大纲 |
| `expand_node` | 展开某节点 | 展开第二个议题 |
| `collapse_node` | 收起某节点 | 把其他部分收起来 |
| `focus_node` | 定位节点；`visible` 仅在看不全时移动，`center` 居中（默认） | 找到当前节点；把当前节点移到中间 |
| `open_node` | 在 Markdown 阅读器打开节点及全部子节点 | 打开第二技术路线；看当前章节 |
| `set_reader_mode` | 切换章节阅读或全文阅读 | 只看当前章节；查看全文 |
| `navigate_section` | 在同一父节点下切换上一节或下一节 | 下一节；上一节 |
| `set_zoom` | 指定比例或相对缩放 | 放大一点；缩小一点；缩放到 80% |
| `fit_view` | 适配当前已显示的全部内容 | 显示全图 |
| `reset_viewport` | 恢复 100% 并居中根节点 | 重置视口 |
| `get_view_help` | 返回简单或组合中文指令 | 我可以怎么说；有哪些语音指令 |
| `set_depth` | 只显示前 N 层（0 或 null = 不限） | 只显示两层；只显示三层 |
| `set_layout` | 思维导图布局：`mind` / `logical` / `down` | 改成从左到右布局（logical） |
| `set_filter` | 按角色与属性筛选，条件之间为 AND（如 `{ role: "task", properties: { owner: "张三", status: "进行中" } }`）；省略 filter 或传空对象 `{}` 表示清除 | 只看待办事项；只看问题；只看进行中的任务；清除筛选 |
| `reset_view` | 恢复默认视图（Markdown、不限层级、清除筛选） | 恢复默认视图 |

## 关键约定

- **节点定位**：`expand_node` / `collapse_node` / `focus_node` 的 `node` 参数
  接受三种写法：
  1. 节点 ID（`node_007`）；
  2. `current`（当前选中节点，等价于 `@selected` / `@current` / `@focused`）；
  3. 标题（唯一匹配即命中；有多个同名节点会返回候选列表）。
- **先查大纲**：要用标题定位节点时，先调用 `get_view_state` 拿到大纲与 Node ID，
  再用 `expand_node(node=node_xxx)` 操作，避免歧义。
- **只看层级**：`set_depth` 的层级以根节点为第 1 层；`0` 或 `null` 表示不限。
  显式展开过的节点不受层级限制（层级是下限，展开优先）。
- **只改视图**：任何工具都不会修改文档；需要改文档请告诉用户另走文档编辑能力。
- **三个不同概念**：「显示全图」只适配当前已显示内容；「全部展开」会改变节点展开状态；
  「重置视口」只恢复缩放和根节点位置。「恢复默认视图」才会重置全部视图设置。
- **隐藏节点**：定位返回 `NODE_HIDDEN` 时，向用户说明是收起、层级或筛选造成，
  提供对应的展开、取消层级或清除筛选说法，不擅自更改设置。

## 典型意图 → 工具序列

- 「打开结构化文档」 → `open_view_tab()`（打开/激活侧边栏视图页签）
- 「切成思维导图」 → `set_view(view="mindmap")`
- 「打开第二技术路线」 → `open_node(node="第二技术路线")`
- 「只看当前章节」 → `set_reader_mode(mode="section")`；「查看全文」 → `set_reader_mode(mode="document")`
- 「下一节」 → `navigate_section(direction="next")`；「上一节」 → `navigate_section(direction="previous")`
- 「用表格看一下」 → `set_view(view="table")`
- 「只显示两层」 → `set_depth(2)`
- 「展开第二个议题」 → `get_view_state`（拿大纲）→ `expand_node(node=<第二个议题的 Node ID>)`
- 「把其他部分收起来」 → `get_view_state` → 对要保留节点之外的兄弟节点逐个 `collapse_node`
- 「找到当前节点」 → `focus_node(mode="visible")`；「移到中间」 → `focus_node(mode="center")`
- 「放大一点」 → `set_zoom(factor=1.25)`；「缩小一点」 → `set_zoom(factor=0.8)`
- 「显示全图」 → `fit_view()`；「重置视口」 → `reset_viewport()`
- 「我可以怎么说」 → `get_view_help(level="simple")`；「复杂指令」 → `get_view_help(level="combined")`
- 「改成从左到右布局」 → `set_layout(layout="logical")`
- 「恢复默认视图」 → `reset_view()`
- 「只看待办事项」 → `set_filter(role="action_item")`（会议文档）或 `set_filter(role="task")`（项目文档）
- 「只看进行中的任务」 → `set_filter(filter={ role: "task", properties: { status: "进行中" } })`（角色与属性 AND 组合）
- 「只看张三的任务」 → `set_filter(filter={ role: "task", properties: { owner: "张三" } })`
- 「只看风险/有风险的」 → `set_filter(role="risk")`；再加属性则 `properties: { status: "有风险" }`
- 「取消筛选」 → `set_filter({})`（空对象 = 清除筛选）

## 执行顺序建议

1. 遇到上述意图时，先 `get_view_state` 了解当前文档与视图；
2. 按上面的序列组合工具；每个工具调用后看返回的 `ok / code / message`；
3. 若用户要求的内容不属于视图控制（例如「把第 2 个议题的内容改掉」），
   说明视图工具只负责展示，不改文档。

组合指令按「打开页签 → 切换视图 → 调整布局/层级/筛选 → 定位或适配」顺序执行；
任一步失败就停止并说明已完成部分。标题有多个候选时必须让用户选择，不猜测。
