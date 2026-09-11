# 视图技能（View Skill）

随包发布 `skills/structured-document-view/SKILL.md`，宿主半区挂载时自动注册到
`ctx.skills`（安装插件即安装技能，无需手动拷贝）。

## Skill 元信息

- `name`: `structured-document-view`（kebab-case，符合 DSH 技能命名规范）
- `description` / `whenToUse`: 中文，面向"展示控制"意图
- `source`: `bundled`，`provider`: `dsh-structured-document-view`

## 中文意图 → 工具序列（Skill 内容契约）

| 用户说法 | 工具调用 |
| --- | --- |
| 切成思维导图 | `set_view(view="mindmap")` |
| 用表格看一下 | `set_view(view="table")` |
| 只显示两层 | `set_depth(2)` |
| 展开第二个议题 | `get_view_state` → `expand_node(node=<Node ID>)` |
| 把其他部分收起来 | `get_view_state` → 逐个 `collapse_node(node=<兄弟 Node ID>)` |
| 聚焦当前节点 | `focus_node()`（缺省 = 当前选中节点） |
| 改成从左到右布局 | `set_layout(layout="logical")` |
| 恢复默认视图 | `reset_view()` |
| 只看待办事项 | `set_filter(filter={role:"action_item"})` / `set_filter(filter={role:"task"})` |
| 取消筛选 | `set_filter(filter={})`（空对象 = 清除） |

Skill 还约定：先 `get_view_state` 拿 Node ID 再操作；所有工具只改视图不
改文档；需要改文档的请求不属于本技能。

## 契约测试

`tests/skill.spec.ts` 保证：

1. frontmatter 规范（name kebab-case、description 非空、正文覆盖全部工具）；
2. SKILL.md 提到的每个工具名都是真实注册的工具（防拼写漂移）；
3. **端到端"真正调用 Tool"**：真实 `registerViewTools` + 真实
   `ViewBridgeServer` + 真实 `ViewRuntime` 客户端桩，跑通上述中文意图链路
   （镜像随每次操作更新，断言视图/层级/展开/聚焦/布局/筛选/重置全部生效）。
