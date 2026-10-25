**English** | [简体中文](README.zh-CN.md)

当前 rc3 候选：**0.2.1-rc.3+rev.1**，要求 **DSH Desktop 0.2.1-rc.3**。变化与实际检查范围见 [升级记录](docs/DSH-RC3-20261025.md)；整套安装及试用状态以维护仓库为准。以下带日期的旧交付说明保留历史背景。

## Git 固定提交分发（2026-10-24）

本轮按维护仓库已确认的 Windows 环境构建方案准备 GitHub 直接安装：从固定清单取得本仓库的完整 40 位提交，使用 `git+https://github.com/irvingzhang0512/dsh-structured-document-view.git#<完整提交>`。尖括号是待替换示例，不是可运行地址；不要使用浮动分支。该提交随源码提供 lib、patch、客户端与声明资源，安装不依赖现场编译。办公套件通过固定成员 Git 依赖提供四个组件，不重复直接安装成员。

本轮固定提交须完成推送和公网安装验收后才能称为远程可安装；本地测试不能替代该结论。以下旧安装记录保留历史背景，当前维护组合以私有维护入口的固定锁为准。


> OpenSpec 文档入口：[迁移索引](openspec/MIGRATION.md)。后续开发与管理统一使用 `openspec/specs` 和 `openspec/changes`；旧 `docs/SPEC.md` 与原始需求冻结保留，个人项目资料本轮保持原样，旧文中的“可编辑规格”入口由此替代。新功能先审阅具体方案并确认，再实施与验证；历史资料不双写。

# Irving · Structured Document Views

Display structured documents as Markdown, mind maps, and tables, with view switching, node navigation, hierarchy controls, and filtering.

## What you can do

- Switch between three views of the same document while keeping node IDs and selections aligned.
- Filter by depth, role, or properties; focus nodes, zoom, and change mind-map layouts.
- Use the interface or natural language to switch views, navigate sections, and reset the display.
- Follow document changes without changing business content through view operations.

## Installation

The current local version is **0.2.1-rc.2+rev.1**, targeting **DSH Desktop 0.2.1-rc.2**. Displaying a tab requires **Better Sidebar 0.28.0**. To view your own documents, also install **dsh-structured-document 0.2.1-rc.2+rev.1**. These are optional integrations at the host level, but without the sidebar there is no corresponding display surface, and without the document kernel only clearly labelled sample data is available.

As checked on 2026-10-18, the default branch of the [public repository](https://github.com/irvingzhang0512/dsh-structured-document-view) declares **0.2.0**. The version described here has not been pushed or publicly released. Obtain the complete prebuilt `.tgz` from the maintainer; there is no public download link for this version yet.

1. Install and enable the display dependencies above, checking their versions.
2. Open **Plugins → Add plugin → Install third-party plugin**, enter this archive's absolute local path, check its package name and version, and enable it. Restart DSH when prompted.
3. Enter a workspace session and open **Structured Document** from the sidebar's **+** menu. By default, the tab also opens when a session is first activated.

See the [compatibility record](docs/DSH-UPGRADE-20261017.md) for three-view checks against a real isolated document. Sample rendering, queued commands, and public-source installation are separate verification scopes.

## Configuration

Defaults are sufficient to start. In Better Sidebar's **Settings → Sidebar cards**, find this plugin:

| Setting | Default | Effect |
|---|---|---|
| Automatically open the view tab | Enabled | Open on first session activation |
| Default view for new sessions | Markdown | Initial display |
| Default mind-map layout | Logical, expanding right | Initial layout |
| Default mind-map depth | 2 | `0` means unlimited |

Better Sidebar saves these preferences. They apply to new sessions/runtimes and **Reset view**, without forcibly changing existing session views. Missing values use these defaults.

## First use

1. With the document kernel enabled, ask the Agent to list actual Markdown files in your workspace and choose one. If none exists, explicitly request a new thinking-profile document with three sections, then check its actual saved path.
2. Open the chosen file in Better Sidebar, then open **Structured Document**. Check the file identified in the header. If the workbench is in use, its fixed target takes precedence.
3. Switch to **Mind Map**, then **Table**, and confirm both show the same document.
4. Ask: “Switch to a mind map and show two levels.” Check the view and depth. The source Markdown should remain unchanged by these view operations.

## Common tasks

| Task | Action | Result |
|---|---|---|
| Inspect the hierarchy | Select a mind map and adjust depth | Nodes at the requested levels |
| Review task properties | Select a table and filter by an existing role | Matching nodes and properties |
| Read a section | Select it in the outline or give the Agent its exact title | The corresponding section/node is focused |
| Restore the display | Click **Reset view** | Current configured view, layout, and depth defaults |

## Boundaries

- Before the connection is ready, the page shows a connection state. A kernel with no bound document gives an empty state, not a sample pretending to be your file.
- Labelled samples appear only when the host explicitly reports that no document kernel is present.
- Registered tools do not imply a connected interface. Queued commands have not completed; a timeout does not prove that an operation did not occur.
- Editing content belongs to the document plugin. The table is not a separate spreadsheet editor.
- Further Desktop workflow integration remains proposed or unimplemented in [SPEC](openspec/MIGRATION.md).

## Troubleshooting

### The tab is missing or stays at “connecting”

Check that Better Sidebar, this plugin, and DSH have matching versions and are enabled. Return to the calling session and open the tab from **+**. If it still cannot connect, inspect plugin runtime status before repeating a view command.

### It shows samples instead of my file

Check that the document kernel is installed and enabled, and inspect the source shown in the header. Open a real file or bind a workbench target, then verify its actual path.

## More documentation

- [User guide](docs/usage.md), [view guide](docs/views.md).
- [Tools](docs/tools.md), [bundled skill](skills/structured-document-view/SKILL.md).
- [Current specification](openspec/MIGRATION.md), [changelog](CHANGELOG.md), [architecture](docs/architecture.md).


## Office Suite

This component is also included in **Irving · Office Suite** (`dsh-office-bundle`), version **0.2.1-rc.2+rev.1**. Use the suite for a combined installation, or this package for a standalone installation. Do not enable both composition entries. The suite switch stops all four components; turning it back on preserves each component’s own switch. Disabling or uninstalling retains documents and settings. When migrating an existing installation, use the maintainer’s fixed-package migration rather than adding another copy.

Current naming, version, and Office Suite verification: [2026-10-18 verification](docs/VERIFICATION-OFFICE-20261018.md).
