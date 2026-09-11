# 使用指南（Usage）

## 环境要求

- DSH（DeepSeek Harness）Web 版；
- `dsh-better-sidebar`（软依赖，推荐安装——提供侧边栏页与当前文件联动）；
- 可选 `dsh-structured-document`：装齐后视图直接展示真实结构化文档
  （解析 Markdown 源文件）；未装时使用内置 Mock 示例文档（独立可用）。

## 安装

```bash
# 已发布后（npm registry）
dsh plugin --profile web add dsh-structured-document-view@latest
# 配合真实文档源（可选但推荐）
dsh plugin --profile web add dsh-structured-document@latest

# 本地开发安装（本仓库）
cd dsh-structured-document-view
npm install
npm run build
# 在 dsh 安装目录里把本包加入 bundles（或用 dsh plugin add 指向本地路径）
```

安装后：宿主半区（工具 / 桥 / 技能）自动挂载；浏览器刷新后，侧边栏
「+」菜单出现 **结构化文档** 页。

## 使用（人类用户）

1. 打开侧边栏「结构化文档」页；
2. 顶部工具栏：
   - **视图切换**：Markdown / 思维导图 / 表格；
   - **文档切换**：仅 Mock 阶段可见（未装 dsh-structured-document 时切换
     会议纪要 / 项目管理 / 思路整理）；
   - **层级**：不限层级 / 1-5 层；
   - **布局**（思维导图）：思维导图（两侧）/ 逻辑图（右侧）/ 上下；
   - **筛选**：按角色；
   - **恢复默认**：一键回默认视图（保留当前节点）；
3. 思维导图交互：滚轮缩放、拖动画布平移、点击节点选中、按钮缩放/自适应/
   重置视口；Agent 下发聚焦时自动居中定位。

## 配合 dsh-structured-document（真实文档）

两个插件装齐后自动配合（无需配置）：

1. 在侧边栏打开一个 **Markdown 结构化文档**（`.md` / `.markdown`）——
   dsh-structured-document 把它解析为 IR 并绑定为该会话的当前文件；
2. 「结构化文档」视图页随即展示解析结果（状态栏显示文件名与 revision，
   工具栏的 Mock 文档切换隐藏）；
3. Agent 用 dsh-structured-document 的工具（`add_node` / `update_node` /
   `move_node` / `select_node` …）修改文档 → 视图**实时刷新**；
4. 在视图（思维导图/表格/Markdown）点击节点 → 选中同步回文档侧
   （`select_node` 状态，Agent 可接着用 `@selected` 指代）；
5. 本插件的视图工具（`set_view` / `expand_node` / `set_depth` …）仍只改
   视图状态——文档的真源永远在 dsh-structured-document。

## 使用（Agent / Skill）

Agent 会被自动注入打包的 **structured-document-view** 技能，中文自然语言
即可控制视图，例如：

- 「切成思维导图」「用表格看一下」
- 「只显示两层」「展开第二个议题」「把其他部分收起来」
- 「聚焦当前节点」「改成从左到右布局」「恢复默认视图」
- 「只看待办事项」「清除筛选」

也可直接调用 9 个 View Tool（见 [tools.md](./tools.md)）。

## 常见问题

| 现象 | 原因与处理 |
| --- | --- |
| 侧边栏没有「结构化文档」页 | 未安装 dsh-better-sidebar，或浏览器未刷新；安装/刷新后即有 |
| Agent 说视图不可用（VIEW_UNAVAILABLE） | 该会话的视图页未打开；打开「结构化文档」页即可（已排队的命令会自动应用） |
| 操作提示 QUEUED | 视图页未打开，命令已入队，打开后自动执行 |
| 装了 dsh-structured-document 但视图为空 | 会话尚未绑定当前文件：在侧边栏打开一个 `.md` 结构化文档 |
| 文档切换后节点消失 | 旧文档节点在新文档无意义，选中被清理（设计如此） |

## 开发

```bash
npm run typecheck   # 类型检查（先内联 mind-elixir CSS）
npm test            # 87 个测试（含 Skill→Tool 端到端）
npm run build       # 构建 lib/（宿主 tsc + 客户端 tsdown bundle）
npm pack            # 打包发布产物（lib + src + skills + docs + examples + tests）
```
