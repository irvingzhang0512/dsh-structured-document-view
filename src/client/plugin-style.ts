/**
 * 本插件视图 UI 的样式（自包含，客户端注入）。
 * 与 mind-elixir 的样式（generated/mind-elixir-style.ts）分离。
 */
export const PLUGIN_STYLE = `
.sdv-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  font-size: 13px;
  color: var(--sidebar-fg, #333);
}
.sdv-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  padding: 6px 8px;
  border-bottom: 1px solid var(--sidebar-border, rgba(128,128,128,.25));
  background: var(--sidebar-bg, transparent);
}
.sdv-toolbar-group {
  display: inline-flex;
  gap: 2px;
  align-items: center;
}
.sdv-btn {
  appearance: none;
  border: 1px solid rgba(128,128,128,.35);
  background: transparent;
  color: inherit;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  line-height: 20px;
  cursor: pointer;
  white-space: nowrap;
}
.sdv-btn:hover { background: rgba(128,128,128,.12); }
.sdv-btn-active {
  background: var(--accent-color, #4f6ef7);
  border-color: var(--accent-color, #4f6ef7);
  color: #fff;
}
.sdv-select {
  appearance: none;
  border: 1px solid rgba(128,128,128,.35);
  background: transparent;
  color: inherit;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  line-height: 20px;
  max-width: 140px;
}
.sdv-statusbar {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 8px;
  font-size: 11px;
  color: var(--sidebar-fg-muted, #888);
  border-bottom: 1px solid rgba(128,128,128,.18);
  background: rgba(128,128,128,.06);
  overflow: hidden;
  white-space: nowrap;
}
.sdv-status-doc, .sdv-status-selected {
  overflow: hidden;
  text-overflow: ellipsis;
}
.sdv-status-meta { opacity: .7; margin-left: 6px; }
.sdv-row-selected { outline: 2px solid var(--accent-color, #4f6ef7); outline-offset: -2px; background: rgba(79,110,247,.08); }
.sdv-guide { border-bottom: 1px solid rgba(128,128,128,.18); background: var(--sidebar-bg, #fff); }
.sdv-guide-quick { min-height: 32px; display: flex; align-items: center; gap: 5px; padding: 4px 8px; overflow-x: auto; }
.sdv-guide-label { color: var(--sidebar-fg-muted, #777); white-space: nowrap; font-size: 11px; }
.sdv-guide-chip, .sdv-guide-more { border: 0; border-radius: 10px; padding: 3px 7px; font-size: 11px; color: inherit; background: rgba(79,110,247,.10); cursor: pointer; white-space: nowrap; }
.sdv-guide-chip:hover, .sdv-guide-more:hover { background: rgba(79,110,247,.2); }
.sdv-guide-chip:disabled { opacity: .45; cursor: not-allowed; }
.sdv-guide-more { margin-left: auto; }
.sdv-guide-panel { max-height: 40vh; overflow: auto; padding: 8px; border-top: 1px solid rgba(128,128,128,.14); }
.sdv-guide-context, .sdv-guide-status { color: var(--sidebar-fg-muted, #777); font-size: 11px; margin-bottom: 6px; }
.sdv-guide-controls { display: flex; gap: 6px; margin-bottom: 8px; }
.sdv-guide-search { min-width: 80px; flex: 1; border: 1px solid rgba(128,128,128,.35); border-radius: 4px; padding: 3px 6px; color: inherit; background: transparent; }
.sdv-guide-panel h4 { margin: 8px 0 4px; font-size: 12px; }
.sdv-guide-entry { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid rgba(128,128,128,.10); }
.sdv-guide-copy-text { min-width: 0; flex: 1; user-select: text; }
.sdv-guide-copy-text span, .sdv-guide-copy-text small { display: block; }
.sdv-guide-copy-text small { color: var(--sidebar-fg-muted, #777); margin-top: 2px; }
.sdv-guide-actions { display: flex; gap: 3px; }
.sdv-guide-actions .sdv-btn:disabled { opacity: .45; cursor: not-allowed; }
.sdv-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.sdv-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--sidebar-fg-muted, #888);
  padding: 24px;
  text-align: center;
}
/* Markdown 视图 */
.sdv-markdown-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px 14px;
}
.sdv-markdown { line-height: 1.6; word-break: break-word; }
.sdv-markdown h1, .sdv-markdown h2, .sdv-markdown h3,
.sdv-markdown h4, .sdv-markdown h5, .sdv-markdown h6 {
  margin: 12px 0 6px;
  line-height: 1.3;
  font-weight: 600;
}
.sdv-markdown h1 { font-size: 18px; }
.sdv-markdown h2 { font-size: 16px; }
.sdv-markdown h3 { font-size: 14px; }
.sdv-markdown h4, .sdv-markdown h5, .sdv-markdown h6 { font-size: 13px; }
.sdv-markdown p { margin: 6px 0; }
.sdv-markdown ul, .sdv-markdown ol { margin: 6px 0; padding-left: 22px; }
.sdv-markdown li { margin: 2px 0; }
.sdv-markdown .sdv-task { list-style: none; margin-left: -18px; display: flex; gap: 6px; align-items: baseline; }
.sdv-markdown .sdv-code {
  background: rgba(128,128,128,.15);
  border-radius: 3px;
  padding: 1px 4px;
  font-family: var(--monospace, ui-monospace, monospace);
  font-size: 12px;
}
.sdv-markdown .sdv-pre {
  background: rgba(128,128,128,.1);
  border-radius: 4px;
  padding: 8px 10px;
  overflow: auto;
  font-family: var(--monospace, ui-monospace, monospace);
  font-size: 12px;
}
.sdv-markdown .sdv-table { border-collapse: collapse; margin: 8px 0; }
.sdv-markdown .sdv-table th, .sdv-markdown .sdv-table td {
  border: 1px solid rgba(128,128,128,.3);
  padding: 4px 8px;
}
.sdv-markdown a { color: var(--accent-color, #4f6ef7); }
.sdv-reader-shell { flex: 1; min-height: 0; display: flex; position: relative; container-type: inline-size; }
.sdv-reader-main { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.sdv-outline { width: 230px; flex: 0 0 230px; min-height: 0; display: flex; flex-direction: column; border-right: 1px solid rgba(128,128,128,.2); background: var(--sidebar-bg, #fff); z-index: 3; }
.sdv-outline-header { height: 34px; display: flex; align-items: center; justify-content: space-between; padding: 0 8px; }
.sdv-outline-header button { border: 0; background: transparent; color: inherit; cursor: pointer; display: none; }
.sdv-outline-search { margin: 0 8px 7px; border: 1px solid rgba(128,128,128,.3); border-radius: 5px; padding: 5px 7px; color: inherit; background: transparent; }
.sdv-outline-tree { overflow: auto; padding-bottom: 8px; }
.sdv-outline-row { min-height: 27px; display: flex; align-items: center; }
.sdv-outline-row:hover, .sdv-outline-row.is-selected { background: rgba(79,110,247,.1); }
.sdv-outline-toggle, .sdv-outline-title { border: 0; background: transparent; color: inherit; cursor: pointer; padding: 2px; }
.sdv-outline-toggle, .sdv-outline-spacer { width: 18px; flex: 0 0 18px; }
.sdv-outline-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; flex: 1; padding-right: 6px; }
.sdv-outline-empty { color: var(--sidebar-fg-muted, #888); padding: 12px; text-align: center; }
.sdv-search-result { display: block; width: 100%; border: 0; border-bottom: 1px solid rgba(128,128,128,.12); background: transparent; color: inherit; padding: 7px 9px; text-align: left; cursor: pointer; }
.sdv-search-result:hover { background: rgba(79,110,247,.1); }
.sdv-search-result strong, .sdv-search-result small { display: block; }
.sdv-search-result small { color: var(--sidebar-fg-muted, #888); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sdv-reader-toolbar { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-bottom: 1px solid rgba(128,128,128,.18); }
.sdv-breadcrumb { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--sidebar-fg-muted, #777); }
.sdv-breadcrumb button { border: 0; background: transparent; color: inherit; cursor: pointer; padding: 0 2px; }
.sdv-reader-actions { display: flex; gap: 3px; }
.sdv-reader-node { padding-left: 10px; border-left: 2px solid transparent; }
.sdv-reader-node-selected { border-left-color: var(--accent-color, #4f6ef7); background: rgba(79,110,247,.04); }
.sdv-role-tag { margin-left: 7px; border-radius: 9px; padding: 1px 6px; font-size: 10px; color: var(--sidebar-fg-muted, #777); background: rgba(128,128,128,.12); vertical-align: middle; }
.sdv-properties { margin: 6px 0; padding: 6px 8px; background: rgba(128,128,128,.06); border-radius: 5px; }
.sdv-properties div { display: flex; gap: 7px; }
.sdv-properties dt { color: var(--sidebar-fg-muted, #777); }
.sdv-properties dd { margin: 0; }
.sdv-reader-overview > p { color: var(--sidebar-fg-muted, #777); }
.sdv-overview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px; }
.sdv-overview-grid button { border: 1px solid rgba(128,128,128,.22); border-radius: 7px; padding: 10px; color: inherit; background: transparent; text-align: left; cursor: pointer; }
.sdv-overview-grid button:hover { border-color: var(--accent-color, #4f6ef7); background: rgba(79,110,247,.05); }
.sdv-overview-grid strong, .sdv-overview-grid span { display: block; }
.sdv-overview-grid span { margin-top: 5px; color: var(--sidebar-fg-muted, #777); font-size: 11px; line-height: 1.5; }
.sdv-outline-drawer-button { display: none; }
.sdv-outline-backdrop { display: none; }
@container (max-width: 679px) {
  .sdv-outline-drawer-button { display: block; position: absolute; top: 5px; left: 7px; z-index: 2; border: 1px solid rgba(128,128,128,.3); border-radius: 4px; background: var(--sidebar-bg, #fff); color: inherit; padding: 3px 7px; cursor: pointer; }
  .sdv-outline { display: none; position: absolute; inset: 0 auto 0 0; width: min(85%, 300px); box-shadow: 3px 0 14px rgba(0,0,0,.18); }
  .sdv-outline.is-open { display: flex; }
  .sdv-outline-header button { display: block; }
  .sdv-outline-backdrop { display: block; position: absolute; inset: 0; z-index: 2; border: 0; background: rgba(0,0,0,.2); }
  .sdv-reader-toolbar { padding-left: 83px; flex-wrap: wrap; }
  .sdv-breadcrumb { flex-basis: 100%; }
  .sdv-reader-actions { margin-left: auto; }
}
/* 表格视图 */
.sdv-table-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 10px 12px;
}
.sdv-table-summary { font-size: 11px; color: var(--sidebar-fg-muted, #888); margin-bottom: 8px; }
.sdv-table-group { margin-bottom: 14px; }
.sdv-table-group-title {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 4px;
  padding: 4px 8px;
  background: rgba(79,110,247,.1);
  border-radius: 4px;
  display: inline-block;
}
.sdv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.sdv-table th, .sdv-table td {
  border: 1px solid rgba(128,128,128,.25);
  padding: 4px 6px;
  text-align: left;
  vertical-align: top;
}
.sdv-table th { background: rgba(128,128,128,.08); font-weight: 600; }
.sdv-cell-title { font-weight: 500; white-space: nowrap; }
.sdv-cell-content { color: var(--sidebar-fg-muted, #666); }
.sdv-cell-level { color: var(--sidebar-fg-muted, #999); text-align: center; }
/* 思维导图视图 */
.sdv-mindmap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.sdv-mindmap-toolbar {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 4px 8px;
  border-bottom: 1px solid rgba(128,128,128,.18);
  background: rgba(128,128,128,.06);
}
.sdv-mindmap-zoom { font-size: 11px; color: var(--sidebar-fg-muted, #888); min-width: 40px; text-align: right; }
.sdv-mindmap-hint { margin-left: auto; font-size: 11px; color: var(--sidebar-fg-muted, #999); }
.sdv-mindmap-canvas {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}
.sdv-mindmap-preview { display: flex; align-items: center; gap: 10px; padding: 7px 9px; border-top: 1px solid rgba(128,128,128,.18); background: var(--sidebar-bg, #fff); }
.sdv-mindmap-preview > div { min-width: 0; flex: 1; }
.sdv-mindmap-preview strong, .sdv-mindmap-preview small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sdv-mindmap-preview small { margin-top: 2px; color: var(--sidebar-fg-muted, #888); font-size: 10px; }
.sdv-mindmap-preview p { margin: 4px 0 0; color: var(--sidebar-fg-muted, #666); font-size: 11px; line-height: 1.35; max-height: 3em; overflow: hidden; }
`

/** 注入插件样式（幂等）。 */
export function injectPluginStyle(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById('dsh-sdv-plugin-style') !== null) return
  const style = document.createElement('style')
  style.id = 'dsh-sdv-plugin-style'
  style.textContent = PLUGIN_STYLE
  document.head.appendChild(style)
}
