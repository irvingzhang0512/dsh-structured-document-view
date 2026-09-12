[English](README.md) | **简体中文**

# dsh-structured-document-view

DSH（DeepSeek Harness）插件：基于 `dsh-better-sidebar` 在侧边栏展示**结构化文档**的多视图页（Markdown / 思维导图 / 表格），配套 **10 个 View Tool** 与随包**中文 Skill**，让 Agent 与用户用自然语言控制「视图状态」。

> 视图只负责「怎么看」，绝不改文档。所有工具与技能意图只改变展示方式（视图类型 / 层级 / 布局 / 筛选 / 展开收起 / 聚焦 / 缩放平移）；文档内容由数据源侧维护（安装 `dsh-structured-document` 后为真实文档，否则为内置 Mock）。

## 特性

- **三种视图，同一份文档**
  - `markdown`：标题层级 + 角色标签 + 属性列表；
  - `mindmap`：基于 mind-elixir v5（只读）——展开/收起、点击选中、滚轮缩放、拖动画布平移、聚焦居中，支持 `mind`（两侧）/ `logical`（右侧，即从左到右）/ `down`（上下）三种布局；
  - `table`：按角色分组 + 属性列（尊重层级与筛选）。
- **视图状态与文档分离**：`currentView / selected / focused / expanded / collapsed / depth / zoom / pan / layout / filter` 全部是纯 reducer 的不可变状态，只影响「怎么看」，绝不修改文档。
- **10 个 View Tool**：`set_view` / `get_view_state` / `expand_node` / `collapse_node` / `focus_node` / `set_depth` / `set_layout` / `set_filter` / `reset_view` / `open_view_tab`。每个工具职责单一，统一结果信封 `{ ok, code, message, delivered, queued, ... }`。
- **中文 Skill**：安装插件即自动注册 `structured-document-view` 技能，支持「切成思维导图」「只显示两层」「展开第二个议题」「聚焦当前节点」「改成从左到右布局」「恢复默认视图」等自然语言意图。
- **页签自动打开**：会话首次激活时自动打开「结构化文档」页签；`open_view_tab` 可随时打开/激活该页签。
- **Node ID 一致**：思维导图节点 ID 就是文档节点 ID，点击/聚焦/展开与文档节点一一对应。
- **Mock 默认、真文档可选**：内置三份示例文档（会议纪要 / 项目管理 / 思路整理），独立可用；安装 `dsh-structured-document` 后自动切换为真实文档——宿主经桥推送文档快照与选中（`HostBackedDocumentProvider`），视图点击节点回写选中，better-sidebar 当前文件联动懒绑定；未装时完整回退 Mock。
- **复用 dsh-better-sidebar**：Tab / 展示区域 / 生命周期全部复用，软依赖（optional peerDependency）；未装时宿主侧工具 / 桥 / 技能照常挂载（命令入队，视图打开后自动应用）。

## 快速开始

**环境要求**

- DSH Web 版（Node >= 20）；
- `dsh-better-sidebar`：软依赖，推荐安装（提供侧边栏页与当前文件联动；未装时宿主侧工具 / 桥 / 技能照常工作）；
- `dsh-structured-document`：可选，装齐后展示真实结构化文档（未装时使用内置 Mock 示例）。

```bash
# 仅视图（内置 Mock 示例文档，独立可用）
dsh plugin --profile web add dsh-structured-document-view@latest

# 配合真实结构化文档（推荐装齐）
dsh plugin --profile web add dsh-structured-document@latest
```

浏览器刷新后，侧边栏「+」菜单出现 **结构化文档** 页，会话激活时自动打开。未装 `dsh-structured-document` 时展示内置 Mock 文档；装齐后在侧边栏打开一个 `.md` / `.markdown` 结构化文档即开始展示真实文档（Mock 切换下拉隐藏，文档被修改时视图实时刷新）。详见 [docs/usage.md](docs/usage.md)。

## 工具一览

所有工具绑定调用方 Agent 的会话，只改视图状态；命令经 WebSocket 桥派发给浏览器客户端，视图未打开时入队、打开后自动应用；`get_view_state` 直接读取宿主状态镜像。

| 工具 | 参数 | 作用 |
| --- | --- | --- |
| `open_view_tab` | — | 打开/激活侧边栏「结构化文档」页签 |
| `set_view` | `view`: `markdown` \| `mindmap` \| `table` | 切换视图 |
| `get_view_state` | — | 当前视图状态 + 文档大纲（含 Node ID） |
| `expand_node` | `node?` | 展开节点（显式展开可突破层级限制） |
| `collapse_node` | `node?` | 收起节点子树 |
| `focus_node` | `node?` | 聚焦节点（居中 + 选中） |
| `set_depth` | `depth`: `0`–`20` | 只显示前 N 层（`0` / `null` = 不限；根为第 1 层） |
| `set_layout` | `layout`: `mind` \| `logical` \| `down` | 思维导图布局（两侧 / 右侧 / 上下） |
| `set_filter` | `filter?` | 按角色/属性筛选；省略或传 `{}` 清除 |
| `reset_view` | — | 恢复默认视图（保留当前选中节点） |

`expand_node` / `collapse_node` / `focus_node` 的 `node` 参数支持三种写法：

1. **Node ID**（如 `node_023`，最可靠，先用 `get_view_state` 拿）；
2. **别名 `current`**（缺省值，等价 `@selected` / `@current` / `@focused`）；
3. **标题**（精确匹配优先，否则包含匹配；多候选返回候选列表，不猜测）。

## 技能

随包发布中文 Skill `structured-document-view`，宿主挂载时自动注册（安装插件即安装技能）。典型中文意图 → 工具序列：

| 用户说法 | 工具调用 |
| --- | --- |
| 打开结构化文档 | `open_view_tab()` |
| 切成思维导图 | `set_view(view="mindmap")` |
| 用表格看一下 | `set_view(view="table")` |
| 只显示两层 | `set_depth(2)` |
| 展开第二个议题 | `get_view_state` → `expand_node(node=<Node ID>)` |
| 把其他部分收起来 | `get_view_state` → 逐个 `collapse_node` |
| 聚焦当前节点 | `focus_node()`（缺省 = 当前选中节点） |
| 改成从左到右布局 | `set_layout(layout="logical")` |
| 恢复默认视图 | `reset_view()` |
| 只看待办事项 | `set_filter(filter={ role: "action_item" })` / `{ role: "task" }` |
| 清除筛选 | `set_filter({})` |

## 开发

```bash
npm install
npm run typecheck   # 类型检查（先内联 mind-elixir CSS）
npm test            # Vitest 单元测试
npm run build       # 构建 lib/（宿主 tsc + 客户端 tsdown bundle）
npm pack            # 打包发布产物
```

## 文档链接

docs/ 下的中文文档：

- [使用指南](docs/usage.md)
- [架构与设计决策](docs/architecture.md)
- [视图与渲染器](docs/views.md)
- [视图工具](docs/tools.md)
- [视图技能](docs/skill.md)
- [Document Provider 接口](docs/document-provider.md)
- [Sidebar 集成](docs/sidebar-integration.md)

## 许可证

MIT — 见 [LICENSE](LICENSE)。
