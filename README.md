**English** | [简体中文](README.zh-CN.md)

# dsh-structured-document-view

A DSH (DeepSeek Harness) plugin that adds a **Structured Document** page to the web sidebar on top of `dsh-better-sidebar`. It renders the current structured document in three switchable views — **Markdown**, **Mind Map**, and **Table** — and ships **17 View Tools** plus a bundled **Chinese skill**, so both agents and users can control the *view state* with natural language.

> View state only — never the document. Every tool and every skill intent changes *how* the document is displayed (view type, depth, layout, filter, expansion, focus, zoom, pan). The document content itself is never modified; editing belongs to the data source (`dsh-structured-document` when installed, or the built-in mock documents).

## Features

- **Three views over one document**
  - `markdown` — heading hierarchy with role labels and property lists;
  - `mindmap` — powered by [mind-elixir](https://www.npmjs.com/package/mind-elixir) v5 (read-only): expand/collapse, click to select, wheel zoom, drag pan, focus-to-center, and three layouts (`mind` / `logical` / `down`);
  - `table` — grouped by role with property columns (respects depth and filter).
- **View state is fully separated from the document** — `currentView / selected / focused / expanded / collapsed / depth / zoom / pan / layout / filter` is pure, immutable reducer state. It only affects *how you look*, never the document.
- **17 View Tools** cover view switching, section reading, node navigation, layout/depth/filter controls, zoom/fit, command help, and opening the tab. Each tool has a single responsibility and returns a uniform envelope `{ ok, code, message, delivered, queued, ... }`.
- **Chinese skill included** — installing the plugin auto-registers the `structured-document-view` skill. It understands natural-language intents such as "switch to mind map", "show only two levels", "expand the second topic", "focus the current node", "switch to left-to-right layout", and "restore the default view".
- **Tab opens automatically** — the Structured Document tab opens itself the first time a session becomes active; `open_view_tab` opens/activates it on demand at any time.
- **Node IDs stay identical** — mind map node IDs *are* the document node IDs, so clicks, focus, and expansion map 1:1 to document nodes.
- **Mock by default, real documents on demand** — ships with three built-in mock documents (meeting minutes / project management / idea organization) and works standalone. Installing `dsh-structured-document` switches the view to real documents automatically via `HostBackedDocumentProvider`: the host pushes document snapshots and selection over the bridge, clicks in the view write the selection back, and the better-sidebar current file is linked through lazy binding. Without it, everything falls back to Mock — fully usable on its own.
- **Reuses `dsh-better-sidebar`** — the tab, display area, and lifecycle all come from better-sidebar (optional peer dependency). If it is missing, the host-side tools, bridge, and skill still work; commands are queued and applied automatically once the view opens.

## Quick Start

**Requirements**

- DSH web (Node >= 20);
- `dsh-better-sidebar` — soft dependency, recommended (provides the sidebar page and current-file linking; the host-side tools, bridge, and skill still work without it);
- `dsh-structured-document` — optional; install to show real structured documents instead of the built-in mock examples.

```bash
# View only — works standalone with the built-in mock documents
dsh plugin --profile web add dsh-structured-document-view@latest

# Recommended: pair with the real document data source
dsh plugin --profile web add dsh-structured-document@latest
```

After installing, refresh the browser: the sidebar "+" menu shows the **Structured Document** page, and it opens automatically for the active session. Without `dsh-structured-document` you see the built-in mock documents; with it, open a `.md` / `.markdown` structured document in the sidebar to start rendering the real one — the mock switcher disappears, and edits made through `dsh-structured-document` tools refresh the view live.

## View Tools

All tools are scoped to the calling agent's session and only mutate view state. Commands are dispatched to the browser client over a WebSocket bridge; if the view is not open they are queued and applied automatically when it opens. `get_view_state` reads the host state mirror directly.

| Tool | Parameters | Purpose |
| --- | --- | --- |
| `open_view_tab` | — | Open / activate the Structured Document sidebar tab |
| `set_view` | `view`: `markdown` \| `mindmap` \| `table` | Switch the current view |
| `get_view_state` | — | Current view state plus the document outline with Node IDs |
| `expand_node` | `node?` | Expand a node (explicit expansion can exceed the depth limit) |
| `collapse_node` | `node?` | Collapse a node's subtree |
| `focus_node` | `node?` | Focus a node (center it and select it) |
| `open_node` | `node?` | Open a node and all descendants in the Markdown section reader |
| `set_reader_mode` | `mode`: `section` \| `document` | Read the current section or the whole document |
| `navigate_section` | `direction`: `previous` \| `next` | Move between sibling sections |
| `set_zoom` | `zoom?` / `factor?` | Set or adjust mind-map zoom |
| `fit_view` | — | Fit currently visible content |
| `reset_viewport` | — | Reset zoom and center the root |
| `get_view_help` | `level?` | List natural-language command examples |
| `set_depth` | `depth`: `0`–`20` | Show only the first N levels (`0` / `null` = unlimited; root is level 1) |
| `set_layout` | `layout`: `mind` \| `logical` \| `down` | Mind map layout: both sides / right side / top-down |
| `set_filter` | `filter?` | Filter by role or properties; omit or pass `{}` to clear |
| `reset_view` | — | Restore the default view (Markdown, all levels, no filter) while keeping the current selection |

For `expand_node` / `collapse_node` / `focus_node`, the `node` parameter accepts:

1. a **Node ID** (`node_023` — the most reliable; get it from `get_view_state`'s outline);
2. the alias **`current`** (the default; equivalent to `@selected` / `@current` / `@focused`);
3. a **title** (exact match first, then substring match; multiple candidates return a candidate list instead of guessing).

## Skill

The bundled Chinese skill `structured-document-view` is registered automatically when the plugin mounts — installing the plugin installs the skill. It maps Chinese natural-language intents to tool sequences (English translations shown for reference):

| Intent | Tool call |
| --- | --- |
| Switch to mind map | `set_view(view="mindmap")` |
| Show it as a table | `set_view(view="table")` |
| Show only two levels | `set_depth(2)` |
| Expand the second topic | `get_view_state` → `expand_node(node=<Node ID>)` |
| Collapse everything else | `get_view_state` → `collapse_node` per sibling |
| Focus the current node | `focus_node()` (defaults to the current selection) |
| Switch to left-to-right layout | `set_layout(layout="logical")` |
| Restore the default view | `reset_view()` |
| Show only to-dos | `set_filter(filter={ role: "action_item" })` / `{ role: "task" }` |
| Clear the filter | `set_filter({})` |

## Development

```bash
npm install
npm run typecheck   # type check (inlines the mind-elixir CSS first)
npm test            # Vitest unit tests
npm run build       # build lib/ (host tsc + client tsdown bundle)
npm pack            # package the publishable artifact
```

## Documentation

All docs live under `docs/` (written in Chinese):

- [Usage guide](docs/usage.md)
- [Architecture & design decisions](docs/architecture.md)
- [Views & renderers](docs/views.md)
- [View tools](docs/tools.md)
- [View skill](docs/skill.md)
- [Document provider interface](docs/document-provider.md)
- [Sidebar integration](docs/sidebar-integration.md)

## License

MIT — see [LICENSE](LICENSE).
