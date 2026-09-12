# AGENTS.md

本文件是 **dsh-structured-document-view** 项目的智能体协作约定（Agent 工作指引），
面向在此仓库中开发、评审、维护代码的 AI Agent 与人类协作者。

## 项目概览

DSH（DeepSeek Harness）插件：基于 dsh-better-sidebar 展示**结构化文档**的
多视图侧边栏页（Markdown / 思维导图 / 表格），配套 15 个 **View Tool** 与
可导入的**中文 Skill**，让 Agent 与用户用自然语言控制"视图状态"。

- 视图状态与文档严格分离：视图状态是纯 reducer 的不可变状态，只影响"怎么看"，绝不修改文档；
- 与 `dsh-structured-document` 通过 Document Bridge 解耦集成（宿主软依赖探测，未安装时回退 Mock）；
- 思维导图节点 ID 即文档节点 ID，与文档一一对应。

## 仓库与分支

- 仓库：`https://github.com/irvingzhang0512/dsh-structured-document-view.git`
- 默认分支：`main`（初始提交即建于此分支）
- 发布：通过 npm 发布（见 `package.json` 的 `repository` / `publishConfig`）

## 目录结构

```
src/client/   浏览器端：视图（markdown/mindmap/table）、适配器、状态 store、sidebar 集成
src/document/ 文档侧：Document Provider、Document Bridge、Mock Provider
src/host/     宿主侧：bridge-server、document-integrator、socket、trust-fence、skill-registration
src/shared/   共享类型与纯函数：IR、view-state、view-tree、wire 协议
src/tools/    View Tool 实现（15 个，见 docs/tools.md）
skills/       中文 Skill（SKILL.md）
docs/         架构与设计文档（architecture / views / tools / skill / document-provider / sidebar-integration / usage）
tests/        Vitest 测试
examples/     Mock 示例文档（会议纪要 / 项目管理 / 思路整理）
scripts/      构建辅助脚本（inline-css.mjs）
```

## 常用命令

```bash
npm run typecheck   # 类型检查（含 inline:css）
npm test            # Vitest 单元测试
npm run build       # 构建 lib/ 产物
npm run bundle      # 仅 tsdown 打包
```

约定：`src/client/generated/` 由 `scripts/inline-css.mjs` 构建期生成，不提交；
`lib/`、`node_modules/` 不提交。

## Git 提交规范（Angular / Conventional Commits）

所有提交必须遵循 [Angular 提交规范](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)（即 Conventional Commits）。

### 格式

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
```

- `type` 与 `subject` 必填，`scope` 与 `body` 可选；
- `subject` 用祈使句、小写开头、不超过 72 字符、结尾不加句号；
- 需要时在 `body` 说明动机与影响，`footer` 可写 BREAKING CHANGE / 关联 issue。

### 类型

| type      | 用途                                              |
|-----------|---------------------------------------------------|
| `feat`    | 新功能（对应 minor 版本）                         |
| `fix`     | 缺陷修复（对应 patch 版本）                       |
| `docs`    | 仅文档变更（README、docs/、AGENTS.md 等）         |
| `style`   | 不影响语义的格式调整（空格、分号、格式化）        |
| `refactor`| 重构，不新增功能也不修 bug                        |
| `perf`    | 性能优化                                          |
| `test`    | 新增或修改测试                                    |
| `build`   | 构建系统或依赖变更（tsdown、tsconfig、package.json 等） |
| `ci`      | CI 配置与脚本变更                                 |
| `chore`   | 杂项（初始化、工具、配置等）                      |
| `revert`  | 回滚某次提交                                      |

### 示例

```
feat(view): 支持思维导图 logical 布局

fix(tools): 修复 reset_view 未清除 filter 的问题

docs(readme): 补充 dsh-structured-document 集成说明

chore: 初始化 git 仓库并提交首个版本
```

### 破坏性变更

需要破坏性变更时，在 `footer` 中写 `BREAKING CHANGE: <说明>`，或
在 `type`/`scope` 后加 `!`（如 `feat!(view): ...`）。

### 其他约定

- 保持提交原子化：一次提交只做一件事，便于 `git revert` 与评审；
- 提交前运行 `npm run typecheck` 与 `npm test` 确认通过；
- 版本号变更与 `CHANGELOG.md` 更新放在发布相关的提交中。
