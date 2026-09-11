# dsh-structured-document-view

DSH（DeepSeek Harness）插件：基于 dsh-better-sidebar 展示**结构化文档**的
多视图侧边栏页（Markdown / 思维导图 / 表格），配套 9 个 **View Tool** 与
可导入的**中文 Skill**，让 Agent 与用户用自然语言控制"视图状态"。

> 数据源：默认内置 Mock 示例（会议纪要 / 项目管理 / 思路整理）。
> 安装 `dsh-structured-document` 后**自动切换为真实文档**——在侧边栏打开
> 一个 Markdown 结构化文档即被解析为 IR 并实时展示；文档由
> dsh-structured-document 的工具修改时，视图自动刷新。

## 特性

- **三种视图**：Markdown（标题层级 + 角色标签 + 属性）、思维导图
  （mind-elixir：展开/收起/点击/缩放/平移/聚焦/三种布局）、表格
  （按角色分组 + 属性列）；
- **视图状态与文档分离**：`currentView / selected / focused / expanded /
  collapsed / depth / zoom / pan / layout / filter` 全部是纯 reducer 的
  不可变状态，**只影响"怎么看"，绝不改文档**；
- **9 个 View Tool**：set_view / get_view_state / expand_node / collapse_node /
  focus_node / set_depth / set_layout / set_filter / reset_view；
- **中文 Skill**：安装插件即安装技能，支持「切成思维导图」「只显示两层」
  「展开第二个议题」「聚焦当前节点」「改成从左到右布局」「恢复默认视图」
  等自然语言意图；
- **复用 dsh-better-sidebar**：Tab / 展示区域 / 生命周期全部复用，
  软依赖（optional peerDependency），未安装时 Agent 工具仍可用（排队自动应用）；
- **Node ID 一致**：思维导图节点 ID 就是文档节点 ID，点击/聚焦/展开
  与文档节点一一对应；
- **与 dsh-structured-document 双向配合**：宿主 `ctx.get` 软依赖探测 +
  文档/选中经桥推送（HostBackedDocumentProvider），视图点选回写选中，
  better-sidebar 当前文件联动懒绑定；未装时完整回退 Mock（独立可用）。

## 快速开始

```bash
# 仅视图（Mock 示例文档）
dsh plugin --profile web add dsh-structured-document-view@latest

# 配合真实结构化文档（推荐装齐）
dsh plugin --profile web add dsh-structured-document@latest
```

浏览器刷新后，侧边栏「+」打开 **结构化文档** 页；装了
dsh-structured-document 后在侧边栏打开一个 `.md` 结构化文档即开始展示。
详见 [docs/usage.md](docs/usage.md)。

## 文档

- [架构与设计决策](docs/architecture.md)
- [视图与渲染器](docs/views.md)
- [视图工具](docs/tools.md)
- [视图技能](docs/skill.md)
- [Document Provider 接口](docs/document-provider.md)
- [Sidebar 集成](docs/sidebar-integration.md)
- [使用指南](docs/usage.md)

## 开发

```bash
npm install
npm run typecheck   # 类型检查
npm test            # 87 个测试（含 Skill→Tool 端到端链路）
npm run build       # 构建 lib/（宿主 tsc + 客户端 tsdown bundle）
npm pack            # 打包发布产物
```

## 发布检查

- 客户端 bundle：`lib/client.js`，`window.__ModuleLoader__.load({ id: 'dsh-structured-document-view', factory })`
  单一闭包，mind-elixir 内联、react 走模块表、无 node 内建 / @deepseek-ai value import；
- 宿主半区：`lib/index.js`（tsc 编译，含 cordis.patch.yml 挂载声明）；
- 随包：`skills/`（自动注册）、`docs/`、`examples/`、`tests/`。

## License

MIT — 见 [LICENSE](LICENSE)。
