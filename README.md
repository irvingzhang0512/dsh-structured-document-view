**English** | [简体中文](README.zh-CN.md)

# Irving · 结构化文档视图

Display structured documents as Markdown, mind maps, and tables, with view switching, node navigation, hierarchy controls, and filtering.

## What you can do

- Switch between three views of the same document while keeping node IDs and selections aligned.
- Filter by depth, role, or properties; focus nodes, zoom, and change mind-map layouts.
- Use the interface or natural language to switch views, navigate sections, and reset the display.
- Follow document changes without changing business content through view operations.

## Installation

The current local version is **0.2.1-rc.2+rev.1**, targeting **DSH Desktop 0.2.1-rc.2**. Displaying a tab requires **Better Sidebar 0.28.0**. To view your own documents, also install **dsh-structured-document 0.2.1**. These are optional integrations at the host level, but without the sidebar there is no corresponding display surface, and without the document kernel only clearly labelled sample data is available.

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
- Further Desktop workflow integration remains proposed or unimplemented in [SPEC](docs/SPEC.md).

## Troubleshooting

### The tab is missing or stays at “connecting”

Check that Better Sidebar, this plugin, and DSH have matching versions and are enabled. Return to the calling session and open the tab from **+**. If it still cannot connect, inspect plugin runtime status before repeating a view command.

### It shows samples instead of my file

Check that the document kernel is installed and enabled, and inspect the source shown in the header. Open a real file or bind a workbench target, then verify its actual path.

## More documentation

- [User guide](docs/usage.md), [view guide](docs/views.md).
- [Tools](docs/tools.md), [bundled skill](skills/structured-document-view/SKILL.md).
- [Current specification](docs/SPEC.md), [changelog](CHANGELOG.md), [architecture](docs/architecture.md).


## 办公套件

本组件也包含在 **Irving · 办公套件**（`dsh-office-bundle`）中，版本 **0.2.1-rc.2+rev.1**。组合使用时安装套件；单独使用时安装本包，避免同时启用两种组合入口。套件总开关停用四个组件，重新开启保留各自子开关；停用或卸载不删除文档和设置。已有安装通过维护者的固定包接管流程切换。
