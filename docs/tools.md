# 视图工具（View Tools）

15 个工具，职责单一（**没有万能 command Tool**）。统一结果信封：
`{ ok, code, message, delivered, queued, ...字段 }` + 独立文本投影。

**核心原则**：所有工具只修改 **View State（视图状态）**，绝不直接修改
文档 IR。命令经 View Bridge 派发给会话的浏览器客户端执行（客户端 ack 并
推送新镜像）；`get_view_state` 从宿主镜像读取。

## 工具清单

| 工具 | 参数 | 作用 | 中文示例 |
| --- | --- | --- | --- |
| `set_view` | `view: markdown\|mindmap\|table` | 切换视图 | 切成思维导图；用表格看一下 |
| `get_view_state` | — | 当前视图状态 + 文档大纲（Node ID） | 现在是什么视图；列出大纲 |
| `expand_node` | `node?` | 展开节点 | 把这个节点展开；展开第二个议题 |
| `collapse_node` | `node?` | 收起节点 | 把其他部分收起来 |
| `focus_node` | `node?, mode?` | 定位节点；visible=移入可视区，center=居中 | 找到当前节点；移到中间 |
| `set_zoom` | `zoom?` 或 `factor?` | 设置或相对调整缩放 | 放大一点；缩放到 80% |
| `fit_view` | — | 适配当前可见内容 | 显示全图 |
| `reset_viewport` | — | 恢复 100% 并居中根节点 | 重置视口 |
| `get_view_help` | `level?` | 获取简单或组合中文说法 | 我可以怎么说 |
| `set_depth` | `depth: 0-20` | 只显示前 N 层（0 = 不限） | 只显示两层 |
| `set_layout` | `layout: mind\|logical\|down` | 思维导图布局 | 改成从左到右布局 |
| `set_filter` | `filter?` | 按角色/属性筛选；空对象 `{}` 或省略 = 清除 | 只看待办事项；清除筛选 |
| `reset_view` | — | 恢复默认视图（保留当前选中） | 恢复默认视图 |

## 节点参数（expand / collapse / focus 的 `node`）

1. **Node ID**：`node_023`（最可靠，推荐先 `get_view_state` 拿）；
2. **别名 current**（缺省值）：`current` / `@selected` / `@current` / `@focused`
   = 当前选中节点；无选中返回 `NO_SELECTED_NODE`；
3. **标题**：精确匹配优先，否则标题包含匹配；多候选返回
   `MULTIPLE_NODES_FOUND` + 候选列表；无匹配返回 `NODE_NOT_FOUND`。

## 结果信封与错误码

- `ok: true` + `code: OK`：已应用（`delivered: true`）；
- `code: QUEUED`：客户端未连接，操作已入队，视图打开后自动应用
  （`queued: true`）；
- `code: BRIDGE_TIMEOUT`：已送达但客户端未在超时内确认（4s）；
- `code: VIEW_UNAVAILABLE`（get_view_state）：该会话没有视图状态镜像——
  需安装 dsh-better-sidebar 与 dsh-structured-document-view 且打开视图页；
- `code: NO_AGENT`：工具必须由会话内 Agent 调用（无法确定会话）；
- 参数级错误由 dsh-tools 的 schema 严格校验拦截（如非法视图 / 布局 /
  非整数 depth / 非对象 filter 等，抛 `ToolArgsError`）；`INVALID_DEPTH`
  （0-20 范围）与 `INVALID_FILTER` 在工具内校验。

## 会话作用域

工具绑定调用方 Agent 的会话（`exec.agent.session.id`）。每个会话独立持有
文档与视图状态（客户端 `ViewSessionManager` 按会话维护运行时），互不串扰。
