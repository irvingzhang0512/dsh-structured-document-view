# 视图与渲染器（Views & Renderers）

导图和表格使用同一份可见性规则（`src/shared/view-tree.ts`），但分别保存层级设置；Markdown 章节阅读器直接读取文档节点树，避免导图层级截断正文。可见性规则把
**文档 IR + 视图状态**折叠成一棵"应该被展示的树"。规则：

1. **层级限制**（`depth`）：根 = 第 1 层；`level > depth` 的节点隐藏，
   除非处于显式展开链上（`expanded_node_ids` 中的节点及其后代）。
2. **收起 / 展开**（`collapsed_node_ids` / `expanded_node_ids`）：显式收起
   隐藏整个子树；显式展开突破层级限制。
3. **筛选**（`filter`）：自身匹配（角色或属性）的节点保留；"自身不匹配但
   后代匹配"的祖先保留（树形筛选标准做法）；根恒可见。

## 1. Markdown 视图（markdown-view.tsx + markdown-render.tsx）

- 默认是“大纲 + 当前章节”阅读器；未选择节点时展示一级章节概览。
- 大纲支持独立折叠及标题、正文、角色和属性搜索；窄于 680px 时变为抽屉。
- 当前章节展示选中节点及其全部子节点；全文模式按 Node ID 定位并高亮当前节点。
- 面包屑、上一节和下一节使用文档节点关系导航，并同步宿主选中节点。
- 适配层 `adapters/markdown.ts` 把视图树序列化为 Markdown：`#` 标题随层级
  降级（最多 `######`，更深用嵌套列表），角色以 `　（role）` 标签展示，
  正文作段落，属性渲染为 `- 键：值`。
- 渲染器 `markdown-render.tsx` 是**自包含轻量实现**（D3）：标题 / 段落 /
  无序/有序列表 / 任务项 / 行内代码 / 粗体 / 斜体 / 链接 / 代码块 / 表格 /
  分隔线。HTML 一律按文本展示（安全）。
- 遵守视图树：depth、filter、collapsed 全部生效。

## 2. 思维导图视图（mindmap-view.tsx + adapters/mindmap.ts）

- **框架**：mind-elixir v5.15.1（MIT，vanilla TS，无框架依赖），
  `editable: false`（V0.1 只读，D7）。
- **Node ID 一致**：导出节点的 `id` 就是结构化文档的 Node ID
  （如 `node_023`）——点击节点即可知道对应哪个文档节点。
- **交互**：
  - 点击节点 → `selectNodes` 事件 → `select_node`（同步当前节点）；
  - 单击后在画布下方显示节点路径和正文摘要；双击或“打开正文”进入 Markdown 章节；
  - 点击展开器 → `expandNode` 事件 → 更新视图状态；
  - 滚轮缩放 / 拖动画布平移 → `scale` / `move` 事件 → 回写 View State；
  - 工具栏：放大 / 缩小 / 自适应 / 重置视口；
  - 聚焦：`focusedNodeId` 变化 → `findEle(id)` + `scrollIntoView(forceCenter)`；
  - 布局切换：`mind` / `logical` / `down` → `initSide()` / `initRight()` /
    `initDown()`。
  - 默认采用 `logical` 右侧单向布局，避免窄侧边栏裁掉根节点左侧的分支；
  - 仅选中状态变化时不刷新整张导图，保留当前缩放和平移位置。
  - 选中节点不完整可见时保留当前缩放，以最小平移量移入画布；尺寸变化后复查。
- **样式**：mind-elixir 的 `MindElixir.css` 构建期内联（D10）随运行时注入；
  插件自身 UI 样式见 `client/plugin-style.ts`。
- **层级语义**：与视图树一致——`depth` 之外的内容整枝隐藏；展开一个在
  层级内的节点可让其子节点（下一层）可见。
  默认显示两层；导图层级不会改变 Markdown 或表格的层级。

## 3. 表格视图（table-view.tsx + adapters/table.ts）

- 一行 = 一个可见节点；按角色分组（同一角色共用一个表头）。
- 列 = 标题 + 该角色出现过的属性键（并集）+ 内容摘要 + 层级。
- **忽略收起**（`ignoreCollapse: true`，扁平视图没有"收起"概念），但
  **尊重 depth 与 filter**——与其它视图的层级/筛选语义完全一致。

## 4. 大纲（adapters/outline.ts）

压缩的树形大纲（id / title / role / children），供 `get_view_state` 返回给
Agent 定位 Node ID。深度上限 8、节点上限 200，超出标记 `outlineTruncated`。
