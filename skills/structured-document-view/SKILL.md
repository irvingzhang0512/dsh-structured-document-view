---
name: structured-document-view
description: >-
  控制「结构化文档」视图的展示：打开视图页签，在 Markdown / 思维导图 / 表格之间切换，
  设置显示层级、切换思维导图布局、按角色筛选、展开/收起/聚焦节点、恢复默认视图。
  所有操作只改变「视图状态」，绝不修改文档本身。常用中文说法：打开结构化文档、
  切成思维导图、用表格看一下、只显示两层、展开第二个议题、把其他部分收起来、
  聚焦当前节点、改成从左到右布局、恢复默认视图、只看待办事项。
whenToUse: >-
  当用户要求打开侧边栏的「结构化文档」页签，或以 Markdown / 思维导图 / 表格等
  不同视图查看当前会话的结构化文档，或控制展示层级 / 布局 / 筛选 / 节点展开收起 /
  聚焦，或要求恢复默认视图时使用。若用户要求的是「修改文档内容 / 节点 / 议题」，
  这不属于本技能，不要调用视图工具。
---

# 结构化文档视图控制（dsh-structured-document-view）

通过 10 个视图工具控制侧边栏「结构化文档」页的展示。**所有工具只改视图状态，
不改文档**；文档内容由结构化文档数据源（当前为 Mock Provider，三份示例文档：
会议纪要 / 项目管理 / 思路整理）提供。

## 可用的视图工具

| 工具 | 作用 | 示例 |
| --- | --- | --- |
| `open_view_tab` | 打开侧边栏的「结构化文档」页签（已打开则激活它） | 打开结构化文档；打开视图页 |
| `set_view` | 切换视图：`markdown` / `mindmap` / `table` | 切成思维导图；用表格看一下；切回 Markdown |
| `get_view_state` | 查看当前视图状态、文档大纲与 Node ID | 现在是什么视图；列出大纲 |
| `expand_node` | 展开某节点 | 展开第二个议题 |
| `collapse_node` | 收起某节点 | 把其他部分收起来 |
| `focus_node` | 聚焦某节点（居中并选中） | 聚焦当前节点；跳到某节点 |
| `set_depth` | 只显示前 N 层（0 或 null = 不限） | 只显示两层；只显示三层 |
| `set_layout` | 思维导图布局：`mind` / `logical` / `down` | 改成从左到右布局（logical） |
| `set_filter` | 按角色筛选（如 `action_item`、`task`、`problem`）；省略 filter 或传空对象 `{}` 表示清除 | 只看待办事项；只看问题；清除筛选 |
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

## 典型意图 → 工具序列

- 「打开结构化文档」 → `open_view_tab()`（打开/激活侧边栏视图页签）
- 「切成思维导图」 → `set_view(view="mindmap")`
- 「用表格看一下」 → `set_view(view="table")`
- 「只显示两层」 → `set_depth(2)`
- 「展开第二个议题」 → `get_view_state`（拿大纲）→ `expand_node(node=<第二个议题的 Node ID>)`
- 「把其他部分收起来」 → `get_view_state` → 对要保留节点之外的兄弟节点逐个 `collapse_node`
- 「聚焦当前节点」 → `focus_node()`（`node` 省略即当前选中节点）
- 「改成从左到右布局」 → `set_layout(layout="logical")`
- 「恢复默认视图」 → `reset_view()`
- 「只看待办事项」 → `set_filter(role="action_item")`（会议文档）或 `set_filter(role="task")`（项目文档）
- 「取消筛选」 → `set_filter({})`（空对象 = 清除筛选）

## 执行顺序建议

1. 遇到上述意图时，先 `get_view_state` 了解当前文档与视图；
2. 按上面的序列组合工具；每个工具调用后看返回的 `ok / code / message`；
3. 若用户要求的内容不属于视图控制（例如「把第 2 个议题的内容改掉」），
   说明视图工具只负责展示，不改文档。
