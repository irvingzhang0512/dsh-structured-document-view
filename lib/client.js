window.__ModuleLoader__.load({
	id: "dsh-structured-document-view",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/shared/view-state.ts
		/** 三种视图（V0.1）。 */
		const VIEW_NAMES = [
			"markdown",
			"mindmap",
			"table"
		];
		const READER_MODES = ["section", "document"];
		/** 视图中文名（用于展示与 Skill 文档）。 */
		const VIEW_LABELS = {
			markdown: "Markdown 视图",
			mindmap: "思维导图视图",
			table: "表格视图"
		};
		/**
		* 思维导图布局。取值与 mind-elixir 的 direction 对齐：
		* - 'mind'    思维导图（根节点左右两侧展开；direction=2）
		* - 'logical' 逻辑图（右侧单侧展开；direction=1）
		* - 'down'    上下（自上而下展开；direction=3）
		*
		* 备注：需求文档提到过的"鱼骨图"在 mind-elixir v5 中无对应布局，
		* 因此 V0.1 提供 mind / logical / down 三种布局（见 docs/architecture.md
		* 的设计决策 D4）。
		*/
		const MIND_MAP_LAYOUTS = [
			"mind",
			"logical",
			"down"
		];
		/** 布局中文名。 */
		const LAYOUT_LABELS = {
			mind: "思维导图",
			logical: "逻辑图",
			down: "上下"
		};
		/** 布局 → mind-elixir direction 常量。 */
		const LAYOUT_DIRECTIONS = {
			mind: 2,
			logical: 1,
			down: 3
		};
		/**
		* 生成一份全新的**内置默认**状态（避免共享同一对象导致意外突变）。
		*
		* 这是内置默认的唯一字面量来源：侧边卡片设置的内置默认值
		* （`view-settings.ts` 的 `BUILTIN_VIEW_DEFAULTS`）从本函数的返回值推导，
		* 不再另写一份字面量。SPEC F011 要求的「统一或删除」在这里落地：原
		* `DEFAULT_VIEW_STATE` 常量与本函数重复且零引用，已删除。
		*
		* 注意：侧边卡片配置只影响**新会话／新运行时**的初始状态与 `reset_view`，
		* 本函数始终返回内置默认（`markdown` / `logical` / 导图 2 层）。
		*/
		function createDefaultViewState() {
			return {
				currentView: "markdown",
				selectedNodeId: null,
				focusedNodeId: null,
				expandedNodeIds: [],
				collapsedNodeIds: [],
				depth: null,
				viewDepths: {
					markdown: null,
					mindmap: 2,
					table: null
				},
				readerMode: "section",
				outlineCollapsedNodeIds: [],
				zoom: 1,
				pan: {
					x: 0,
					y: 0
				},
				layout: "logical",
				filter: null
			};
		}
		function without(list, value) {
			return list.filter((item) => item !== value);
		}
		function withUnique(list, value) {
			return list.includes(value) ? [...list] : [...list, value];
		}
		/** 切换视图。 */
		function setView(state, view) {
			if (state.currentView === view) return state;
			return {
				...state,
				currentView: view,
				depth: state.viewDepths[view]
			};
		}
		/** 设置选中节点（当前节点）。 */
		function setSelectedNode(state, nodeId) {
			if (state.selectedNodeId === nodeId) return state;
			return {
				...state,
				selectedNodeId: nodeId
			};
		}
		/**
		* 聚焦节点：同时设置聚焦节点与选中节点（聚焦隐含"把节点带到眼前并同步
		* 当前节点"）。nodeId 为 null 时仅清除聚焦。
		*/
		function setFocusedNode(state, nodeId) {
			const next = {
				...state,
				focusedNodeId: nodeId
			};
			if (nodeId !== null && nodeId !== state.selectedNodeId) next.selectedNodeId = nodeId;
			return next;
		}
		/** 展开节点（从收起列表移除，加入显式展开列表）。 */
		function expandNode(state, nodeId) {
			const collapsedNodeIds = without(state.collapsedNodeIds, nodeId);
			const expandedNodeIds = withUnique(state.expandedNodeIds, nodeId);
			if (collapsedNodeIds.length === state.collapsedNodeIds.length && expandedNodeIds.length === state.expandedNodeIds.length) return state;
			return {
				...state,
				collapsedNodeIds,
				expandedNodeIds
			};
		}
		/** 收起节点（加入收起列表，从显式展开列表移除）。 */
		function collapseNode(state, nodeId) {
			const expandedNodeIds = without(state.expandedNodeIds, nodeId);
			const collapsedNodeIds = withUnique(state.collapsedNodeIds, nodeId);
			if (expandedNodeIds.length === state.expandedNodeIds.length && collapsedNodeIds.length === state.collapsedNodeIds.length) return state;
			return {
				...state,
				expandedNodeIds,
				collapsedNodeIds
			};
		}
		/** 设置显示层级；depth 为 null 表示不限。 */
		function setDepth(state, depth) {
			if (state.depth === depth && state.viewDepths[state.currentView] === depth) return state;
			return {
				...state,
				depth,
				viewDepths: {
					...state.viewDepths,
					[state.currentView]: depth
				}
			};
		}
		function setReaderMode(state, readerMode) {
			return state.readerMode === readerMode ? state : {
				...state,
				readerMode
			};
		}
		function toggleOutlineNode(state, nodeId) {
			const collapsed = state.outlineCollapsedNodeIds.includes(nodeId);
			return {
				...state,
				outlineCollapsedNodeIds: collapsed ? without(state.outlineCollapsedNodeIds, nodeId) : withUnique(state.outlineCollapsedNodeIds, nodeId)
			};
		}
		/** 设置思维导图布局。 */
		function setLayout(state, layout) {
			if (state.layout === layout) return state;
			return {
				...state,
				layout
			};
		}
		/** 设置筛选条件；null 表示清除筛选。 */
		function setFilter(state, filter) {
			return {
				...state,
				filter
			};
		}
		/**
		* 恢复默认视图：重置视图类型、展开/收起、层级、缩放、平移、布局、筛选、
		* 聚焦；保留当前选中节点（"恢复默认视图"不应丢失当前节点）。
		*
		* @param initial 采用哪一份初始状态；缺省为内置默认。配置了侧边卡片默认值时，
		* 运行时传入 `view-settings.ts` 的 `initialViewState(defaults)`（SPEC F011／A9）。
		*/
		function resetView(state, initial = createDefaultViewState()) {
			return {
				...initial,
				selectedNodeId: state.selectedNodeId
			};
		}
		/**
		* 判断一个节点是否因层级限制而被隐藏。
		*
		* 语义：depth 为 null（不限）时不限制；否则层级 level（根 = 1）大于 depth
		* 的节点隐藏，除非该节点处于"显式展开"链上（underExplicitExpand 为 true）。
		* 显式展开（expanded_node_ids 中的节点或其祖先）会突破层级限制——
		* 这是"只显示两层，但我要展开第二个议题"这类组合指令能生效的关键。
		*/
		function isDepthLimited(level, depth, underExplicitExpand) {
			if (depth === null) return false;
			if (level <= depth) return false;
			return !underExplicitExpand;
		}
		/**
		* 判断一个节点是否处于收起状态。
		* 优先级：显式收起（collapsed_node_ids） > 层级限制（可被显式展开突破）。
		*/
		function isCollapsed(nodeId, level, state, underExplicitExpand = false) {
			if (state.collapsedNodeIds.includes(nodeId)) return true;
			const explicitlyExpanded = state.expandedNodeIds.includes(nodeId);
			return isDepthLimited(level, state.depth, underExplicitExpand || explicitlyExpanded);
		}
		/**
		* 判断一个节点是否满足当前筛选条件（自身匹配；树形祖先由调用方处理）。
		*
		* 语义为 AND 组合：role（若指定）必须匹配，且 properties 的每个键值都必须
		* 匹配（全部条件同时满足才显示）。这样「只看张三的进行中任务」可用
		* { role: 'task', properties: { owner: '张三', status: '进行中' } } 表达。
		*/
		function nodeMatchesFilter(node, filter) {
			if (filter === null) return true;
			if (filter.role !== void 0 && filter.role !== "" && node.role !== filter.role) return false;
			const props = filter.properties;
			if (props !== void 0) {
				for (const [key, value] of Object.entries(props)) if (node.properties[key] !== value) return false;
			}
			return true;
		}
		//#endregion
		//#region src/shared/view-settings.ts
		/**
		* 视图默认值配置（SPEC F011）：把 better-sidebar 的侧边卡片设置解析成
		* 可用的视图默认值，并投影到新的视图状态。
		*
		* 分工：
		* - 本模块只做**纯解析与投影**，不接触 better-sidebar（读取 prefs 的职责留在
		*   客户端适配层 `src/client/sidebar-adapter.tsx`，保持「只有适配层接触
		*   better-sidebar」的既有约定）；
		* - 合法取值只有一处定义：解析用 `view-state.ts` 的 `VIEW_NAMES` /
		*   `MIND_MAP_LAYOUTS`，设置行的 `VIEW_OPTIONS` / `LAYOUT_OPTIONS` 与之逐项对应
		*   （测试断言两者同源），避免界面选项与合法取值各写一份。
		*
		* 依赖方向：本模块单向依赖 `view-state.ts`；`view-state.ts` 不反向依赖本模块
		* （`resetView` 通过接收「初始状态」参数来采用配置默认值）。
		*/
		/**
		* 内置默认值：即本变更前的硬编码行为，同时是 better-sidebar 缺失、
		* 版本过低（无 `pluginToggles`）或取值非法时的回退。
		*
		* 视图／布局／导图层级三项**从 `createDefaultViewState()` 推导**（内置默认状态的
		* 唯一字面量来源），只有 `autoOpenTab` 是本模块新增的默认（它不属于视图状态）。
		* 这样内置默认只有一处定义，不会留下第二份互相漂移的默认来源。
		*/
		const BUILTIN_VIEW_DEFAULTS = builtinViewDefaults();
		/** 从内置默认视图状态推导配置层的内置默认值。 */
		function builtinViewDefaults() {
			const state = createDefaultViewState();
			return {
				autoOpenTab: true,
				defaultView: state.currentView,
				defaultLayout: state.layout,
				defaultMindmapDepth: state.viewDepths.mindmap ?? 0
			};
		}
		/** 设置行里 `defaultView` 的选项（与 {@link VIEW_NAMES} 同源校验见测试）。 */
		const VIEW_OPTIONS = [
			{
				value: "markdown",
				title: "Markdown"
			},
			{
				value: "mindmap",
				title: "思维导图"
			},
			{
				value: "table",
				title: "表格"
			}
		];
		/** 设置行里 `defaultLayout` 的选项（与 {@link MIND_MAP_LAYOUTS} 同源校验见测试）。 */
		const LAYOUT_OPTIONS = [
			{
				value: "mind",
				title: "思维导图（两侧）"
			},
			{
				value: "logical",
				title: "逻辑图（右侧）"
			},
			{
				value: "down",
				title: "上下"
			}
		];
		/** 取值是否在给定字面量集合内。 */
		function oneOf(values, raw) {
			return typeof raw === "string" && values.includes(raw);
		}
		/**
		* 解析侧边卡片设置。逐字段独立判定：键缺失、类型不符或取值不在枚举内时
		* **只回退该字段**的内置默认，不做隐式转换、不抛错（A6／A7）。
		*/
		function parseViewDefaults(raw) {
			const source = typeof raw === "object" && raw !== null ? raw : {};
			return {
				autoOpenTab: typeof source.autoOpenTab === "boolean" ? source.autoOpenTab : BUILTIN_VIEW_DEFAULTS.autoOpenTab,
				defaultView: oneOf(VIEW_NAMES, source.defaultView) ? source.defaultView : BUILTIN_VIEW_DEFAULTS.defaultView,
				defaultLayout: oneOf(MIND_MAP_LAYOUTS, source.defaultLayout) ? source.defaultLayout : BUILTIN_VIEW_DEFAULTS.defaultLayout,
				defaultMindmapDepth: parseDepth(source.defaultMindmapDepth)
			};
		}
		/**
		* 层级取值：只接受 `>= 0` 的整数（控件声明的 `min: 0`）；越界、非整数、
		* `NaN`／`Infinity` 一律回退默认。
		*/
		function parseDepth(raw) {
			if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0) return BUILTIN_VIEW_DEFAULTS.defaultMindmapDepth;
			return raw;
		}
		/**
		* 把配置里的层级映射为视图状态内部的层级：`0` 表示不限层级，
		* 而内部用 `null` 表达「不限」（`ViewState.viewDepths` 是 `number | null`）。
		*/
		function mindmapDepthToInternal(depth) {
			return depth === 0 ? null : depth;
		}
		/**
		* 按配置默认值生成一份新的初始视图状态：在内置默认状态之上只覆盖
		* 视图、布局与思维导图层级三个字段（其余字段保持内置默认）。
		*
		* `depth` 必须与 `viewDepths[currentView]` 一致（`setView` 维护的既有不变式）：
		* 渲染层与状态镜像读的是 `state.depth`（导图适配器额外用
		* `viewDepths.mindmap`），只改 `viewDepths` 会让工具栏层级控件与
		* `get_view_state` 把「已配置的层级」报告成「不限」，与画面不一致。
		*/
		function initialViewState(defaults = BUILTIN_VIEW_DEFAULTS) {
			const base = createDefaultViewState();
			const viewDepths = {
				...base.viewDepths,
				mindmap: mindmapDepthToInternal(defaults.defaultMindmapDepth)
			};
			return {
				...base,
				currentView: defaults.defaultView,
				layout: defaults.defaultLayout,
				viewDepths,
				depth: viewDepths[defaults.defaultView]
			};
		}
		//#endregion
		//#region src/client/sidebar-adapter.tsx
		/** 本插件注册的侧边栏页标识。 */
		const VIEW_TAB_TYPE = "structured-document-view";
		/** 本插件侧边栏页的展示名。 */
		const VIEW_TAB_TITLE = "Irving · 结构化文档视图";
		/**
		* 四项设置行（键与 `pluginSettings['structured-document-view']` 逐字一致）。
		*
		* 说明：better-sidebar 的行渲染器把「键未设置」显示为关／空（switch 取
		* `value === true`，select 无选中值显示占位符，number 显示空输入），因此每行
		* 的说明里写明「未设置时按哪个默认处理」，避免用户把「未设置」误读成「关闭」。
		*/
		const SETTING_ROWS = [
			{
				key: "autoOpenTab",
				type: "switch",
				title: "自动打开视图页签",
				desc: "会话首次激活时自动打开「结构化文档」页签。未设置时按开启处理（内置默认）。"
			},
			{
				key: "defaultView",
				type: "select",
				title: "新会话默认视图",
				desc: "新建会话／新运行时的初始视图。未设置时按 Markdown 处理（内置默认）。",
				options: VIEW_OPTIONS.map((option) => ({
					value: option.value,
					title: option.title
				}))
			},
			{
				key: "defaultLayout",
				type: "select",
				title: "新会话默认导图布局",
				desc: "新建会话／新运行时思维导图的初始布局。未设置时按逻辑图（右侧）处理（内置默认）。",
				options: LAYOUT_OPTIONS.map((option) => ({
					value: option.value,
					title: option.title
				}))
			},
			{
				key: "defaultMindmapDepth",
				type: "number",
				title: "新会话导图默认层级",
				desc: "新建会话／新运行时思维导图的初始层级；0 表示不限层级。未设置时按 2 层处理（内置默认）。",
				min: 0
			}
		];
		/** 页图标（文档/树风）。 */
		function tabIcon(size) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.2",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "1.5",
						y: "2",
						width: "13",
						height: "12",
						rx: "1.5"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "5.5",
						cy: "6",
						r: "1",
						fill: "currentColor",
						stroke: "none"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8.5 5.2h3.2M8.5 7.4h3.2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "5.5",
						cy: "10",
						r: "1",
						fill: "currentColor",
						stroke: "none"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8.5 9.2h3.2M8.5 11.4h3.2" })
				]
			});
		}
		/**
		* Sidebar 适配层。仅通过它访问 better-sidebar：
		* 注册视图页（含四项侧边卡片设置声明）、订阅状态变化（活动会话跟踪）、
		* 按需打开视图页、读回本插件的侧边卡片设置。
		*/
		var SidebarAdapter = class {
			options;
			constructor(options) {
				this.options = options;
			}
			/** 注册结构化文档视图页；返回 disposer。 */
			registerTab() {
				return this.options.service.registerTab({
					id: VIEW_TAB_TYPE,
					single: true,
					title: () => VIEW_TAB_TITLE,
					icon: (size) => tabIcon(size),
					order: 90,
					component: (props) => this.options.component()(props),
					...this.supportsPluginSettings() ? { settings: { pluginToggles: SETTING_ROWS } } : {}
				});
			}
			/**
			* 宿主是否支持插件本地设置（`pluginToggles`，better-sidebar v0.12.0+）。
			* `features` 本身也是 v0.12.0+ 才有的字段，缺失即视为不支持。
			*/
			supportsPluginSettings() {
				const features = this.options.service.features;
				return Array.isArray(features) && features.includes("pluginSettings");
			}
			/**
			* 读回本插件的设置原始值（未设置／无设置能力时为 undefined）。
			* 只用公开快照：`getSnapshot().prefs.pluginSettings['structured-document-view']`。
			*/
			readPluginSettings() {
				if (!this.supportsPluginSettings()) return void 0;
				const prefs = this.options.service.getSnapshot()?.prefs;
				if (typeof prefs !== "object" || prefs === null) return void 0;
				const pluginSettings = prefs.pluginSettings;
				if (typeof pluginSettings !== "object" || pluginSettings === null) return void 0;
				return pluginSettings[VIEW_TAB_TYPE];
			}
			/**
			* 解析当前侧边卡片设置为本插件的视图默认值（SPEC F011）。
			* 键缺失、类型不符、枚举外取值一律回退内置默认，不抛错；
			* 宿主不支持该机制时四项全部为内置默认。
			*/
			readViewDefaults() {
				try {
					return parseViewDefaults(this.readPluginSettings());
				} catch {
					return parseViewDefaults(void 0);
				}
			}
			/** `autoOpenTab`（缺省 true）：会话首次激活时是否自动打开本插件页签。 */
			shouldAutoOpenTab() {
				return this.readViewDefaults().autoOpenTab;
			}
			/** 订阅侧边栏状态（活动会话变化）；返回退订函数。 */
			subscribeState(listener) {
				return this.options.service.subscribeState(listener);
			}
			/** 读取当前快照（sessionId 等）。 */
			getSnapshot() {
				return this.options.service.getSnapshot();
			}
			/** 打开（激活）本插件视图页。 */
			openViewTab() {
				this.options.service.openTab({
					type: VIEW_TAB_TYPE,
					id: VIEW_TAB_TYPE,
					title: VIEW_TAB_TITLE
				});
			}
		};
		//#endregion
		//#region src/document/mock-provider.ts
		/** 内置三类示例数据。 */
		const BUILTIN_MOCK_DOCUMENTS = [
			{
				id: "meeting",
				label: "会议纪要",
				document: {
					id: "meeting-2026-09-08",
					title: "2026-09-08 产品周会",
					profile: "meeting",
					revision: 1,
					root: {
						"id": "node_001",
						"title": "2026-09-08 产品周会",
						"content": "本周产品例会，同步智能锅具、商城改版与客服体验三个议题。",
						"role": "topic",
						"properties": {},
						"children": [
							{
								"id": "node_002",
								"title": "议题1：智能锅具进度同步",
								"content": "",
								"role": "topic",
								"properties": {},
								"children": [
									{
										"id": "node_003",
										"title": "热红外模块已完成实验室验证",
										"content": "实验室环境下识别率 96%，误报率 2%。",
										"role": "discussion",
										"properties": {},
										"children": []
									},
									{
										"id": "node_004",
										"title": "高温环境下检测率下降",
										"content": "锅体高温时热红外读数漂移，检测率下降到 88%。",
										"role": "problem",
										"properties": {},
										"children": []
									},
									{
										"id": "node_005",
										"title": "增加散热测试用例",
										"content": "补充高温场景测试矩阵，纳入回归。",
										"role": "conclusion",
										"properties": {},
										"children": []
									}
								]
							},
							{
								"id": "node_006",
								"title": "议题2：商城改版方案",
								"content": "",
								"role": "topic",
								"properties": {},
								"children": [{
									"id": "node_007",
									"title": "首页改版上线时间讨论",
									"content": "设计稿已评审通过，开发需要三周。",
									"role": "discussion",
									"properties": {},
									"children": []
								}, {
									"id": "node_008",
									"title": "10月1日前上线",
									"content": "改版随国庆活动一起发布。",
									"role": "decision",
									"properties": {},
									"children": []
								}]
							},
							{
								"id": "node_009",
								"title": "议题3：客服体验问题",
								"content": "",
								"role": "topic",
								"properties": {},
								"children": [{
									"id": "node_010",
									"title": "工单响应慢",
									"content": "高峰时段人工响应超过 2 小时。",
									"role": "problem",
									"properties": {},
									"children": []
								}, {
									"id": "node_011",
									"title": "增加自动回复",
									"content": "常见问题先接入自动回复，复杂工单转人工。",
									"role": "decision",
									"properties": {},
									"children": []
								}]
							},
							{
								"id": "node_012",
								"title": "待办",
								"content": "会议派生的行动项。",
								"role": "note",
								"properties": {},
								"children": [
									{
										"id": "node_013",
										"title": "更新散热测试用例",
										"content": "覆盖高温与低温场景。",
										"role": "action_item",
										"properties": {
											"owner": "张三",
											"status": "进行中",
											"due_date": "本周五"
										},
										"children": []
									},
									{
										"id": "node_014",
										"title": "准备商城改版验收",
										"content": "制定验收清单并安排预演。",
										"role": "action_item",
										"properties": {
											"owner": "李四",
											"status": "未开始",
											"due_date": "9月20日"
										},
										"children": []
									},
									{
										"id": "node_015",
										"title": "客服自动回复方案评审",
										"content": "输出方案文档并组织评审。",
										"role": "action_item",
										"properties": {
											"owner": "王五",
											"status": "进行中",
											"due_date": "下周一"
										},
										"children": []
									}
								]
							}
						]
					}
				}
			},
			{
				id: "project",
				label: "项目管理",
				document: {
					id: "project-smart-kitchen-v2",
					title: "智能厨房 App V2.0 项目",
					profile: "project",
					revision: 1,
					root: {
						"id": "node_001",
						"title": "智能厨房 App V2.0 项目",
						"content": "V2.0 目标是完成智能识别与商城改版两大能力上线。",
						"role": "note",
						"properties": {},
						"children": [
							{
								"id": "node_002",
								"title": "目标：完成 V2.0 上线",
								"content": "本季度唯一北极星目标。",
								"role": "objective",
								"properties": {},
								"children": [
									{
										"id": "node_003",
										"title": "关键结果：日活 5 万",
										"content": "",
										"role": "key_result",
										"properties": {},
										"children": []
									},
									{
										"id": "node_004",
										"title": "关键结果：崩溃率低于 0.1%",
										"content": "",
										"role": "key_result",
										"properties": {},
										"children": []
									},
									{
										"id": "node_005",
										"title": "关键结果：订单转化率提升 20%",
										"content": "",
										"role": "key_result",
										"properties": {},
										"children": []
									}
								]
							},
							{
								"id": "node_006",
								"title": "阶段：开发冲刺",
								"content": "当前迭代，重点交付识别与改版。",
								"role": "milestone",
								"properties": {},
								"children": [
									{
										"id": "node_007",
										"title": "热红外验证",
										"content": "高温场景识别率提升到 92% 以上。",
										"role": "task",
										"properties": {
											"owner": "张三",
											"status": "进行中",
											"due_date": "本周",
											"progress": 50
										},
										"children": []
									},
									{
										"id": "node_008",
										"title": "人员检测",
										"content": "多光源场景稳定性验证。",
										"role": "task",
										"properties": {
											"owner": "李四",
											"status": "未开始",
											"due_date": "下周",
											"progress": 0
										},
										"children": []
									},
									{
										"id": "node_009",
										"title": "商城改版",
										"content": "首页与活动页改版开发。",
										"role": "task",
										"properties": {
											"owner": "王五",
											"status": "进行中",
											"due_date": "9月25日",
											"progress": 80
										},
										"children": []
									},
									{
										"id": "node_010",
										"title": "推送通道迁移",
										"content": "迁移到新推送服务。",
										"role": "task",
										"properties": {
											"owner": "赵六",
											"status": "已完成",
											"due_date": "上周",
											"progress": 100
										},
										"children": []
									}
								]
							},
							{
								"id": "node_011",
								"title": "阶段：灰度发布",
								"content": "上线前的灰度与回滚预案。",
								"role": "milestone",
								"properties": {},
								"children": [{
									"id": "node_012",
									"title": "小流量灰度",
									"content": "先灰度 5% 用户，观察指标后放量。",
									"role": "task",
									"properties": {
										"owner": "张三",
										"status": "未开始",
										"due_date": "10月1日",
										"progress": 0
									},
									"children": []
								}]
							},
							{
								"id": "node_013",
								"title": "问题",
								"content": "当前执行中的问题。",
								"role": "note",
								"properties": {},
								"children": [{
									"id": "node_014",
									"title": "灰度环境资源不足",
									"content": "灰度集群需要扩容 2 台机器。",
									"role": "issue",
									"properties": {},
									"children": []
								}, {
									"id": "node_015",
									"title": "推送通道兼容性",
									"content": "旧版本客户端不兼容新推送协议。",
									"role": "issue",
									"properties": {},
									"children": []
								}]
							},
							{
								"id": "node_016",
								"title": "风险",
								"content": "需要持续关注的风险项。",
								"role": "note",
								"properties": {},
								"children": [{
									"id": "node_017",
									"title": "开发板性能瓶颈",
									"content": "端侧算力有限，双模型同时推理可能超帧率预算。",
									"role": "risk",
									"properties": {},
									"children": []
								}, {
									"id": "node_018",
									"title": "第三方 SDK 涨价",
									"content": "语音 SDK 明年可能涨价，需评估自研。",
									"role": "risk",
									"properties": {},
									"children": []
								}]
							}
						]
					}
				}
			},
			{
				id: "thinking",
				label: "思路整理",
				document: {
					id: "thinking-2026-09",
					title: "第二技术路线",
					profile: "thinking",
					revision: 1,
					root: {
						"id": "node_001",
						"title": "第二技术路线",
						"content": "面向智能厨房场景的第二条技术路线整体思路整理。",
						"role": "topic",
						"properties": {},
						"children": [
							{
								"id": "node_002",
								"title": "9月验证",
								"content": "9 月需要完成的关键验证项。",
								"role": "topic",
								"properties": {},
								"children": [
									{
										"id": "node_003",
										"title": "热红外验证",
										"content": "利用热红外相机验证高温环境下的目标识别能力，重点看检测率与误报率。",
										"role": "idea",
										"properties": {},
										"children": []
									},
									{
										"id": "node_004",
										"title": "人员检测",
										"content": "在厨房多光源场景下验证人员检测的稳定性。",
										"role": "idea",
										"properties": {},
										"children": []
									},
									{
										"id": "node_005",
										"title": "天气影响",
										"content": "阴雨天光照不足是否会影响热红外与可见光融合效果？",
										"role": "problem",
										"properties": {},
										"children": []
									}
								]
							},
							{
								"id": "node_006",
								"title": "算法方案",
								"content": "候选算法方案的对比与选型。",
								"role": "solution",
								"properties": {},
								"children": [
									{
										"id": "node_007",
										"title": "方案A：YOLOv8 蒸馏",
										"content": "精度高但模型较大，需要做蒸馏与量化。",
										"role": "idea",
										"properties": {},
										"children": []
									},
									{
										"id": "node_008",
										"title": "方案B：轻量化模型",
										"content": "MobileNet 系主干，推理快，精度略低。",
										"role": "idea",
										"properties": {},
										"children": []
									},
									{
										"id": "node_009",
										"title": "是否需要增加锅具分类",
										"content": "产品侧希望识别锅具类型以调整菜谱，需要评估成本。",
										"role": "question",
										"properties": {},
										"children": []
									}
								]
							},
							{
								"id": "node_010",
								"title": "项目风险",
								"content": "当前路线的主要风险。",
								"role": "problem",
								"properties": {},
								"children": [{
									"id": "node_011",
									"title": "开发板性能风险",
									"content": "当前开发板算力有限，双路模型同时跑可能超帧率预算。",
									"role": "problem",
									"properties": {},
									"children": []
								}, {
									"id": "node_012",
									"title": "数据集不足风险",
									"content": "厨房场景数据集规模偏小，需要补充采集。",
									"role": "problem",
									"properties": {},
									"children": []
								}]
							},
							{
								"id": "node_013",
								"title": "结论",
								"content": "当前阶段的主要结论。",
								"role": "conclusion",
								"properties": {},
								"children": [{
									"id": "node_014",
									"title": "9月先验证热红外与人员检测",
									"content": "把 9 月验证范围收窄到热红外与人员检测两个方向，结论后再定算法方案。",
									"role": "conclusion",
									"properties": {},
									"children": []
								}]
							}
						]
					}
				}
			}
		];
		/** 默认当前文档（思路整理）。 */
		const DEFAULT_MOCK_DOCUMENT_ID = "thinking";
		/** 同步校验一个节点的存在性（不存在抛错）。 */
		function requireNode(root, nodeId) {
			const stack = [root];
			while (stack.length > 0) {
				const node = stack.pop();
				if (node.id === nodeId) return node;
				stack.push(...node.children);
			}
			throw new Error(`MockDocumentProvider: 节点不存在: ${nodeId}`);
		}
		/**
		* 模拟文档提供器（Mock Document Provider）。
		* 实现 {@link DocumentProvider} 接口的五项能力 + Mock 专属的切换/变更能力。
		*/
		var MockDocumentProvider = class {
			id = "mock";
			displayName = "模拟文档提供器（Mock）";
			docs;
			activeId;
			selectedNodeId = null;
			docListeners = /* @__PURE__ */ new Set();
			selListeners = /* @__PURE__ */ new Set();
			disposed = false;
			constructor(options = {}) {
				this.docs = new Map(BUILTIN_MOCK_DOCUMENTS.map((doc) => [doc.id, {
					id: doc.id,
					label: doc.label,
					document: structuredClone(doc.document)
				}]));
				const initial = options.activeDocumentId ?? "thinking";
				this.activeId = this.docs.has(initial) ? initial : DEFAULT_MOCK_DOCUMENT_ID;
			}
			/** 当前文档（深拷贝，调用方修改不影响内部）。 */
			getDocument() {
				const descriptor = this.docs.get(this.activeId);
				if (descriptor === void 0) return null;
				return structuredClone(descriptor.document);
			}
			getSelectedNode() {
				if (this.selectedNodeId === null) return null;
				const doc = this.getDocument();
				if (doc === null) return null;
				try {
					return structuredClone(requireNode(doc.root, this.selectedNodeId));
				} catch {
					return null;
				}
			}
			selectNode(nodeId) {
				if (this.disposed) return;
				if (nodeId !== null) {
					const doc = this.getDocument();
					if (doc !== null) requireNode(doc.root, nodeId);
				}
				if (this.selectedNodeId === nodeId) return;
				this.selectedNodeId = nodeId;
				this.emitSelectedNodeChanged();
			}
			subscribeDocumentChanged(listener) {
				this.docListeners.add(listener);
				return () => this.docListeners.delete(listener);
			}
			subscribeSelectedNodeChanged(listener) {
				this.selListeners.add(listener);
				return () => this.selListeners.delete(listener);
			}
			dispose() {
				this.disposed = true;
				this.docListeners.clear();
				this.selListeners.clear();
			}
			/** 列出可用的内置文档。 */
			listDocuments() {
				return BUILTIN_MOCK_DOCUMENTS;
			}
			/** 当前激活文档 id。 */
			getActiveDocumentId() {
				return this.activeId;
			}
			/** 当前激活文档的展示名。 */
			getActiveDocumentLabel() {
				return this.docs.get(this.activeId)?.label ?? this.activeId;
			}
			/**
			* 切换当前文档，并清理选中状态（旧文档的节点在新文档中无意义）。
			* 触发 document-changed。
			*/
			setActiveDocument(documentId) {
				if (this.disposed) return;
				if (!this.docs.has(documentId)) throw new Error(`MockDocumentProvider: 未知文档 "${documentId}"（可用：${[...this.docs.keys()].join("、")}）`);
				if (this.activeId === documentId) return;
				this.activeId = documentId;
				this.selectedNodeId = null;
				this.emitDocumentChanged();
				this.emitSelectedNodeChanged();
			}
			/**
			* 模拟一次外部文档变更（例如未来 dsh-structured-document 保存文档后
			* 发出 document-changed）。mutator 接收当前文档深拷贝并返回新文档，
			* 返回值为空则无变化。
			*/
			mockMutate(mutator) {
				if (this.disposed) return;
				const descriptor = this.docs.get(this.activeId);
				if (descriptor === void 0) return;
				const current = structuredClone(descriptor.document);
				const next = mutator(current) ?? current;
				descriptor.document = next;
				if (this.selectedNodeId !== null) try {
					requireNode(next.root, this.selectedNodeId);
				} catch {
					this.selectedNodeId = null;
					this.emitSelectedNodeChanged();
				}
				this.emitDocumentChanged();
			}
			emitDocumentChanged() {
				for (const listener of [...this.docListeners]) try {
					listener();
				} catch {}
			}
			emitSelectedNodeChanged() {
				for (const listener of [...this.selListeners]) try {
					listener();
				} catch {}
			}
		};
		//#endregion
		//#region src/document/empty-provider.ts
		/** 空数据源（无文档、无选中、无事件）。 */
		var EmptyDocumentProvider = class {
			id = "empty";
			displayName = "未连接";
			getDocument() {
				return null;
			}
			getSelectedNode() {
				return null;
			}
			selectNode(_nodeId) {}
			subscribeDocumentChanged(_listener) {
				return () => void 0;
			}
			subscribeSelectedNodeChanged(_listener) {
				return () => void 0;
			}
			dispose() {}
		};
		//#endregion
		//#region src/document/node-ref.ts
		/** 当前节点别名。 */
		const CURRENT_ALIASES = /* @__PURE__ */ new Set([
			"current",
			"@selected",
			"@current",
			"@focused"
		]);
		/** 遍历文档全部节点（含根）。 */
		function walkDocument(root, visit) {
			visit(root);
			for (const child of root.children) walkDocument(child, visit);
		}
		/** 按 ID 查找节点。 */
		function findNodeById(root, id) {
			let found;
			walkDocument(root, (node) => {
				if (found === void 0 && node.id === id) found = node;
			});
			return found;
		}
		/** 按标题包含匹配查找节点（保留遍历顺序）。 */
		function findNodesByTitle(root, title, limit = 20) {
			const results = [];
			const needle = title.trim().toLowerCase();
			walkDocument(root, (node) => {
				if (results.length >= limit) return;
				if (node.title.toLowerCase().includes(needle)) results.push(node);
			});
			return results;
		}
		/** 节点在文档中的深度（根 = 0）。 */
		function nodeDepth(root, nodeId) {
			let depth = null;
			const visit = (node, level) => {
				if (depth !== null) return;
				if (node.id === nodeId) {
					depth = level;
					return;
				}
				for (const child of node.children) visit(child, level + 1);
			};
			visit(root, 0);
			return depth;
		}
		/** 解析一个用户提供的节点引用（默认引用 current）。 */
		function resolveNodeRef(document, selectedNodeId, rawRef) {
			const root = document.root;
			const ref = rawRef === void 0 || rawRef.trim() === "" ? "current" : rawRef.trim();
			if (CURRENT_ALIASES.has(ref.toLowerCase())) {
				if (selectedNodeId === null) return {
					ok: false,
					code: "NO_SELECTED_NODE",
					message: "当前没有选中节点，请先选择或指定一个节点。"
				};
				const node = findNodeById(root, selectedNodeId);
				if (node === void 0) return {
					ok: false,
					code: "NODE_NOT_FOUND",
					message: `选中的节点已不存在（${selectedNodeId}）。`
				};
				return {
					ok: true,
					node
				};
			}
			const byId = findNodeById(root, ref);
			if (byId !== void 0) return {
				ok: true,
				node: byId
			};
			const byExact = findNodesByTitle(root, ref).filter((node) => node.title === ref);
			if (byExact.length === 1) return {
				ok: true,
				node: byExact[0]
			};
			const matches = findNodesByTitle(root, ref);
			if (matches.length === 0) return {
				ok: false,
				code: "NODE_NOT_FOUND",
				message: `没有找到标题包含「${ref}」的节点。`
			};
			if (matches.length === 1) return {
				ok: true,
				node: matches[0]
			};
			return {
				ok: false,
				code: "MULTIPLE_NODES_FOUND",
				message: `有 ${matches.length} 个节点标题包含「${ref}」，请用更具体的标题或 Node ID 指定。`,
				candidates: matches
			};
		}
		//#endregion
		//#region src/document/document-bridge.ts
		/** 文档桥接层。 */
		var DocumentBridge = class {
			provider;
			document;
			selectedNodeId = null;
			listeners = /* @__PURE__ */ new Set();
			unsubscribers = [];
			disposed = false;
			constructor(provider) {
				this.provider = provider;
				this.document = provider.getDocument();
				this.selectedNodeId = provider.getSelectedNode()?.id ?? null;
				this.unsubscribers.push(provider.subscribeDocumentChanged(() => {
					if (this.disposed) return;
					this.document = provider.getDocument();
					const selected = provider.getSelectedNode()?.id ?? null;
					if (selected !== null && this.document !== null && findNodeById(this.document.root, selected) === void 0) this.selectedNodeId = null;
					else this.selectedNodeId = selected;
					this.emit();
				}), provider.subscribeSelectedNodeChanged(() => {
					if (this.disposed) return;
					this.selectedNodeId = provider.getSelectedNode()?.id ?? null;
					this.emit();
				}));
			}
			/** 当前文档（只读视图，调用方不得修改）。 */
			getDocument() {
				return this.document;
			}
			/** 当前文档提供器信息。 */
			getProvider() {
				return this.provider;
			}
			/** 当前选中节点 id；未选择时 null。 */
			getSelectedNodeId() {
				return this.selectedNodeId;
			}
			/** 当前选中节点；未选择时 null。 */
			getSelectedNode() {
				if (this.document === null || this.selectedNodeId === null) return null;
				return findNodeById(this.document.root, this.selectedNodeId) ?? null;
			}
			/** 按 ID 查找节点。 */
			findNodeById(nodeId) {
				if (this.document === null) return void 0;
				return findNodeById(this.document.root, nodeId);
			}
			/** 节点深度（根 = 0）；不存在返回 null。 */
			nodeDepthOf(nodeId) {
				if (this.document === null) return null;
				return nodeDepth(this.document.root, nodeId);
			}
			/**
			* 解析一个用户提供的节点引用（id / current / 标题）。返回解析结果，
			* 失败时携带明确错误码（NODE_NOT_FOUND / MULTIPLE_NODES_FOUND /
			* NO_SELECTED_NODE）。
			*/
			resolveNode(rawRef) {
				if (this.document === null) return {
					ok: false,
					code: "NODE_NOT_FOUND",
					message: "当前没有可用文档。"
				};
				return resolveNodeRef(this.document, this.selectedNodeId, rawRef);
			}
			/**
			* 选择节点：校验存在性后转发给 Provider（数据侧维护选中状态），
			* 选中变化会经 subscribeSelectedNodeChanged 回流到 Bridge。
			* @returns 成功或带错误码的失败结果。
			*/
			selectNode(nodeId) {
				if (nodeId === null) {
					this.provider.selectNode(null);
					return { ok: true };
				}
				if (this.document === null) return {
					ok: false,
					code: "DOCUMENT_UNAVAILABLE",
					message: "当前没有可用文档。"
				};
				if (findNodeById(this.document.root, nodeId) === void 0) return {
					ok: false,
					code: "NODE_NOT_FOUND",
					message: `节点不存在: ${nodeId}`
				};
				this.provider.selectNode(nodeId);
				return { ok: true };
			}
			/** 订阅任意变化（文档变化或选中变化）；返回退订函数。 */
			subscribe(listener) {
				this.listeners.add(listener);
				return () => this.listeners.delete(listener);
			}
			/** 释放桥接层（退订 Provider 事件）。 */
			dispose() {
				if (this.disposed) return;
				this.disposed = true;
				for (const unsubscribe of this.unsubscribers) try {
					unsubscribe();
				} catch {}
				this.listeners.clear();
			}
			emit() {
				for (const listener of [...this.listeners]) try {
					listener();
				} catch {}
			}
		};
		//#endregion
		//#region src/client/document/host-backed-provider.ts
		/** 宿主文档数据源。 */
		var HostBackedDocumentProvider = class {
			id = "structured-document";
			displayName = "结构化文档";
			document = null;
			selectedNodeId = null;
			currentFileValue = null;
			receivedPush = false;
			/** 最近一次应用的 (revision, selectedNodeId, currentFile)；用于去重。 */
			lastApplied = null;
			docListeners = /* @__PURE__ */ new Set();
			selListeners = /* @__PURE__ */ new Set();
			sendSelectNode;
			constructor(options) {
				this.sendSelectNode = options.sendSelectNode;
			}
			/** 是否已收到宿主文档推送（宿主集成已激活）。 */
			get active() {
				return this.receivedPush;
			}
			/** 当前文件路径（宿主绑定）；未绑定 null。 */
			get currentFile() {
				return this.currentFileValue;
			}
			/** 应用宿主文档快照推送（相同 revision/选中/当前文件去重）。 */
			applyDocument(push) {
				const key = {
					revision: push.document?.revision ?? 0,
					selectedNodeId: push.selectedNodeId,
					currentFile: push.currentFile
				};
				if (this.lastApplied !== null && this.lastApplied.revision === key.revision && this.lastApplied.selectedNodeId === key.selectedNodeId && this.lastApplied.currentFile === key.currentFile) return;
				this.receivedPush = true;
				this.lastApplied = key;
				this.document = push.document === null ? null : structuredClone(push.document);
				this.selectedNodeId = push.selectedNodeId;
				this.currentFileValue = push.currentFile;
				this.emitDocumentChanged();
			}
			/** 应用宿主选中变化推送。 */
			applySelection(nodeId) {
				this.selectedNodeId = nodeId;
				this.emitSelectedNodeChanged();
			}
			/** 当前文档（深拷贝，调用方修改不影响镜像；与 Mock 数据源对齐）。 */
			getDocument() {
				return this.document === null ? null : structuredClone(this.document);
			}
			getSelectedNode() {
				if (this.document === null || this.selectedNodeId === null) return null;
				const node = findNodeById(this.document.root, this.selectedNodeId);
				return node === void 0 ? null : structuredClone(node);
			}
			selectNode(nodeId) {
				this.selectedNodeId = nodeId;
				this.sendSelectNode(nodeId);
				this.emitSelectedNodeChanged();
			}
			subscribeDocumentChanged(listener) {
				this.docListeners.add(listener);
				return () => this.docListeners.delete(listener);
			}
			subscribeSelectedNodeChanged(listener) {
				this.selListeners.add(listener);
				return () => this.selListeners.delete(listener);
			}
			dispose() {
				this.docListeners.clear();
				this.selListeners.clear();
			}
			emitDocumentChanged() {
				for (const listener of [...this.docListeners]) try {
					listener();
				} catch {}
			}
			emitSelectedNodeChanged() {
				for (const listener of [...this.selListeners]) try {
					listener();
				} catch {}
			}
		};
		function mapOutlineNode(node, depth, budget) {
			if (depth > 8 || budget.count >= 200) {
				budget.truncated = true;
				return null;
			}
			budget.count += 1;
			return {
				id: node.id,
				title: node.title.trim() !== "" ? node.title : "（未命名）",
				role: node.role,
				children: node.children.map((child) => mapOutlineNode(child, depth + 1, budget)).filter((child) => child !== null)
			};
		}
		/** 计算大纲。 */
		function toOutline(document) {
			const budget = {
				count: 0,
				truncated: false
			};
			const root = mapOutlineNode(document.root, 1, budget);
			return {
				outline: root === null ? [] : [root],
				truncated: budget.truncated
			};
		}
		//#endregion
		//#region src/client/view-state-store.ts
		/** View State 存储。 */
		var ViewStateStore = class {
			readDefaults;
			state;
			listeners = /* @__PURE__ */ new Set();
			/**
			* @param readDefaults 读取当前侧边卡片配置默认值；缺省为内置默认。
			*   传入函数而非快照，是为了让 `reset()` 取「此刻的配置」（A9）。
			*/
			constructor(readDefaults = () => BUILTIN_VIEW_DEFAULTS) {
				this.readDefaults = readDefaults;
				this.state = initialViewState(readDefaults());
			}
			/** 当前状态（只读）。 */
			getState() {
				return this.state;
			}
			/**
			* 应用一次纯 reducer 更新；状态未变化则不通知。
			* @returns 是否发生了变更。
			*/
			update(updater) {
				const next = updater(this.state);
				if (next === this.state) return false;
				this.state = next;
				this.emit();
				return true;
			}
			/** 订阅变更；返回退订函数。 */
			subscribe(listener) {
				this.listeners.add(listener);
				return () => this.listeners.delete(listener);
			}
			/**
			* 重置为初始状态（不含选中节点）：按**此刻**的配置默认值重建。
			* 需要保留当前选中节点的路径（`reset_view`）走运行时里的
			* `resetView(state, initialViewState(...))`，见 SPEC F002／F011 A9。
			*/
			reset() {
				this.state = initialViewState(this.readDefaults());
				this.emit();
			}
			emit() {
				for (const listener of [...this.listeners]) try {
					listener();
				} catch {}
			}
		};
		//#endregion
		//#region src/client/runtime.ts
		/**
		* ViewRuntime（视图会话运行时）：一个会话的"文档 + 视图状态"聚合体。
		*
		* 组装 MockDocumentProvider → DocumentBridge → ViewStateStore，并承担：
		* - 执行来自宿主 Tool 的 ViewCommand（只改 View State，不改文档 IR）；
		* - 回应用户在视图中的交互（点击节点 → select_node 同步给文档侧；
		*   展开/收起 → 更新视图状态）；
		* - 把"视图状态 + 文档大纲 + 选中节点"推送到宿主镜像。
		*
		* 未来替换数据源：仅换 Provider 实现，本运行时其余逻辑不变。
		*/
		/** 状态推送去抖间隔（ms），避免缩放/平移高频事件刷爆桥。 */
		const PUSH_DEBOUNCE_MS = 80;
		/**
		* 依赖文档数据的命令：数据源未就绪（`connecting`）时不得执行，
		* 否则会对着一份并不存在的文档"假装成功"（SPEC F010 / A4）。
		*/
		const SOURCE_DEPENDENT_COMMANDS = /* @__PURE__ */ new Set([
			"expand_node",
			"collapse_node",
			"focus_node",
			"open_node",
			"navigate_section"
		]);
		/** 数据源未就绪时的统一失败结果。 */
		function sourceNotReady() {
			return {
				ok: false,
				code: "SOURCE_NOT_READY",
				message: "视图桥尚未应答，数据源未就绪：界面显示「正在连接视图桥…」，请稍候重试。"
			};
		}
		/** 视图会话运行时。 */
		var ViewRuntime = class {
			mockProvider;
			hostProvider;
			/** `connecting` 阶段的占位数据源（文档恒为 null）。 */
			emptyProvider;
			bridge;
			store;
			sessionId;
			pushTarget;
			sendBridgeMessage;
			/** 打开「结构化文档」侧边栏页签的回调（由客户端 apply 注入）。 */
			openTab;
			/**
			* 读取当前侧边卡片配置默认值（SPEC F011）。构造时读一次作为本运行时的初始
			* 视图状态（A5：已存在会话不因之后改配置而变化）；`reset_view` 调用时重新读取，
			* 因此重置采用"此刻的配置"（A9）。缺省为内置默认（软依赖回退）。
			*/
			readDefaults;
			/** 数据源状态（SPEC F010）；握手前 `connecting`，初始不是 Mock。 */
			source = "connecting";
			pushTimer;
			disposed = false;
			unsubscribers = [];
			runtimeListeners = /* @__PURE__ */ new Set();
			viewportController = null;
			viewportWaiters = [];
			constructor(sessionId, pushTarget, sendBridgeMessage, activeDocumentId, openTab, readDefaults = () => BUILTIN_VIEW_DEFAULTS) {
				this.sessionId = sessionId;
				this.pushTarget = pushTarget;
				this.sendBridgeMessage = sendBridgeMessage;
				this.openTab = openTab;
				this.readDefaults = readDefaults;
				this.mockProvider = new MockDocumentProvider(activeDocumentId === void 0 ? void 0 : { activeDocumentId });
				this.emptyProvider = new EmptyDocumentProvider();
				this.hostProvider = new HostBackedDocumentProvider({ sendSelectNode: (nodeId) => this.sendBridgeMessage?.({
					type: "select-node",
					nodeId
				}) });
				this.bridge = new DocumentBridge(this.emptyProvider);
				this.store = new ViewStateStore(readDefaults);
				this.attachBridge(this.bridge);
				this.unsubscribers.push(this.store.subscribe(() => {
					if (this.disposed) return;
					this.schedulePush();
				}));
			}
			/** 订阅运行时级变化（文档源切换等）；返回退订函数。 */
			subscribe(listener) {
				this.runtimeListeners.add(listener);
				return () => this.runtimeListeners.delete(listener);
			}
			/** 数据源状态（SPEC F010）。 */
			getSource() {
				return this.source;
			}
			/** 是否使用宿主文档数据源（dsh-structured-document 集成激活）。 */
			isHostMode() {
				return this.source === "host";
			}
			/** 是否处于示例数据模式（宿主明确声明无文档内核）。 */
			isMockMode() {
				return this.source === "mock";
			}
			/**
			* 宿主能力声明（hello 应答）：
			* - `structuredDocument: true` → 切宿主数据源；
			* - `false` → 宿主明确表示没有文档内核，才允许进示例数据模式；
			* - 两者都只在 `connecting` 阶段生效（状态单向，不回退、不互换）。
			*/
			applyCapabilities(capabilities) {
				if (this.disposed) return;
				if (this.source !== "connecting") return;
				this.switchSource(capabilities.structuredDocument ? "host" : "mock");
				this.emitRuntimeChange();
			}
			/** 宿主文档快照推送：切换数据源（connecting/mock → 宿主）并刷新视图。 */
			applyHostDocument(push) {
				if (this.disposed) return;
				this.hostProvider.applyDocument(push);
				if (this.source !== "host") this.switchSource("host");
				else {
					this.reconcileSelection();
					this.pushNow();
				}
				this.emitRuntimeChange();
			}
			/** 宿主选中变化推送。 */
			applyHostSelection(nodeId) {
				if (this.disposed) return;
				this.hostProvider.applySelection(nodeId);
			}
			/** 当前文件联动：把 better-sidebar 快照的当前文件同步给宿主文档服务。 */
			sendCurrentFile(path) {
				if (this.disposed) return;
				this.sendBridgeMessage?.({
					type: "current-file",
					path
				});
			}
			/** 当前文件（宿主模式）；未绑定 null。 */
			get currentFile() {
				return this.hostProvider.currentFile;
			}
			/**
			* 切换数据源：重建 bridge（指向对应 Provider）并重新对齐选中、推送镜像。
			* 只在状态机的合法迁移上调用（见 {@link applyCapabilities}）。
			*/
			switchSource(source) {
				if (this.source === source) return;
				this.source = source;
				this.bridge.dispose();
				this.bridge = new DocumentBridge(source === "host" ? this.hostProvider : this.mockProvider);
				this.attachBridge(this.bridge);
				this.reconcileSelection();
				this.pushNow();
			}
			attachBridge(bridge) {
				this.unsubscribers.push(bridge.subscribe(() => {
					if (this.disposed) return;
					this.reconcileSelection();
					this.schedulePush();
				}));
			}
			emitRuntimeChange() {
				for (const listener of [...this.runtimeListeners]) try {
					listener();
				} catch {}
			}
			/** 执行一条 ViewCommand；返回 ack 载荷。 */
			applyCommand(command) {
				if (this.disposed) return {
					ok: false,
					code: "INTERNAL_ERROR",
					message: "运行时已释放。"
				};
				if (this.source === "connecting" && SOURCE_DEPENDENT_COMMANDS.has(command.name)) return sourceNotReady();
				switch (command.name) {
					case "set_view": return this.applySetView(command.view);
					case "expand_node": return this.applyNodeToggle(command, "expand");
					case "collapse_node": return this.applyNodeToggle(command, "collapse");
					case "focus_node": return this.applyFocus(command.node);
					case "open_node": return this.applyOpenNode(command.node);
					case "set_reader_mode": return this.applyReaderMode(command.mode);
					case "navigate_section": return this.applyNavigateSection(command.direction);
					case "set_zoom":
					case "fit_view":
					case "reset_viewport": return {
						ok: false,
						code: "VIEW_NOT_READY",
						message: "思维导图画布尚未准备好。"
					};
					case "set_depth": return this.applySetDepth(command.depth);
					case "set_layout": return this.applySetLayout(command.layout);
					case "set_filter": return this.applySetFilter(command.filter);
					case "reset_view": return this.applyReset();
					case "open_tab":
						this.openTab?.();
						return {
							ok: true,
							code: "OK",
							message: "已打开「结构化文档」视图页签。"
						};
					case "sync_state":
						this.pushNow();
						return {
							ok: true,
							code: "OK",
							message: "已同步视图状态。"
						};
					default: return {
						ok: false,
						code: "UNKNOWN_COMMAND",
						message: `未知命令：${command.name ?? "?"}`
					};
				}
			}
			/** 桥和界面使用的异步入口：视口类命令等待实际画布操作完成。 */
			async applyCommandAsync(command) {
				if (this.source === "connecting" && SOURCE_DEPENDENT_COMMANDS.has(command.name)) return sourceNotReady();
				if (command.name === "focus_node") {
					const prepared = this.applyFocus(command.node);
					if (!prepared.ok) return prepared;
					const nodeId = String(prepared.value?.nodeId ?? "");
					const controller = await this.waitForViewport();
					if (controller === null || this.store.getState().currentView !== "mindmap") return {
						ok: false,
						code: "VIEW_NOT_READY",
						message: "请先打开并切换到思维导图视图。",
						value: prepared.value
					};
					const located = await controller.focusNode(nodeId, command.mode ?? "center");
					if (!located.ok && located.code === "NODE_HIDDEN") return {
						...located,
						message: this.hiddenNodeMessage(nodeId),
						value: prepared.value
					};
					return {
						...located,
						value: {
							...prepared.value,
							...located.value
						}
					};
				}
				const controller = await this.waitForViewport();
				if (command.name === "set_zoom" || command.name === "fit_view" || command.name === "reset_viewport") {
					if (controller === null || this.store.getState().currentView !== "mindmap") return {
						ok: false,
						code: "VIEW_NOT_READY",
						message: "请先打开并切换到思维导图视图。"
					};
					if (command.name === "set_zoom") return controller.setZoom(command);
					if (command.name === "fit_view") return controller.fitView();
					return controller.resetViewport();
				}
				return this.applyCommand(command);
			}
			registerViewportController(controller) {
				this.viewportController = controller;
				for (const resolve of this.viewportWaiters.splice(0)) resolve(controller);
				return () => {
					if (this.viewportController === controller) this.viewportController = null;
				};
			}
			waitForViewport(timeoutMs = 1e3) {
				if (this.viewportController !== null) return Promise.resolve(this.viewportController);
				if (this.store.getState().currentView !== "mindmap") return Promise.resolve(null);
				return new Promise((resolve) => {
					const done = (controller) => {
						clearTimeout(timer);
						const index = this.viewportWaiters.indexOf(done);
						if (index >= 0) this.viewportWaiters.splice(index, 1);
						resolve(controller);
					};
					const timer = setTimeout(() => done(null), timeoutMs);
					this.viewportWaiters.push(done);
				});
			}
			hiddenNodeMessage(nodeId) {
				const state = this.store.getState();
				const document = this.bridge.getDocument();
				const path = [];
				const find = (node) => {
					path.push(node);
					if (node.id === nodeId) return true;
					for (const child of node.children) if (find(child)) return true;
					path.pop();
					return false;
				};
				if (document !== null) find(document.root);
				const collapsed = path.slice(0, -1).find((node) => state.collapsedNodeIds.includes(node.id));
				if (collapsed !== void 0) return `目标节点被已收起的上级节点「${nodeTitle(collapsed)}」隐藏，请先展开该节点。`;
				if (state.filter !== null) return "目标节点不在当前筛选结果中，请先清除或调整筛选。";
				if (state.depth !== null) return `目标节点超出当前 ${state.depth} 层显示限制，请增加层级或展开其上级节点。`;
				return "目标节点当前未渲染，可能被收起、层级限制或筛选隐藏。";
			}
			applySetView(view) {
				this.store.update((state) => setView(state, view));
				this.pushNow();
				return {
					ok: true,
					code: "OK",
					message: `已切换为 ${view} 视图。`,
					value: { currentView: view }
				};
			}
			applyNodeToggle(command, action) {
				const resolved = this.bridge.resolveNode(command.node);
				if (!resolved.ok) return {
					ok: false,
					code: resolved.code,
					message: resolved.message
				};
				const node = resolved.node;
				if (!(node.children.length > 0)) return {
					ok: true,
					code: "OK",
					message: `节点「${nodeTitle(node)}」没有子节点，${action === "expand" ? "无需展开" : "无需收起"}。`,
					value: {
						nodeId: node.id,
						nodeTitle: nodeTitle(node)
					}
				};
				this.store.update((state) => action === "expand" ? expandNode(state, node.id) : collapseNode(state, node.id));
				this.pushNow();
				return {
					ok: true,
					code: "OK",
					message: action === "expand" ? `已展开节点「${nodeTitle(node)}」。` : `已收起节点「${nodeTitle(node)}」。`,
					value: {
						nodeId: node.id,
						nodeTitle: nodeTitle(node),
						selectedNodeTitle: this.selectedTitle()
					}
				};
			}
			applyFocus(rawRef) {
				const resolved = this.bridge.resolveNode(rawRef);
				if (!resolved.ok) return {
					ok: false,
					code: resolved.code,
					message: resolved.message
				};
				const node = resolved.node;
				this.store.update((state) => setFocusedNode(state, node.id));
				const selectResult = this.bridge.selectNode(node.id);
				if (!selectResult.ok) return {
					ok: false,
					code: selectResult.code,
					message: selectResult.message
				};
				this.pushNow();
				return {
					ok: true,
					code: "OK",
					message: `已聚焦节点「${nodeTitle(node)}」。`,
					value: {
						nodeId: node.id,
						nodeTitle: nodeTitle(node),
						selectedNodeTitle: nodeTitle(node)
					}
				};
			}
			applyOpenNode(rawRef) {
				const resolved = this.bridge.resolveNode(rawRef);
				if (!resolved.ok) return {
					ok: false,
					code: resolved.code,
					message: resolved.message
				};
				const node = resolved.node;
				const selectResult = this.bridge.selectNode(node.id);
				if (!selectResult.ok) return {
					ok: false,
					code: selectResult.code,
					message: selectResult.message
				};
				this.store.update((state) => setReaderMode(setView(setSelectedNode(state, node.id), "markdown"), "section"));
				this.pushNow();
				return {
					ok: true,
					code: "OK",
					message: `已打开章节「${nodeTitle(node)}」。`,
					value: {
						nodeId: node.id,
						nodeTitle: nodeTitle(node),
						selectedNodeTitle: nodeTitle(node),
						currentView: "markdown",
						readerMode: "section"
					}
				};
			}
			applyReaderMode(mode) {
				this.store.update((state) => setReaderMode(setView(state, "markdown"), mode));
				this.pushNow();
				return {
					ok: true,
					code: "OK",
					message: mode === "section" ? "已切换为当前章节阅读。" : "已切换为整篇文档阅读。",
					value: {
						currentView: "markdown",
						readerMode: mode
					}
				};
			}
			applyNavigateSection(direction) {
				const document = this.bridge.getDocument();
				const selected = this.bridge.getSelectedNode();
				if (document === null) return {
					ok: false,
					code: "DOCUMENT_UNAVAILABLE",
					message: "当前没有可阅读的文档。"
				};
				if (selected === null) return {
					ok: false,
					code: "NO_SELECTED_NODE",
					message: "尚未选择章节，请先从大纲打开一个章节。"
				};
				const findParent = (node) => {
					if (node.children.some((child) => child.id === selected.id)) return node;
					for (const child of node.children) {
						const found = findParent(child);
						if (found !== null) return found;
					}
					return null;
				};
				const parent = findParent(document.root);
				if (parent === null) return {
					ok: false,
					code: "NODE_NOT_FOUND",
					message: "文档根节点没有同级章节。"
				};
				const index = parent.children.findIndex((child) => child.id === selected.id);
				const nextIndex = direction === "previous" ? index - 1 : index + 1;
				const target = parent.children[nextIndex];
				if (target === void 0) return {
					ok: false,
					code: "NODE_NOT_FOUND",
					message: direction === "previous" ? "已经是本组第一节。" : "已经是本组最后一节。"
				};
				return this.applyOpenNode(target.id);
			}
			applySetDepth(depth) {
				this.store.update((state) => setDepth(state, depth));
				this.pushNow();
				return {
					ok: true,
					code: "OK",
					message: depth === null ? "已取消层级限制。" : `已设置只显示 ${depth} 层。`,
					value: { depth: depth ?? 0 }
				};
			}
			applySetLayout(layout) {
				this.store.update((state) => setLayout(state, layout));
				this.pushNow();
				return {
					ok: true,
					code: "OK",
					message: `已切换为 ${layout} 布局。`,
					value: { layout }
				};
			}
			applySetFilter(filter) {
				if (filter !== null && filter.role === void 0 && filter.properties === void 0) return {
					ok: false,
					code: "INVALID_FILTER",
					message: "筛选条件为空：请至少提供 role 或 properties。"
				};
				this.store.update((state) => setFilter(state, filter));
				this.pushNow();
				return {
					ok: true,
					code: "OK",
					message: filter === null ? "已清除筛选。" : "已设置筛选条件。",
					value: { filter: filter ?? null }
				};
			}
			applyReset() {
				const initial = initialViewState(this.readDefaults());
				this.store.update((state) => resetView(state, initial));
				this.pushNow();
				return {
					ok: true,
					code: "OK",
					message: "已恢复默认视图。",
					value: { currentView: initial.currentView }
				};
			}
			/** 用户点击节点：同步给文档侧（select_node）并更新视图状态。 */
			handleUserSelectNode(nodeId) {
				if (this.disposed) return;
				if (!this.bridge.selectNode(nodeId).ok) return;
				this.store.update((state) => setSelectedNode(state, nodeId));
				this.pushNow();
			}
			/** 从大纲、概览或导图预览进入章节阅读。 */
			handleUserOpenNode(nodeId) {
				if (this.disposed) return;
				this.applyOpenNode(nodeId);
			}
			/** 大纲折叠只影响导航树。 */
			handleUserToggleOutlineNode(nodeId) {
				if (this.disposed) return;
				this.store.update((state) => toggleOutlineNode(state, nodeId));
				this.pushNow();
			}
			/** 用户在思维导图点击展开/收起按钮：更新视图状态。 */
			handleUserToggleNode(nodeId) {
				if (this.disposed) return;
				const currentlyCollapsed = this.store.getState().collapsedNodeIds.includes(nodeId);
				this.store.update((s) => currentlyCollapsed ? expandNode(s, nodeId) : collapseNode(s, nodeId));
				this.pushNow();
			}
			/** 用户缩放/平移思维导图：回写视图状态（pan 为增量）。 */
			applyViewStateChange(patch) {
				if (this.disposed) return;
				this.store.update((state) => {
					let next = state;
					if (patch.zoom !== void 0) next = {
						...next,
						zoom: patch.zoom
					};
					if (patch.pan !== void 0) next = {
						...next,
						pan: {
							x: next.pan.x + patch.pan.x,
							y: next.pan.y + patch.pan.y
						}
					};
					return next;
				});
				this.schedulePush();
			}
			/** 切换 Mock 文档（示例数据专属；仅 `mock` 状态可用）。 */
			setActiveDocument(documentId) {
				if (this.disposed) return {
					ok: false,
					message: "运行时已释放。"
				};
				if (this.source !== "mock") return {
					ok: false,
					message: "当前数据源不是示例数据，不支持切换示例文档。"
				};
				try {
					this.mockProvider.setActiveDocument(documentId);
					return {
						ok: true,
						message: `已切换为「${this.mockProvider.getActiveDocumentLabel()}」。`
					};
				} catch (error) {
					return {
						ok: false,
						message: error instanceof Error ? error.message : String(error)
					};
				}
			}
			/** 构建状态 wire（视图状态 + 文档信息 + 大纲 + 选中）。 */
			buildWire() {
				const state = this.store.getState();
				const document = this.bridge.getDocument();
				const selected = this.bridge.getSelectedNode();
				const { outline, truncated } = document === null ? {
					outline: [],
					truncated: false
				} : toOutline(document);
				const wire = {
					sessionId: this.sessionId,
					currentView: state.currentView,
					expandedNodeIds: state.expandedNodeIds,
					collapsedNodeIds: state.collapsedNodeIds,
					depth: state.depth,
					viewDepths: state.viewDepths,
					readerMode: state.readerMode,
					outlineCollapsedNodeIds: state.outlineCollapsedNodeIds,
					zoom: state.zoom,
					pan: state.pan,
					layout: state.layout,
					filter: state.filter,
					outline,
					updatedAt: Date.now()
				};
				if (selected !== null) {
					wire.selectedNodeId = selected.id;
					wire.selectedNodeTitle = selected.title;
					const path = [];
					const findPath = (node) => {
						path.push({
							id: node.id,
							title: nodeTitle(node)
						});
						if (node.id === selected.id) return true;
						for (const child of node.children) if (findPath(child)) return true;
						path.pop();
						return false;
					};
					findPath(document.root);
					wire.selectedNodePath = path;
				}
				if (state.focusedNodeId !== null) wire.focusedNodeId = state.focusedNodeId;
				if (document !== null) {
					const provider = this.bridge.getProvider();
					wire.document = {
						id: document.id,
						title: document.title,
						profile: document.profile,
						revision: document.revision,
						providerId: provider.id,
						providerName: provider.displayName
					};
				}
				if (truncated) wire.outlineTruncated = true;
				return wire;
			}
			/** 立即推送（命令执行后）。 */
			pushNow() {
				if (this.disposed) return;
				if (this.pushTimer !== void 0) {
					globalThis.clearTimeout(this.pushTimer);
					this.pushTimer = void 0;
				}
				this.pushTarget(this.buildWire());
			}
			/** 去抖推送（文档/交互高频变化）。 */
			schedulePush() {
				if (this.disposed) return;
				if (this.pushTimer !== void 0) return;
				this.pushTimer = globalThis.setTimeout(() => {
					this.pushTimer = void 0;
					if (this.disposed) return;
					this.pushTarget(this.buildWire());
				}, PUSH_DEBOUNCE_MS);
			}
			/** 选中失效时清理（文档变化后选中节点可能不存在）。 */
			reconcileSelection() {
				const state = this.store.getState();
				const current = this.bridge.getSelectedNodeId();
				if (state.selectedNodeId !== current) this.store.update((s) => setSelectedNode(s, current));
			}
			selectedTitle() {
				return this.bridge.getSelectedNode()?.title;
			}
			/** 释放运行时。 */
			dispose() {
				if (this.disposed) return;
				this.disposed = true;
				for (const resolve of this.viewportWaiters.splice(0)) resolve(null);
				this.viewportController = null;
				if (this.pushTimer !== void 0) {
					globalThis.clearTimeout(this.pushTimer);
					this.pushTimer = void 0;
				}
				for (const unsubscribe of this.unsubscribers) try {
					unsubscribe();
				} catch {}
				this.runtimeListeners.clear();
				this.bridge.dispose();
				this.emptyProvider.dispose();
				this.mockProvider.dispose();
				this.hostProvider.dispose();
			}
		};
		function nodeTitle(node) {
			return node.title.trim() !== "" ? node.title : `（未命名节点 ${node.id}）`;
		}
		//#endregion
		//#region src/shared/types.ts
		/** 命令名集合（wire 校验用）。 */
		const VIEW_COMMAND_NAMES = [
			"set_view",
			"expand_node",
			"collapse_node",
			"focus_node",
			"open_node",
			"set_reader_mode",
			"navigate_section",
			"set_zoom",
			"fit_view",
			"reset_viewport",
			"set_depth",
			"set_layout",
			"set_filter",
			"reset_view",
			"open_tab",
			"sync_state"
		];
		//#endregion
		//#region src/shared/wire.ts
		/** wire 解析失败。 */
		var WireError = class extends Error {
			constructor(message) {
				super(message);
				this.name = "WireError";
			}
		};
		function isRecord(value) {
			return value !== null && typeof value === "object" && !Array.isArray(value);
		}
		function requireString(record, key) {
			const value = record[key];
			if (typeof value !== "string") throw new WireError(`missing or invalid "${key}"`);
			return value;
		}
		function optionalString(record, key) {
			const value = record[key];
			if (value === void 0) return void 0;
			if (typeof value !== "string") throw new WireError(`invalid "${key}"`);
			return value;
		}
		function optionalNumber(record, key) {
			const value = record[key];
			if (value === void 0) return void 0;
			if (typeof value !== "number" || !Number.isFinite(value)) throw new WireError(`invalid "${key}"`);
			return value;
		}
		function isViewName(value) {
			return typeof value === "string" && VIEW_NAMES.includes(value);
		}
		function isLayout(value) {
			return typeof value === "string" && MIND_MAP_LAYOUTS.includes(value);
		}
		function parseFilter(value) {
			if (value === null || value === void 0) return null;
			if (!isRecord(value)) throw new WireError("invalid filter");
			const filter = {};
			if (value.role !== void 0) {
				if (typeof value.role !== "string" || value.role === "") throw new WireError("invalid filter.role");
				filter.role = value.role;
			}
			if (value.properties !== void 0) {
				if (!isRecord(value.properties)) throw new WireError("invalid filter.properties");
				const props = {};
				for (const [key, propValue] of Object.entries(value.properties)) {
					if (typeof propValue !== "string" && typeof propValue !== "number" && typeof propValue !== "boolean") throw new WireError("invalid filter.properties value");
					props[key] = propValue;
				}
				filter.properties = props;
			}
			if (filter.role === void 0 && filter.properties === void 0) throw new WireError("empty filter");
			return filter;
		}
		/** 校验一个命令（{@link ViewCommand} 的形状）。 */
		function parseCommand(raw) {
			if (!isRecord(raw) || typeof raw.name !== "string") throw new WireError("invalid command");
			const name = raw.name;
			if (!VIEW_COMMAND_NAMES.includes(name)) throw new WireError(`unknown command "${name}"`);
			switch (name) {
				case "set_view":
					if (!isViewName(raw.view)) throw new WireError("invalid view");
					return {
						name,
						view: raw.view
					};
				case "expand_node":
				case "collapse_node": {
					const node = optionalString(raw, "node");
					return {
						name,
						...node !== void 0 && node !== "" ? { node } : {}
					};
				}
				case "focus_node": {
					const node = optionalString(raw, "node");
					const mode = raw.mode;
					if (mode !== void 0 && mode !== "visible" && mode !== "center") throw new WireError("invalid focus mode");
					return {
						name,
						...node !== void 0 && node !== "" ? { node } : {},
						...mode !== void 0 ? { mode } : {}
					};
				}
				case "open_node": {
					const node = optionalString(raw, "node");
					return {
						name,
						...node !== void 0 && node !== "" ? { node } : {}
					};
				}
				case "set_reader_mode":
					if (typeof raw.mode !== "string" || !READER_MODES.includes(raw.mode)) throw new WireError("invalid reader mode");
					return {
						name,
						mode: raw.mode
					};
				case "navigate_section":
					if (raw.direction !== "previous" && raw.direction !== "next") throw new WireError("invalid section direction");
					return {
						name,
						direction: raw.direction
					};
				case "set_zoom": {
					const zoom = optionalNumber(raw, "zoom");
					const factor = optionalNumber(raw, "factor");
					if (zoom === void 0 === (factor === void 0)) throw new WireError("set_zoom requires exactly one of zoom/factor");
					if (zoom !== void 0 && (zoom < .3 || zoom > 3) || factor !== void 0 && factor <= 0) throw new WireError("invalid zoom");
					return {
						name,
						...zoom !== void 0 ? { zoom } : { factor }
					};
				}
				case "set_depth": {
					const depth = raw.depth;
					if (depth !== null) {
						if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 0 || depth > 20) throw new WireError("invalid depth");
					}
					return {
						name,
						depth: depth === null ? null : depth
					};
				}
				case "set_layout":
					if (!isLayout(raw.layout)) throw new WireError("invalid layout");
					return {
						name,
						layout: raw.layout
					};
				case "set_filter": return {
					name,
					filter: parseFilter(raw.filter)
				};
				case "reset_view":
				case "fit_view":
				case "reset_viewport":
				case "open_tab":
				case "sync_state": return { name };
				default: throw new WireError(`unknown command "${name}"`);
			}
		}
		/** 校验一个文档快照（宽松结构校验；根节点只要求对象形态）。 */
		function parseDocumentPayload(value) {
			if (value === null || value === void 0) return null;
			if (!isRecord(value)) throw new WireError("invalid document payload");
			if (!isRecord(value.root)) throw new WireError("invalid document.root");
			return {
				id: requireString(value, "id"),
				title: requireString(value, "title"),
				profile: requireString(value, "profile"),
				revision: optionalNumber(value, "revision") ?? 0,
				root: value.root
			};
		}
		/** 解码一条宿主 → 客户端消息。 */
		function parseHostMessage(text) {
			let parsed;
			try {
				parsed = JSON.parse(text);
			} catch {
				throw new WireError("invalid JSON");
			}
			if (!isRecord(parsed) || typeof parsed.type !== "string") throw new WireError("invalid message envelope");
			switch (parsed.type) {
				case "command": return {
					type: "command",
					id: requireString(parsed, "id"),
					command: parseCommand(parsed.command)
				};
				case "document": {
					const selectedNodeId = parsed.selectedNodeId;
					if (selectedNodeId !== null && typeof selectedNodeId !== "string") throw new WireError("invalid selectedNodeId");
					const currentFile = parsed.currentFile;
					if (currentFile !== null && typeof currentFile !== "string") throw new WireError("invalid currentFile");
					return {
						type: "document",
						document: parseDocumentPayload(parsed.document),
						selectedNodeId: selectedNodeId === null ? null : selectedNodeId,
						currentFile: currentFile === null ? null : currentFile
					};
				}
				case "selection": {
					const selectedNodeId = parsed.selectedNodeId;
					if (selectedNodeId !== null && typeof selectedNodeId !== "string") throw new WireError("invalid selectedNodeId");
					return {
						type: "selection",
						selectedNodeId: selectedNodeId === null ? null : selectedNodeId
					};
				}
				case "hello-ack": {
					const capabilities = parsed.capabilities;
					if (!isRecord(capabilities)) throw new WireError("invalid capabilities");
					const structuredDocument = capabilities.structuredDocument;
					if (typeof structuredDocument !== "boolean") throw new WireError("invalid capabilities.structuredDocument");
					return {
						type: "hello-ack",
						capabilities: { structuredDocument }
					};
				}
				default: throw new WireError(`unknown message type "${parsed.type}"`);
			}
		}
		/** 编码一条客户端 → 宿主状态推送。 */
		function encodeClientState(state) {
			return JSON.stringify({
				type: "state",
				state
			});
		}
		/** 编码一条客户端 → 宿主确认。 */
		function encodeAck(result) {
			return JSON.stringify({
				type: "command-result",
				result
			});
		}
		/** 编码一条客户端 → 宿主 hello。 */
		function encodeHello(sessionId) {
			return JSON.stringify({
				type: "hello",
				sessionId
			});
		}
		/** 编码一条客户端 → 宿主选中同步（select-node）。 */
		function encodeClientSelectNode(nodeId) {
			return JSON.stringify({
				type: "select-node",
				nodeId
			});
		}
		/** 编码一条客户端 → 宿主当前文件同步（current-file）。 */
		function encodeClientCurrentFile(path) {
			return JSON.stringify({
				type: "current-file",
				path
			});
		}
		//#endregion
		//#region src/client/host-websocket.ts
		/** Desktop sockets use the injected Host origin; web URLs retain their proxy directory. */
		function websocketRoute(route, sessionId, pageBase, streamBase) {
			const base = new URL(streamBase || pageBase);
			if (!["http:", "https:"].includes(base.protocol)) throw new Error("宿主连接地址尚未就绪。");
			base.search = "";
			base.hash = "";
			if (!base.pathname.endsWith("/")) base.pathname += "/";
			const url = new URL(route.replace(/^\/+/, ""), base);
			url.protocol = base.protocol === "https:" ? "wss:" : "ws:";
			url.searchParams.set("sessionId", sessionId);
			return url.href;
		}
		function hostWebSocketUrl(route, sessionId) {
			const transport = window.__DSH_TRANSPORT__;
			return websocketRoute(route, sessionId, typeof document !== "undefined" ? document.baseURI : window.location.href || `${window.location.protocol}//${window.location.host}/`, transport?.streamBaseUrl);
		}
		//#endregion
		//#region src/client/bridge-client.ts
		/** 桥升级路径（必须与宿主半区一致）。 */
		const BRIDGE_PATH = "/structured-document-view/ws";
		/** 重连退避：起始间隔、倍率与封顶间隔（不设次数上限，靠封顶限流）。 */
		const RECONNECT_DELAY_BASE_MS = 2e3;
		const RECONNECT_DELAY_MAX_MS = 3e4;
		/** 视图桥客户端。 */
		var ViewBridgeClient = class {
			sessionId;
			handlers;
			socket = null;
			retryTimer;
			closed = false;
			failures = 0;
			attached = false;
			constructor(sessionId, handlers) {
				this.sessionId = sessionId;
				this.handlers = handlers;
			}
			/** 开始连接（幂等；退避等待期不提前重试，由退避定时器接管）。 */
			connect() {
				if (this.closed || this.socket !== null || this.retryTimer !== void 0) return;
				this.open();
			}
			/** 推送一条状态镜像到宿主。 */
			sendWire(wire) {
				this.send(encodeClientState(wire));
			}
			/** 推送选中节点同步到宿主（select-node）。 */
			sendSelectNode(nodeId) {
				this.send(encodeClientSelectNode(nodeId));
			}
			/** 推送当前文件同步到宿主（current-file）。 */
			sendCurrentFile(path) {
				this.send(encodeClientCurrentFile(path));
			}
			/** 发送任意客户端 → 宿主消息（测试/扩展用）。 */
			sendMessage(message) {
				this.send(JSON.stringify(message));
			}
			/** 是否已连接。 */
			isConnected() {
				return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
			}
			/** 关闭连接（不再重连）。 */
			close() {
				this.closed = true;
				if (this.retryTimer !== void 0) {
					window.clearTimeout(this.retryTimer);
					this.retryTimer = void 0;
				}
				if (this.socket !== null) {
					this.socket.close();
					this.socket = null;
				}
			}
			open() {
				if (this.closed || this.socket !== null) return;
				let socket;
				try {
					socket = new WebSocket(hostWebSocketUrl(BRIDGE_PATH, this.sessionId));
				} catch {
					this.scheduleReconnect();
					return;
				}
				this.socket = socket;
				socket.onopen = () => {
					this.failures = 0;
					this.attached = true;
					this.send(encodeHello(this.sessionId));
				};
				socket.onmessage = (event) => {
					const text = typeof event.data === "string" ? event.data : String(event.data);
					try {
						const message = parseHostMessage(text);
						if (message.type === "command") {
							const result = this.handlers.onCommand(message.id, message.command);
							const sendAck = (ack) => {
								this.send(encodeAck({
									id: message.id,
									ok: ack.ok,
									code: ack.code,
									message: ack.message,
									...ack.value !== void 0 ? { value: ack.value } : {}
								}));
							};
							if (result instanceof Promise) result.then(sendAck).catch(() => sendAck({
								ok: false,
								code: "INTERNAL_ERROR",
								message: "客户端执行命令失败。"
							}));
							else sendAck(result);
						} else if (message.type === "hello-ack") this.handlers.onCapabilities?.(message.capabilities);
						else if (message.type === "document") this.handlers.onDocument?.(message);
						else this.handlers.onSelection?.(message);
					} catch {}
				};
				socket.onclose = () => {
					if (this.socket === socket) this.socket = null;
					if (!this.closed) this.scheduleReconnect();
				};
				socket.onerror = () => {};
			}
			send(text) {
				if (this.socket !== null && this.socket.readyState === WebSocket.OPEN) this.socket.send(text);
			}
			scheduleReconnect() {
				if (this.closed || this.retryTimer !== void 0) return;
				const delay = Math.min(RECONNECT_DELAY_BASE_MS * 2 ** this.failures, RECONNECT_DELAY_MAX_MS);
				this.failures += 1;
				this.retryTimer = window.setTimeout(() => {
					this.retryTimer = void 0;
					this.open();
				}, delay);
			}
			/** 供宿主判断（测试用）。 */
			get attachedSession() {
				return this.sessionId;
			}
		};
		//#endregion
		//#region src/client/session-manager.ts
		/**
		* ViewSessionManager（会话管理器）：按会话维护 {@link ViewRuntime} 与
		* {@link ViewBridgeClient}。
		*
		* - 每个会话懒创建独立运行时（各自的 Mock 文档与视图状态，互不串扰）；
		* - 只连接"当前活动会话"的桥（与 controller 的桥接模式一致），
		*   切换会话时关闭旧连接、打开新连接。
		*/
		/** 会话管理器（模块级单例，由客户端 apply 初始化）。 */
		var ViewSessionManager = class {
			runtimes = /* @__PURE__ */ new Map();
			clients = /* @__PURE__ */ new Map();
			activeSessionId = null;
			disposed = false;
			/** 「打开结构化文档页签」回调（open_tab 命令执行时调用；由 apply 注入）。 */
			openTabHandler = void 0;
			/**
			* 「侧边卡片配置默认值」读取器（SPEC F011；由 apply 注入适配层实现）。
			* 未注入时运行时用内置默认（软依赖回退）。
			*/
			readViewDefaults = void 0;
			/** 注入打开视图页签的回调（客户端 apply 创建 adapter 后设置）。 */
			setOpenTabHandler(handler) {
				this.openTabHandler = handler;
			}
			/**
			* 注入配置默认值读取器（客户端 apply 创建 adapter 后设置）。
			* 必须在创建运行时之前注入：运行时的初始视图状态只在构造时读取一次。
			*/
			setViewDefaultsReader(reader) {
				this.readViewDefaults = reader;
			}
			/** 获取（必要时创建）某会话的运行时。 */
			ensureRuntime(sessionId) {
				let runtime = this.runtimes.get(sessionId);
				if (runtime === void 0) {
					runtime = new ViewRuntime(sessionId, (wire) => this.clientFor(sessionId)?.sendWire(wire), (message) => this.clientFor(sessionId)?.sendMessage(message), void 0, () => this.openTabHandler?.(), this.readViewDefaults);
					this.runtimes.set(sessionId, runtime);
				}
				return runtime;
			}
			/** 获取某会话的运行时；不存在返回 undefined。 */
			getRuntime(sessionId) {
				return this.runtimes.get(sessionId);
			}
			/** 设置当前活动会话：连接其桥（幂等）。 */
			setActiveSession(sessionId) {
				if (this.disposed || sessionId === this.activeSessionId) return;
				if (this.activeSessionId !== null) {
					const oldSessionId = this.activeSessionId;
					this.clients.get(oldSessionId)?.close();
					this.clients.delete(oldSessionId);
				}
				this.activeSessionId = sessionId;
				this.ensureRuntime(sessionId);
				this.clientFor(sessionId)?.connect();
			}
			/** 释放某会话的运行时与连接。 */
			disposeSession(sessionId) {
				this.clients.get(sessionId)?.close();
				this.clients.delete(sessionId);
				this.runtimes.get(sessionId)?.dispose();
				this.runtimes.delete(sessionId);
				if (this.activeSessionId === sessionId) this.activeSessionId = null;
			}
			/** 释放全部。 */
			disposeAll() {
				if (this.disposed) return;
				this.disposed = true;
				for (const client of this.clients.values()) client.close();
				for (const runtime of this.runtimes.values()) runtime.dispose();
				this.clients.clear();
				this.runtimes.clear();
				this.activeSessionId = null;
			}
			clientFor(sessionId) {
				let client = this.clients.get(sessionId);
				if (client === void 0) {
					const runtime = this.ensureRuntime(sessionId);
					client = new ViewBridgeClient(sessionId, {
						onCommand: (id, command) => {
							return command.name === "focus_node" || command.name === "set_zoom" || command.name === "fit_view" || command.name === "reset_viewport" ? runtime.applyCommandAsync(command) : runtime.applyCommand(command);
						},
						onCapabilities: (capabilities) => runtime.applyCapabilities(capabilities),
						onDocument: (message) => runtime.applyHostDocument(message),
						onSelection: (message) => runtime.applyHostSelection(message.selectedNodeId)
					});
					this.clients.set(sessionId, client);
				}
				return client;
			}
		};
		//#endregion
		//#region src/shared/view-tree.ts
		/** 节点自身的筛选匹配结果。 */
		function selfMatches(node, state) {
			return nodeMatchesFilter(node, state.filter);
		}
		/** 递归折叠视图树。 */
		function buildNode(node, level, state, underExplicitExpand, ignoreCollapse) {
			const childUnderExpand = underExplicitExpand || state.expandedNodeIds.includes(node.id);
			const childrenResult = [];
			let subtreeVisible = false;
			for (const child of node.children) {
				const result = buildNode(child, level + 1, state, childUnderExpand, ignoreCollapse);
				if (result.subtreeVisible) subtreeVisible = true;
				childrenResult.push(result);
			}
			const visible = !isDepthLimited(level, state.depth, underExplicitExpand) && (selfMatches(node, state) || subtreeVisible);
			const collapsed = !ignoreCollapse && node.children.length > 0 && isCollapsed(node.id, level, state, underExplicitExpand);
			return {
				tree: {
					node,
					level,
					visible,
					collapsed,
					children: collapsed ? [] : childrenResult.filter((result) => result.subtreeVisible).map((result) => result.tree),
					underExplicitExpand
				},
				subtreeVisible: visible
			};
		}
		/** 计算整棵视图树（根节点恒可见）。 */
		function buildViewTree(document, state, options = {}) {
			const ignoreCollapse = options.ignoreCollapse === true;
			const root = document.root;
			return {
				...buildNode(root, 1, state, false, ignoreCollapse).tree,
				visible: true
			};
		}
		/** 为指定视图计算可见树，避免一个视图的层级设置污染另一个视图。 */
		function buildViewTreeFor(document, state, view, options = {}) {
			return buildViewTree(document, {
				...state,
				depth: state.viewDepths[view]
			}, options);
		}
		/** 以先序扁平化视图树（返回所有节点的引用，含折叠隐藏的节点本身）。 */
		function flattenViewTree(root) {
			const results = [];
			const walk = (tree) => {
				results.push(tree);
				for (const child of tree.children) walk(child);
			};
			walk(root);
			return results;
		}
		//#endregion
		//#region src/client/adapters/markdown.ts
		/** 把一行正文拆成摘要（思维导图/表格用）。 */
		function summarize(text, maxLength = 60) {
			const line = text.replace(/\s+/g, " ").trim();
			if (line.length <= maxLength) return line;
			return `${line.slice(0, maxLength)}…`;
		}
		/** 节点展示标题：优先标题，缺省用正文摘要。 */
		function nodeDisplayTitle(node) {
			if (node.title.trim() !== "") return node.title.trim();
			const summary = summarize(node.content, 40);
			return summary !== "" ? summary : `（未命名节点 ${node.id}）`;
		}
		//#endregion
		//#region src/client/adapters/mindmap.ts
		/** 常见角色的展示图标（需求第 8 章的 ☑ / ⚠ / ? 风格）。 */
		const ROLE_ICONS = {
			task: "☑",
			action_item: "☑",
			risk: "⚠",
			problem: "⚠",
			question: "?",
			idea: "✦",
			solution: "➤",
			topic: "◆",
			decision: "✔",
			conclusion: "★",
			milestone: "◉",
			objective: "◎",
			key_result: "▣",
			discussion: "•",
			note: "·"
		};
		function mapNode(node, level, state, underExplicitExpand) {
			if (isDepthLimited(level, state.depth, underExplicitExpand) && level > 1) return null;
			const childUnderExpand = underExplicitExpand || state.expandedNodeIds.includes(node.id);
			const mappedChildren = [];
			let subtreeMatches = false;
			for (const child of node.children) {
				const mapped = mapNode(child, level + 1, state, childUnderExpand);
				if (mapped !== null) {
					subtreeMatches = true;
					mappedChildren.push(mapped);
				}
			}
			if (!nodeMatchesFilter(node, state.filter) && !subtreeMatches && level > 1) return null;
			const expanded = !isCollapsed(node.id, level, state, underExplicitExpand);
			return {
				id: node.id,
				topic: nodeDisplayTitle(node),
				expanded,
				role: node.role,
				children: mappedChildren
			};
		}
		/** 计算思维导图数据模型。 */
		function toMindMapViewModel(document, state) {
			const mindmapState = {
				...state,
				depth: state.viewDepths.mindmap
			};
			const root = mapNode(document.root, 1, mindmapState, false);
			if (root === null) return {
				root: {
					id: document.root.id,
					topic: nodeDisplayTitle(document.root),
					expanded: true,
					role: document.root.role,
					children: []
				},
				direction: LAYOUT_DIRECTIONS[state.layout],
				layout: state.layout,
				title: document.title,
				roleIcons: { ...ROLE_ICONS }
			};
			return {
				root,
				direction: LAYOUT_DIRECTIONS[state.layout],
				layout: state.layout,
				title: document.title,
				roleIcons: { ...ROLE_ICONS }
			};
		}
		//#endregion
		//#region src/client/views/markdown-render.tsx
		/**
		* 轻量 Markdown → React 渲染器（自包含）。
		*
		* 设计决策：DSH 客户端插件 bundle 相互隔离（禁止跨插件 value import），
		* 无法直接复用 dsh-better-sidebar 内部的 marked 实例；为独立发布与零额外
		* 依赖，V0.1 提供覆盖结构化文档常见语法的轻量实现：
		* 标题 / 段落 / 无序列表 / 任务列表 / 有序列表 / 行内代码 / 粗体 / 斜体 /
		* 行内链接 / 代码块 / 表格 / 分隔线。超出范围的文本按原文展示。
		*
		* 不解析 HTML（安全考虑：一律按文本展示）。
		*/
		/** 行内样式解析：`code`、**bold**、*italic*、[text](url)。 */
		function inline(text, keyPrefix) {
			const nodes = [];
			const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[([^\]]+)\]\(([^)\s]+)\))/g;
			let lastIndex = 0;
			let match;
			let index = 0;
			while ((match = regex.exec(text)) !== null) {
				if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
				const [full] = match;
				const key = `${keyPrefix}-${index++}`;
				if (match[1] !== void 0) nodes.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
					className: "sdv-code",
					children: match[1].slice(1, -1)
				}, key));
				else if (match[2] !== void 0) nodes.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: match[2].slice(2, -2) }, key));
				else if (match[3] !== void 0) nodes.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("em", { children: match[3].slice(1, -1) }, key));
				else if (match[4] !== void 0) {
					const label = match[5] ?? full;
					const href = match[6] ?? "";
					nodes.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						href,
						target: "_blank",
						rel: "noreferrer",
						children: label
					}, key));
				} else nodes.push(full);
				lastIndex = match.index + full.length;
			}
			if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
			return nodes;
		}
		function isTaskLine(line) {
			const match = /^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(line);
			if (match === null) return null;
			return {
				checked: match[1] === "x" || match[1] === "X",
				rest: match[2]
			};
		}
		/** 表格行解析：`| a | b |`。 */
		function splitTableRow(line) {
			return line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((cell) => cell.trim());
		}
		/** 渲染一段 Markdown 文本。 */
		function renderMarkdown(markdown) {
			const lines = markdown.split(/\r?\n/);
			const blocks = [];
			let index = 0;
			let blockIndex = 0;
			const pushBlock = (node) => {
				blocks.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(react.Fragment, { children: node }, `b${blockIndex++}`));
			};
			while (index < lines.length) {
				const line = lines[index];
				if (line.trim() === "") {
					index += 1;
					continue;
				}
				if (/^\s*<!--/.test(line)) {
					index += 1;
					if (!line.includes("-->")) {
						while (index < lines.length && !lines[index].includes("-->")) index += 1;
						if (index < lines.length) index += 1;
					}
					continue;
				}
				if (/^\s*```/.exec(line) !== null) {
					const codeLines = [];
					index += 1;
					while (index < lines.length && !/^\s*```/.test(lines[index])) {
						codeLines.push(lines[index]);
						index += 1;
					}
					index += 1;
					pushBlock(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						className: "sdv-pre",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: codeLines.join("\n") })
					}, "pre"));
					continue;
				}
				const heading = /^(#{1,6})\s+(.*)$/.exec(line);
				if (heading !== null) {
					const level = heading[1].length;
					const Tag = `h${level}`;
					pushBlock(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tag, {
						className: "sdv-heading",
						children: inline(heading[2], `h${level}`)
					}, "h"));
					index += 1;
					continue;
				}
				if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
					pushBlock(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("hr", {}, "hr"));
					index += 1;
					continue;
				}
				if (line.trim().startsWith("|")) {
					const tableLines = [];
					while (index < lines.length && lines[index].trim().startsWith("|")) {
						tableLines.push(lines[index]);
						index += 1;
					}
					if (tableLines.length >= 2 && /^[\s|:-]+$/.test(tableLines[1].replace(/[|]/g, "").trim())) {
						const header = splitTableRow(tableLines[0]);
						const rows = tableLines.slice(2).map(splitTableRow);
						pushBlock(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
							className: "sdv-table",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: header.map((cell, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: cell }, i)) }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: rows.map((row, r) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: header.map((_, c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row[c] ?? "" }, c)) }, r)) })]
						}, "table"));
						continue;
					}
					pushBlock(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: inline(tableLines[0], "p") }, "p"));
					continue;
				}
				if (/^\s*\d+[.)]\s+(.*)$/.exec(line) !== null) {
					const items = [];
					while (index < lines.length) {
						const item = /^\s*\d+[.)]\s+(.*)$/.exec(lines[index]);
						if (item === null) break;
						items.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: inline(item[1], `o${items.length}`) }, items.length));
						index += 1;
					}
					pushBlock(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
						className: "sdv-list",
						children: items
					}, "ol"));
					continue;
				}
				if (/^(\s*)[-*+]\s+(.*)$/.exec(line) !== null) {
					const items = [];
					while (index < lines.length) {
						const item = /^(\s*)[-*+]\s+(.*)$/.exec(lines[index]);
						if (item === null) break;
						const task = isTaskLine(lines[index]);
						if (task !== null) items.push(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: "sdv-task",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: task.checked,
								readOnly: true,
								disabled: true
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: inline(task.rest, `t${items.length}`) })]
						}, items.length));
						else items.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: inline(item[2], `u${items.length}`) }, items.length));
						index += 1;
					}
					pushBlock(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: "sdv-list",
						children: items
					}, "ul"));
					continue;
				}
				const paragraphLines = [line];
				index += 1;
				while (index < lines.length && lines[index].trim() !== "" && !/^(#{1,6})\s/.test(lines[index]) && !/^\s*```/.test(lines[index])) {
					paragraphLines.push(lines[index]);
					index += 1;
				}
				pushBlock(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "sdv-paragraph",
					children: inline(paragraphLines.join(" "), "p")
				}, "p"));
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "sdv-markdown",
				children: blocks
			});
		}
		//#endregion
		//#region src/client/views/markdown-view.tsx
		function findPath(root, id) {
			if (root.id === id) return [root];
			for (const child of root.children) {
				const path = findPath(child, id);
				if (path !== null) return [root, ...path];
			}
			return null;
		}
		function allNodes(root, path = []) {
			const current = [...path, {
				id: root.id,
				title: nodeDisplayTitle(root)
			}];
			return [{
				node: root,
				path: current
			}, ...root.children.flatMap((child) => allNodes(child, current))];
		}
		function searchNodes(document, query) {
			const needle = query.trim().toLocaleLowerCase();
			if (needle === "") return [];
			return allNodes(document.root).filter(({ node }) => {
				return [
					node.title,
					node.content,
					node.role,
					...Object.entries(node.properties).flatMap(([key, value]) => [key, String(value)])
				].join("\n").toLocaleLowerCase().includes(needle);
			}).slice(0, 50);
		}
		function NodeArticle({ node, level, selectedId }) {
			const Heading = `h${Math.min(6, Math.max(1, level))}`;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: `sdv-reader-node ${node.id === selectedId ? "sdv-reader-node-selected" : ""}`,
				"data-node-id": node.id,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Heading, {
						className: "sdv-heading",
						children: [nodeDisplayTitle(node), node.role !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "sdv-role-tag",
							children: node.role
						})]
					}),
					node.content.trim() !== "" && renderMarkdown(node.content),
					Object.keys(node.properties).length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dl", {
						className: "sdv-properties",
						children: Object.entries(node.properties).map(([key, value]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: key }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: String(value) })] }, key))
					}),
					node.children.map((child) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NodeArticle, {
						node: child,
						level: level + 1,
						selectedId
					}, child.id))
				]
			});
		}
		function OutlineBranch({ node, state, runtime, onOpenNode, level = 0 }) {
			const collapsed = state.outlineCollapsedNodeIds.includes(node.id);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "sdv-outline-branch",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `sdv-outline-row ${state.selectedNodeId === node.id ? "is-selected" : ""}`,
					style: { paddingLeft: `${6 + level * 13}px` },
					children: [node.children.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: "sdv-outline-toggle",
						type: "button",
						"aria-label": collapsed ? "展开" : "收起",
						onClick: () => runtime.handleUserToggleOutlineNode(node.id),
						children: collapsed ? "›" : "⌄"
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "sdv-outline-spacer" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: "sdv-outline-title",
						type: "button",
						onClick: () => onOpenNode(node.id),
						children: nodeDisplayTitle(node)
					})]
				}), !collapsed && node.children.map((child) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OutlineBranch, {
					node: child,
					state,
					runtime,
					onOpenNode,
					level: level + 1
				}, child.id))]
			});
		}
		function MarkdownView({ runtime, state }) {
			const document = runtime.bridge.getDocument();
			const [query, setQuery] = (0, react.useState)("");
			const [outlineOpen, setOutlineOpen] = (0, react.useState)(false);
			const scrollRef = (0, react.useRef)(null);
			const matches = (0, react.useMemo)(() => document === null ? [] : searchNodes(document, query), [document, query]);
			const selectedPath = document === null || state.selectedNodeId === null ? null : findPath(document.root, state.selectedNodeId);
			const selected = selectedPath?.[selectedPath.length - 1] ?? null;
			(0, react.useEffect)(() => {
				if (state.readerMode !== "document" || state.selectedNodeId === null) return;
				requestAnimationFrame(() => Array.from(scrollRef.current?.querySelectorAll("[data-node-id]") ?? []).find((element) => element.dataset.nodeId === state.selectedNodeId)?.scrollIntoView({ block: "center" }));
			}, [
				state.readerMode,
				state.selectedNodeId,
				document?.revision
			]);
			if (document === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "sdv-empty",
				children: "当前没有可展示的文档。"
			});
			const navigate = (direction) => {
				runtime.applyCommand({
					name: "navigate_section",
					direction
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "sdv-reader-shell",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: "sdv-outline-drawer-button",
						type: "button",
						onClick: () => setOutlineOpen((value) => !value),
						children: "☰ 大纲"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
						className: `sdv-outline ${outlineOpen ? "is-open" : ""}`,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "sdv-outline-header",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "文档大纲" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setOutlineOpen(false),
									children: "×"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "sdv-outline-search",
								value: query,
								onChange: (event) => setQuery(event.target.value),
								placeholder: "搜索标题、正文或属性"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "sdv-outline-tree",
								children: query.trim() === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OutlineBranch, {
									node: document.root,
									state,
									runtime,
									onOpenNode: (nodeId) => {
										runtime.handleUserOpenNode(nodeId);
										setOutlineOpen(false);
									}
								}) : matches.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "sdv-outline-empty",
									children: "没有匹配内容"
								}) : matches.map(({ node, path }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									className: "sdv-search-result",
									type: "button",
									onClick: () => {
										runtime.handleUserOpenNode(node.id);
										setOutlineOpen(false);
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: nodeDisplayTitle(node) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: path.map((item) => item.title).join(" / ") })]
								}, node.id))
							})
						]
					}),
					outlineOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "sdv-outline-backdrop",
						"aria-label": "关闭大纲",
						onClick: () => setOutlineOpen(false)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("main", {
						className: "sdv-reader-main",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "sdv-reader-toolbar",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "sdv-breadcrumb",
								children: (selectedPath ?? [document.root]).map((node, index, path) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => runtime.handleUserOpenNode(node.id),
									children: nodeDisplayTitle(node)
								}), index < path.length - 1 && " / "] }, node.id))
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "sdv-reader-actions",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "sdv-btn",
										type: "button",
										disabled: selected === null,
										onClick: () => navigate("previous"),
										children: "上一节"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "sdv-btn",
										type: "button",
										disabled: selected === null,
										onClick: () => navigate("next"),
										children: "下一节"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "sdv-btn",
										type: "button",
										onClick: () => runtime.applyCommand({
											name: "set_reader_mode",
											mode: state.readerMode === "section" ? "document" : "section"
										}),
										children: state.readerMode === "section" ? "查看全文" : "只看本节"
									})
								]
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							ref: scrollRef,
							className: "sdv-markdown-scroll",
							children: state.readerMode === "document" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NodeArticle, {
								node: document.root,
								level: 1,
								selectedId: state.selectedNodeId
							}) : selected !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NodeArticle, {
								node: selected,
								level: 1,
								selectedId: selected.id
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "sdv-reader-overview",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", { children: document.title }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "从大纲或下面的章节概览选择要阅读的内容。" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "sdv-overview-grid",
										children: document.root.children.map((node) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => runtime.handleUserOpenNode(node.id),
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: nodeDisplayTitle(node) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: summarize(node.content || node.children.map((child) => child.title).join("、"), 90) || "打开查看本节内容" })]
										}, node.id))
									})
								]
							})
						})]
					})
				]
			});
		}
		//#endregion
		//#region ../../../upgrade/20261017-desktop/build-deps/node_modules/mind-elixir/dist/MindElixir.js
		const me = {
			name: "Latte",
			type: "light",
			palette: [
				"#dd7878",
				"#ea76cb",
				"#8839ef",
				"#e64553",
				"#fe640b",
				"#df8e1d",
				"#40a02b",
				"#209fb5",
				"#1e66f5",
				"#7287fd"
			],
			cssVar: {
				"--node-gap-x": "30px",
				"--node-gap-y": "10px",
				"--main-gap-x": "65px",
				"--main-gap-y": "45px",
				"--root-radius": "30px",
				"--main-radius": "20px",
				"--root-color": "#ffffff",
				"--root-bgcolor": "#4c4f69",
				"--root-border-color": "rgba(0, 0, 0, 0)",
				"--main-border": "",
				"--main-color": "#444446",
				"--main-bgcolor": "#ffffff",
				"--main-bgcolor-transparent": "rgba(255, 255, 255, 0.8)",
				"--topic-padding": "3px",
				"--color": "#777777",
				"--bgcolor": "#f6f6f6",
				"--selected": "#4dc4ff",
				"--accent-color": "#e64553",
				"--panel-color": "#444446",
				"--panel-bgcolor": "#ffffff",
				"--panel-border-color": "#eaeaea",
				"--map-padding": "50px 80px"
			}
		};
		const ye = {
			name: "Dark",
			type: "dark",
			palette: [
				"#848FA0",
				"#748BE9",
				"#D2F9FE",
				"#4145A5",
				"#789AFA",
				"#706CF4",
				"#EF987F",
				"#775DD5",
				"#FCEECF",
				"#DA7FBC"
			],
			cssVar: {
				"--node-gap-x": "30px",
				"--node-gap-y": "10px",
				"--main-gap-x": "65px",
				"--main-gap-y": "45px",
				"--root-radius": "30px",
				"--main-radius": "20px",
				"--root-color": "#ffffff",
				"--root-bgcolor": "#2d3748",
				"--root-border-color": "rgba(255, 255, 255, 0.1)",
				"--main-border": "",
				"--main-color": "#ffffff",
				"--main-bgcolor": "#4c4f69",
				"--main-bgcolor-transparent": "rgba(76, 79, 105, 0.8)",
				"--topic-padding": "3px",
				"--color": "#cccccc",
				"--bgcolor": "#252526",
				"--selected": "#4dc4ff",
				"--accent-color": "#789AFA",
				"--panel-color": "#ffffff",
				"--panel-bgcolor": "#2d3748",
				"--panel-border-color": "#696969",
				"--map-padding": "50px 80px"
			}
		};
		function be(e) {
			return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
		}
		const ce = function(e, t) {
			if (t.id === e) return t;
			if (t.children && t.children.length) {
				for (let n = 0; n < t.children.length; n++) {
					const o = ce(e, t.children[n]);
					if (o) return o;
				}
				return null;
			} else return null;
		};
		const Y = (e, t) => {
			if (e.parent = t, e.children) for (let n = 0; n < e.children.length; n++) Y(e.children[n], e);
		};
		const z = (e, t, n) => {
			if (e.expanded = t, e.children) if (n === void 0 || n > 0) {
				const o = n !== void 0 ? n - 1 : void 0;
				e.children.forEach((s) => {
					z(s, t, o);
				});
			} else e.children.forEach((o) => {
				z(o, !1);
			});
		};
		function we(e) {
			if (e.id = X(), e.children) for (let t = 0; t < e.children.length; t++) we(e.children[t]);
		}
		function ae(e, t, n, o) {
			const s = n - e, i = o - t, l = Math.atan2(i, s) * 180 / Math.PI, a = 12, c = 30, h = (l + 180 - c) * Math.PI / 180, d = (l + 180 + c) * Math.PI / 180;
			return {
				x1: n + Math.cos(h) * a,
				y1: o + Math.sin(h) * a,
				x2: n + Math.cos(d) * a,
				y2: o + Math.sin(d) * a
			};
		}
		function X() {
			return ((/* @__PURE__ */ new Date()).getTime().toString(16) + Math.random().toString(16).substring(2)).substring(2, 18);
		}
		const Et = function() {
			const e = X();
			return {
				topic: this.newTopicName,
				id: e
			};
		};
		function G(e) {
			return JSON.parse(JSON.stringify(e, (n, o) => {
				if (n !== "parent") return o;
			}));
		}
		const $ = (e, t) => {
			let n = 0, o = 0;
			for (; t && t !== e;) n += t.offsetLeft, o += t.offsetTop, t = t.offsetParent;
			return {
				offsetLeft: n,
				offsetTop: o
			};
		};
		const _ = (e, t) => {
			for (const n in t) e.setAttribute(n, t[n]);
		};
		const re = (e) => e ? e.tagName === "ME-TPC" : !1;
		const Ee = (e) => {
			const t = new Set(e.map((n) => n.nodeObj));
			return e.filter((n) => n.nodeObj.parent).filter((n) => {
				let o = n.nodeObj.parent;
				for (; o;) {
					if (t.has(o)) return !1;
					o = o.parent;
				}
				return !0;
			});
		};
		const Ce = (e) => {
			const n = e.match(/translate3d\(([^,]+),\s*([^,]+)/);
			return n ? {
				x: parseFloat(n[1]),
				y: parseFloat(n[2])
			} : {
				x: 0,
				y: 0
			};
		};
		const Ge = function(e) {
			for (let t = 0; t < e.length; t++) {
				const { dom: n, evt: o, func: s } = e[t];
				n.addEventListener(o, s);
			}
			return function() {
				for (let n = 0; n < e.length; n++) {
					const { dom: o, evt: s, func: i } = e[n];
					o.removeEventListener(s, i);
				}
			};
		};
		const ke = (e, t) => {
			const n = e.x - t.x, o = e.y - t.y;
			return Math.sqrt(n * n + o * o);
		};
		const Ae = function(e, t) {
			if (!t) return de(e), e;
			let n = e.querySelector(".insert-preview");
			const o = `insert-preview ${t} show`;
			return n || (n = document.createElement("div"), e.appendChild(n)), n.className = o, e;
		};
		const de = function(e) {
			if (!e) return;
			const t = e.querySelectorAll(".insert-preview");
			for (const n of t || []) n.remove();
		};
		const te = function(e, t) {
			for (const n of t) {
				const o = n.parentElement.parentElement.contains(e);
				if (!(e && e.tagName === "ME-TPC" && e !== n && !o && e.nodeObj.parent)) return !1;
			}
			return !0;
		};
		const Ct = function(e) {
			const t = document.createElement("div");
			return t.className = "mind-elixir-ghost", e.container.appendChild(t), t;
		};
		var St = class {
			mind;
			isMoving = !1;
			interval = null;
			speed = 20;
			constructor(t) {
				this.mind = t;
			}
			move(t, n) {
				this.isMoving || (this.isMoving = !0, this.interval = setInterval(() => {
					this.mind.move(t * this.speed * this.mind.scaleVal, n * this.speed * this.mind.scaleVal);
				}, 100));
			}
			stop() {
				this.isMoving = !1, this.interval && (clearInterval(this.interval), this.interval = null);
			}
		};
		function Nt(e) {
			return {
				isDragging: !1,
				insertType: null,
				meet: null,
				ghost: Ct(e),
				edgeMoveController: new St(e),
				startX: 0,
				startY: 0,
				pointerId: null
			};
		}
		const Tt = 5;
		function Pe(e, t, n, o = !1) {
			if (e.spacePressed) return !1;
			const s = n.target;
			if (s?.tagName !== "ME-TPC" || !s.nodeObj.parent) return !1;
			if (t.startX = n.clientX, t.startY = n.clientY, t.pointerId = n.pointerId, e.dragged = e.currentNodes, o) {
				Ue(e, t);
				const i = e.container.getBoundingClientRect();
				qe(t.ghost, n.clientX - i.x, n.clientY - i.y);
			}
			return !0;
		}
		function qe(e, t, n) {
			e.style.transform = `translate(${t - 10}px, ${n - 10}px)`, e.style.display = "block";
		}
		function Ue(e, t) {
			const { dragged: n } = e;
			if (!n) return;
			const o = document.activeElement;
			o && o.isContentEditable && o.blur(), t.isDragging = !0, n.length > 1 ? t.ghost.innerHTML = n.length + "" : t.ghost.innerHTML = n[0].innerHTML;
			for (const s of n) s.parentElement.parentElement.style.opacity = "0.5";
			e.panHelper.clear();
		}
		function Dt(e, t, n) {
			const { dragged: o } = e;
			if (!o || t.pointerId !== n.pointerId) return;
			const s = n.clientX - t.startX, i = n.clientY - t.startY, r = Math.sqrt(s * s + i * i);
			if (!t.isDragging && r > Tt && Ue(e, t), !t.isDragging) return;
			const l = e.container.getBoundingClientRect();
			qe(t.ghost, n.clientX - l.x, n.clientY - l.y), n.clientX < l.x + 50 ? t.edgeMoveController.move(1, 0) : n.clientX > l.x + l.width - 50 ? t.edgeMoveController.move(-1, 0) : n.clientY < l.y + 50 ? t.edgeMoveController.move(0, 1) : n.clientY > l.y + l.height - 50 ? t.edgeMoveController.move(0, -1) : t.edgeMoveController.stop(), de(t.meet);
			const a = 12 * e.scaleVal;
			if (e.direction === 3) {
				const h = document.elementFromPoint(n.clientX - a, n.clientY);
				if (te(h, o)) {
					t.meet = h;
					const d = h.getBoundingClientRect();
					n.clientX > d.x + d.width ? t.insertType = "after" : t.insertType = "in";
				} else {
					const d = document.elementFromPoint(n.clientX + a, n.clientY);
					if (te(d, o)) {
						t.meet = d;
						const u = d.getBoundingClientRect();
						n.clientX < u.x ? t.insertType = "before" : t.insertType = "in";
					} else t.insertType = null, t.meet = null;
				}
				t.meet && Ae(t.meet, t.insertType);
				return;
			}
			const c = document.elementFromPoint(n.clientX, n.clientY - a);
			if (te(c, o)) {
				t.meet = c;
				const h = c.getBoundingClientRect(), d = h.y;
				n.clientY > d + h.height ? t.insertType = "after" : t.insertType = "in";
			} else {
				const h = document.elementFromPoint(n.clientX, n.clientY + a);
				if (te(h, o)) {
					t.meet = h;
					const u = h.getBoundingClientRect().y;
					n.clientY < u ? t.insertType = "before" : t.insertType = "in";
				} else t.insertType = null, t.meet = null;
			}
			t.meet && Ae(t.meet, t.insertType);
		}
		function Mt(e, t, n) {
			const { dragged: o } = e;
			if (!(!o || t.pointerId !== n.pointerId)) {
				t.edgeMoveController.stop();
				for (const s of o) s.parentElement.parentElement.style.opacity = "1";
				t.ghost.style.display = "none", t.ghost.innerHTML = "", t.isDragging && t.meet && (de(t.meet), t.insertType === "before" ? e.moveNodeBefore(o, t.meet) : t.insertType === "after" ? e.moveNodeAfter(o, t.meet) : t.insertType === "in" && e.moveNodeIn(o, t.meet)), e.dragged = null, t.isDragging = !1, t.insertType = null, t.meet = null, t.pointerId = null;
			}
		}
		function Oe(e, t) {
			const { dragged: n } = e;
			if (n) {
				t.edgeMoveController.stop();
				for (const o of n) o.parentElement.parentElement.style.opacity = "1";
				t.meet && de(t.meet), t.ghost.style.display = "none", t.ghost.innerHTML = "", e.dragged = null, t.isDragging = !1, t.insertType = null, t.meet = null, t.pointerId = null;
			}
		}
		function _t(e) {
			return () => {};
		}
		const L = {
			LHS: "lhs",
			RHS: "rhs",
			DOWN: "down"
		};
		const Lt = function() {
			this.nodes.innerHTML = "", this.nodes.className = this.direction === 3 ? "down" : "";
			const e = this.createTopic(this.nodeData);
			Se.call(this, e, this.nodeData), e.draggable = !1;
			const t = document.createElement("me-root");
			t.appendChild(e);
			const n = this.nodeData.children || [];
			if (this.direction === 2) {
				let o = 0, s = 0;
				n.map((i) => {
					i.direction === 0 ? o += 1 : i.direction === 1 ? s += 1 : o <= s ? (i.direction = 0, o += 1) : (i.direction = 1, s += 1);
				});
			}
			kt(this, n, t);
		};
		const kt = function(e, t, n) {
			if (e.direction === 3) {
				const i = document.createElement("me-main");
				i.className = L.DOWN;
				for (let r = 0; r < t.length; r++) {
					const { grp: l } = e.createWrapper(t[r]);
					i.appendChild(l);
				}
				e.nodes.appendChild(n), e.nodes.appendChild(i), e.nodes.appendChild(e.lines), e.nodes.appendChild(e.labelContainer);
				return;
			}
			const o = document.createElement("me-main");
			o.className = L.LHS;
			const s = document.createElement("me-main");
			s.className = L.RHS;
			for (let i = 0; i < t.length; i++) {
				const r = t[i], { grp: l } = e.createWrapper(r);
				e.direction === 2 ? r.direction === 0 ? o.appendChild(l) : s.appendChild(l) : e.direction === 0 ? o.appendChild(l) : s.appendChild(l);
			}
			e.nodes.appendChild(o), e.nodes.appendChild(n), e.nodes.appendChild(s), e.nodes.appendChild(e.lines), e.nodes.appendChild(e.labelContainer);
		};
		const At = function(e, t) {
			const n = document.createElement("me-children");
			for (let o = 0; o < t.length; o++) {
				const s = t[o], { grp: i } = e.createWrapper(s);
				n.appendChild(i);
			}
			return n;
		};
		const Je = function(e, t) {
			const o = (this?.el ? this.el : t || document).querySelector(`[data-nodeid="me${e}"]`);
			if (!o) throw new Error(`FindEle: Node ${e} not found, maybe it's collapsed.`);
			return o;
		};
		const Se = function(e, t) {
			if (e.innerHTML = "", t.style) {
				const n = t.style;
				for (const o in n) e.style[o] = n[o];
			}
			if (t.dangerouslySetInnerHTML) {
				e.innerHTML = t.dangerouslySetInnerHTML;
				return;
			}
			if (t.image) {
				const n = t.image;
				if (n.url && n.width && n.height) {
					const o = document.createElement("img");
					o.src = this.imageProxy ? this.imageProxy(n.url) : n.url, o.style.width = n.width + "px", o.style.height = n.height + "px", n.fit && (o.style.objectFit = n.fit), e.appendChild(o), e.image = o;
				}
			} else e.image && (e.image = void 0);
			{
				const n = document.createElement("span");
				n.className = "text", this.markdown ? n.innerHTML = this.markdown(t.topic, t) : n.textContent = t.topic, e.appendChild(n), e.text = n;
			}
			if (t.hyperLink) {
				const n = document.createElement("a");
				n.className = "hyper-link", n.target = "_blank", n.innerText = "🔗", n.href = t.hyperLink, e.appendChild(n), e.link = n;
			} else e.link && (e.link = void 0);
			if (t.icons && t.icons.length) {
				const n = document.createElement("span");
				n.className = "icons", n.innerHTML = t.icons.map((o) => `<span>${be(o)}</span>`).join(""), e.appendChild(n), e.icons = n;
			} else e.icons && (e.icons = void 0);
			if (t.tags && t.tags.length) {
				const n = document.createElement("div");
				n.className = "tags", t.tags.forEach((o) => {
					const s = document.createElement("span");
					typeof o == "string" ? s.textContent = o : (s.textContent = o.text, o.className && (s.className = o.className), o.style && Object.assign(s.style, o.style)), n.appendChild(s);
				}), e.appendChild(n), e.tags = n;
			} else e.tags && (e.tags = void 0);
		};
		const Pt = function(e, t) {
			const n = document.createElement("me-wrapper"), { p: o, tpc: s } = this.createParent(e);
			if (n.appendChild(o), !t && e.children && e.children.length > 0) {
				const i = Ne(e.expanded);
				if (o.appendChild(i), e.expanded !== !1) {
					const r = At(this, e.children);
					n.appendChild(r);
				}
			}
			return {
				grp: n,
				top: o,
				tpc: s
			};
		};
		const Ot = function(e) {
			const t = document.createElement("me-parent"), n = this.createTopic(e);
			return Se.call(this, n, e), t.appendChild(n), {
				p: t,
				tpc: n
			};
		};
		const $t = function(e) {
			const t = document.createElement("me-children");
			return t.append(...e), t;
		};
		const Ht = function(e) {
			const t = document.createElement("me-tpc");
			return t.nodeObj = e, t.dataset.nodeid = "me" + e.id, t;
		};
		function Ze(e) {
			const t = document.createRange();
			t.selectNodeContents(e);
			const n = window.getSelection();
			n && (n.removeAllRanges(), n.addRange(t));
		}
		const It = function(e) {
			if (!e) return;
			const t = document.createElement("div"), n = e.nodeObj, o = n.topic, { offsetLeft: s, offsetTop: i } = $(this.nodes, e);
			this.nodes.appendChild(t), t.id = "input-box", t.textContent = o, t.contentEditable = "plaintext-only", t.spellcheck = !1;
			const r = getComputedStyle(e);
			t.style.cssText = `
  left: ${s}px;
  top: ${i}px;
  min-width:${e.offsetWidth - 8}px;
  color:${r.color};
  font-size:${r.fontSize};
  padding:${r.padding};
  margin:${r.margin}; 
  background-color:${r.backgroundColor !== "rgba(0, 0, 0, 0)" && r.backgroundColor};
  border: ${r.border};
  border-radius:${r.borderRadius}; `, this.direction === 0 && (t.style.right = "0"), e.style.opacity = "0", Ze(t), this.bus.fire("operation", {
				name: "beginEdit",
				obj: e.nodeObj
			}), t.addEventListener("keydown", (l) => {
				if (l.stopPropagation(), l.isComposing) return;
				const a = l.key;
				if (a === "Enter" || a === "Tab") {
					if (l.shiftKey) return;
					l.preventDefault(), t.blur(), this.container.focus();
				} else a === "Escape" && (l.preventDefault(), t.textContent = o, t.blur(), this.container.focus());
			}), t.addEventListener("blur", () => {
				if (!t) return;
				e.style.opacity = "1";
				const l = t.innerText?.trim() || "";
				t.remove(), l !== o && l !== "" && (n.topic = l, this.markdown ? e.text.innerHTML = this.markdown(n.topic, n) : e.text.textContent = l, this.linkDiv(), this.bus.fire("operation", {
					name: "finishEdit",
					obj: n,
					origin: o
				}));
			});
		};
		const Ne = function(e) {
			const t = document.createElement("me-epd");
			return t.expanded = e !== !1, t.className = e !== !1 ? "minus" : "", t;
		};
		const he = (e) => {
			const t = e.parent?.children;
			return {
				siblings: t,
				index: t?.indexOf(e) ?? 0
			};
		};
		function Qe(e) {
			const { siblings: t, index: n } = he(e);
			return t === void 0 ? 0 : (t.splice(n, 1), t.length);
		}
		function jt(e, t, n) {
			const { siblings: o, index: s } = he(n);
			o !== void 0 && (t === "before" ? o.splice(s, 0, e) : o.splice(s + 1, 0, e));
		}
		function Rt(e, t) {
			const { siblings: n, index: o } = he(e);
			n !== void 0 && (n[o] = t, t.children = [e]);
		}
		function Bt(e, t, n) {
			if (Qe(t), n.parent?.parent || (t.direction = n.direction), e === "in") n.children ? n.children.push(t) : n.children = [t];
			else {
				t.direction !== void 0 && (t.direction = n.direction);
				const { siblings: o, index: s } = he(n);
				if (o === void 0) return;
				e === "before" ? o.splice(s, 0, t) : o.splice(s + 1, 0, t);
			}
		}
		const Wt = function({ map: e, direction: t }, n) {
			if (t === 0) return 0;
			if (t === 1) return 1;
			if (t === 3) return 3;
			if (t === 2) return (e.querySelector(".lhs")?.childElementCount || 0) <= (e.querySelector(".rhs")?.childElementCount || 0) ? (n.direction = 0, 0) : (n.direction = 1, 1);
		};
		const et = function(e, t, n) {
			const o = n.children[0].children[0], s = t.parentElement;
			if (s.tagName === "ME-PARENT") {
				if (J(o), s.children[1]) s.nextSibling.appendChild(n);
				else {
					const i = e.createChildren([n]);
					s.appendChild(Ne(!0)), s.insertAdjacentElement("afterend", i);
				}
				e.linkDiv(n.offsetParent);
			} else if (s.tagName === "ME-ROOT") {
				const i = Wt(e, o.nodeObj);
				i === 3 ? e.container.querySelector("me-main.down")?.appendChild(n) : i === 0 ? e.container.querySelector(".lhs")?.appendChild(n) : e.container.querySelector(".rhs")?.appendChild(n), e.linkDiv();
			}
		};
		const Yt = function(e, t) {
			const n = e.parentNode;
			if (t === 0) {
				const o = n.parentNode.parentNode;
				o.tagName !== "ME-MAIN" && (o.previousSibling.children[1].remove(), o.remove());
			}
			n.parentNode.remove();
		};
		const tt = {
			before: "beforebegin",
			after: "afterend"
		};
		const J = function(e) {
			const n = e.parentElement.parentElement.lastElementChild;
			n?.tagName === "svg" && n?.remove();
		};
		const Xt = function(e, t) {
			const n = e.nodeObj, o = G(n);
			o.style && t.style && (t.style = Object.assign(o.style, t.style));
			const s = Object.assign(n, t);
			Se.call(this, e, s), this.linkDiv(), this.bus.fire("operation", {
				name: "reshapeNode",
				obj: s,
				origin: o
			});
		};
		const Te = function(e, t, n) {
			if (!t) return null;
			const o = t.nodeObj;
			o.expanded === !1 && (e.expandNode(t, !0), t = e.findEle(o.id));
			const s = n || e.generateNewObj();
			o.children ? o.children.push(s) : o.children = [s], Y(e.nodeData);
			const { grp: i, top: r } = e.createWrapper(s);
			return et(e, t, i), {
				newTop: r,
				newNodeObj: s
			};
		};
		const Ft = function(e, t, n) {
			const o = t || this.currentNode;
			if (!o) return;
			const s = o.nodeObj;
			if (s.parent) {
				if (!s.parent?.parent && this.direction === 2) {
					const c = this.map.querySelector(".lhs")?.childElementCount || 0, h = this.map.querySelector(".rhs")?.childElementCount || 0;
					if (!c || !h) {
						this.addChild(this.findEle(s.parent.id), n);
						return;
					}
				}
			} else {
				this.addChild();
				return;
			}
			const i = n || this.generateNewObj();
			if (!s.parent?.parent) i.direction = o.closest("me-main").className === L.LHS ? 0 : 1;
			jt(i, e, s), Y(this.nodeData);
			const r = o.parentElement, { grp: l, top: a } = this.createWrapper(i);
			r.parentElement.insertAdjacentElement(tt[e], l), this.linkDiv(l.offsetParent), n || this.editTopic(a.firstChild), this.bus.fire("operation", {
				name: "insertSibling",
				type: e,
				obj: i
			}), this.selectNode(a.firstChild, !0);
		};
		const Kt = function(e, t) {
			const n = e || this.currentNode;
			if (!n) return;
			J(n);
			const o = n.nodeObj;
			if (!o.parent) return;
			const s = t || this.generateNewObj();
			if (!o.parent?.parent) s.direction = n.closest("me-main").className === L.LHS ? 0 : 1;
			Rt(o, s), Y(this.nodeData);
			const i = n.parentElement.parentElement, { grp: r, top: l } = this.createWrapper(s, !0);
			l.appendChild(Ne(!0)), i.insertAdjacentElement("afterend", r);
			const a = this.createChildren([i]);
			l.insertAdjacentElement("afterend", a), this.linkDiv(), t || this.editTopic(l.firstChild), this.bus.fire("operation", {
				name: "insertParent",
				obj: s
			}), this.selectNode(l.firstChild, !0);
		};
		const Vt = function(e, t) {
			const n = e || this.currentNode;
			if (!n) return;
			const o = Te(this, n, t);
			if (!o) return;
			const { newTop: s, newNodeObj: i } = o;
			this.bus.fire("operation", {
				name: "addChild",
				obj: i
			}), t || this.editTopic(s.firstChild), this.selectNode(s.firstChild, !0);
		};
		const zt = function(e, t) {
			const n = G(e.nodeObj);
			we(n);
			const o = Te(this, t, n);
			if (!o) return;
			const { newNodeObj: s } = o;
			this.bus.fire("operation", {
				name: "copyNode",
				obj: s
			}), this.selectNode(this.findEle(s.id));
		};
		const Gt = function(e, t) {
			const n = [];
			for (let o = 0; o < e.length; o++) {
				const s = e[o], i = G(s.nodeObj);
				we(i);
				const r = Te(this, t, i);
				if (!r) return;
				const { newNodeObj: l } = r;
				n.push(l);
			}
			this.bus.fire("operation", {
				name: "copyNodes",
				objs: n
			}), this.unselectNodes(this.currentNodes), this.selectNodes(n.map((o) => this.findEle(o.id)));
		};
		const nt = function(e, t, n) {
			const o = t.parent?.children;
			if (o === void 0) return;
			const s = e.direction === 2 && !t.parent?.parent, i = (a) => !s || a.direction === t.direction;
			let r, l = !1;
			for (const a of o) if (i(a)) {
				if (a === t) {
					if (n === -1) return r ? {
						to: r,
						type: "before"
					} : void 0;
					l = !0;
					continue;
				}
				if (l) return {
					to: a,
					type: "after"
				};
				r = a;
			}
		};
		const qt = function(e) {
			const t = e || this.currentNode;
			if (!t) return;
			const n = t.nodeObj;
			if (!n.parent) return;
			const o = nt(this, n, -1);
			o && Z([t], o.type, this.findEle(o.to.id), this);
		};
		const Ut = function(e) {
			const t = e || this.currentNode;
			if (!t) return;
			const n = t.nodeObj;
			if (!n.parent) return;
			const o = nt(this, n, 1);
			o && Z([t], o.type, this.findEle(o.to.id), this);
		};
		const Jt = function(e) {
			if (e = Ee(e), e.length === 0) return;
			for (const n of e) {
				const o = n.nodeObj, s = Qe(o);
				Yt(n, s);
			}
			const t = e[e.length - 1];
			this.selectNode(this.findEle(t.nodeObj.parent.id)), this.linkDiv(), this.bus.fire("operation", {
				name: "removeNodes",
				objs: e.map((n) => n.nodeObj)
			});
		};
		const Z = (e, t, n, o) => {
			e = Ee(e);
			let s = n.nodeObj;
			t === "in" && s.expanded === !1 && (o.expandNode(n, !0), n = o.findEle(s.id), s = n.nodeObj), t === "after" && (e = e.reverse());
			const i = /* @__PURE__ */ new Set();
			for (const l of e) {
				const a = l.nodeObj;
				if (Bt(t, a, s), Y(o.nodeData), t === "in") {
					const h = l.parentElement.parentElement, d = h.parentElement;
					et(o, n, h), i.add(d);
				} else {
					J(l);
					const c = l.parentElement.parentNode;
					i.add(c.parentElement), n.parentElement.parentNode.insertAdjacentElement(tt[t], c);
				}
			}
			for (const l of i) l.childElementCount === 0 && l.tagName !== "ME-MAIN" && (l.previousSibling.children[1].remove(), l.remove());
			o.linkDiv(), o.scrollIntoView(e[e.length - 1]);
			const r = t === "before" ? "moveNodeBefore" : t === "after" ? "moveNodeAfter" : "moveNodeIn";
			o.bus.fire("operation", {
				name: r,
				objs: e.map((l) => l.nodeObj),
				toObj: s
			});
		};
		const Zt = function(e, t) {
			Z(e, "in", t, this);
		};
		const Qt = function(e, t) {
			Z(e, "before", t, this);
		};
		const en = function(e, t) {
			Z(e, "after", t, this);
		};
		const tn = function(e) {
			const t = e || this.currentNode;
			t && (t.nodeObj.dangerouslySetInnerHTML || this.editTopic(t));
		};
		const nn = function(e, t) {
			e.text.textContent = t, e.nodeObj.topic = t, this.linkDiv();
		};
		const ot = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
			__proto__: null,
			addChild: Vt,
			beginEdit: tn,
			copyNode: zt,
			copyNodes: Gt,
			insertParent: Kt,
			insertSibling: Ft,
			moveDownNode: Ut,
			moveNodeAfter: en,
			moveNodeBefore: Qt,
			moveNodeIn: Zt,
			moveUpNode: qt,
			removeNodes: Jt,
			reshapeNode: Xt,
			rmSubline: J,
			setNodeTopic: nn
		}, Symbol.toStringTag, { value: "Module" }));
		function on(e) {
			return {
				nodeData: e.isFocusMode ? e.nodeDataBackup : e.nodeData,
				arrows: e.arrows,
				summaries: e.summaries,
				direction: e.direction,
				theme: e.theme,
				compact: e.compact,
				meta: e.meta
			};
		}
		const sn = function(e, t = !1) {
			const n = this.container, o = e.getBoundingClientRect(), s = n.getBoundingClientRect();
			if (t || o.top > s.bottom - 50 || o.bottom < s.top + 50 || o.left > s.right - 50 || o.right < s.left + 50) {
				const r = o.left + o.width / 2, l = o.top + o.height / 2, a = s.left + s.width / 2, c = s.top + s.height / 2, h = r - a, d = l - c;
				this.move(-h, -d, !0);
			}
		};
		const rn = function(e, t, n) {
			this.clearSelection(), this.scrollIntoView(e), this.selection?.select(e), t && this.bus.fire("selectNewNode", e.nodeObj);
		};
		const ln = function(e) {
			this.selection?.select(e);
		};
		const cn = function(e) {
			this.selection?.deselect(e);
		};
		const an = function() {
			this.unselectNodes(this.currentNodes), this.unselectSummary(), this.unselectArrow();
		};
		const De = function(e) {
			return JSON.stringify(e, (t, n) => {
				if (!(t === "parent" && typeof n != "string")) return n;
			});
		};
		const dn = function() {
			const e = on(this);
			return De(e);
		};
		const hn = function() {
			return JSON.parse(this.getDataString());
		};
		const fn = function() {
			this.editable = !0;
		};
		const un = function() {
			this.editable = !1;
		};
		const pn = function(e, t = {
			x: 0,
			y: 0
		}) {
			if (e < this.scaleMin && e < this.scaleVal || e > this.scaleMax && e > this.scaleVal) return;
			const n = this.container.getBoundingClientRect(), o = t.x ? t.x - n.left - n.width / 2 : 0, s = t.y ? t.y - n.top - n.height / 2 : 0, { dx: i, dy: r } = Me(this), l = this.map.style.transform, { x: a, y: c } = Ce(l), h = a - i, d = c - r, u = this.scaleVal, p = (-o + h) * (1 - e / u), m = (-s + d) * (1 - e / u);
			this.map.style.transform = `translate3d(${a - p}px, ${c - m}px, 0) scale(${e})`, this.scaleVal = e, this.bus.fire("scale", e);
		};
		const gn = function() {
			const e = this.nodes.offsetHeight / this.container.offsetHeight, t = this.nodes.offsetWidth / this.container.offsetWidth, n = 1 / Math.max(1, Math.max(e, t));
			this.scaleVal = n;
			const { dx: o, dy: s } = Me(this, !0);
			this.map.style.transform = `translate3d(${o}px, ${s}px, 0) scale(${n})`, this.bus.fire("scale", n);
		};
		const mn = function(e, t, n = !1) {
			const { map: o, scaleVal: s, bus: i, container: r, nodes: l } = this;
			if (n && o.style.transition === "transform 0.3s") return !1;
			const a = o.style.transform;
			let { x: c, y: h } = Ce(a);
			const d = r.getBoundingClientRect(), u = l.getBoundingClientRect(), p = (d.left + d.right) / 2, m = (d.top + d.bottom) / 2;
			return e > 0 ? e = Math.min(e, Math.max(0, p - u.left)) : e < 0 && (e = Math.max(e, Math.min(0, p - u.right))), t > 0 ? t = Math.min(t, Math.max(0, m - u.top)) : t < 0 && (t = Math.max(t, Math.min(0, m - u.bottom))), e === 0 && t === 0 ? !1 : (c += e, h += t, n && (o.style.transition = "transform 0.3s", setTimeout(() => {
				o.style.transition = "none";
			}, 300)), o.style.transform = `translate3d(${c}px, ${h}px, 0) scale(${s})`, i.fire("move", {
				dx: e,
				dy: t
			}), !0);
		};
		const Me = (e, t = !1) => {
			const { container: n, map: o, nodes: s } = e;
			let i, r;
			if (e.alignment === "nodes" || t || e.direction === 3) i = (n.offsetWidth - s.offsetWidth) / 2, r = (n.offsetHeight - s.offsetHeight) / 2, o.style.transformOrigin = "50% 50%";
			else {
				const l = o.querySelector("me-root"), a = l.offsetTop, c = l.offsetLeft, h = l.offsetWidth, d = l.offsetHeight;
				i = n.offsetWidth / 2 - c - h / 2, r = n.offsetHeight / 2 - a - d / 2, o.style.transformOrigin = `${c + h / 2}px 50%`;
			}
			return {
				dx: i,
				dy: r
			};
		};
		const yn = function() {
			const { map: e, container: t } = this, { dx: n, dy: o } = Me(this);
			t.scrollTop = 0, t.scrollLeft = 0, e.style.transform = `translate3d(${n}px, ${o}px, 0) scale(${this.scaleVal})`;
		};
		const bn = function(e) {
			e(this);
		};
		const vn = function(e) {
			e.nodeObj.parent && (this.clearSelection(), this.tempDirection === null && (this.tempDirection = this.direction), this.isFocusMode || (this.nodeDataBackup = this.nodeData, this.isFocusMode = !0), this.nodeData = e.nodeObj, this.initRight(), this.toCenter());
		};
		const xn = function() {
			this.isFocusMode = !1, this.tempDirection !== null && (this.nodeData = this.nodeDataBackup, this.direction = this.tempDirection, this.tempDirection = null, this.refresh(), this.toCenter());
		};
		const wn = function() {
			this.direction = 0, this.refresh(), this.toCenter(), this.bus.fire("changeDirection", this.direction);
		};
		const En = function() {
			this.direction = 1, this.refresh(), this.toCenter(), this.bus.fire("changeDirection", this.direction);
		};
		const Cn = function() {
			this.direction = 2, this.refresh(), this.toCenter(), this.bus.fire("changeDirection", this.direction);
		};
		const Sn = function() {
			this.direction = 3, this.refresh(), this.toCenter(), this.bus.fire("changeDirection", this.direction);
		};
		const Nn = function(e, t) {
			const n = e.nodeObj;
			typeof t == "boolean" ? n.expanded = t : n.expanded !== !1 ? n.expanded = !1 : n.expanded = !0;
			const o = e.getBoundingClientRect(), s = {
				x: o.left,
				y: o.top
			}, i = e.parentNode, r = i.children[1];
			if (r.expanded = n.expanded, r.className = n.expanded ? "minus" : "", J(e), n.expanded) {
				const d = this.createChildren(n.children.map((u) => this.createWrapper(u).grp));
				i.parentNode.appendChild(d);
			} else i.parentNode.children[1].remove();
			this.linkDiv(e.closest("me-main > me-wrapper"));
			const l = e.getBoundingClientRect(), a = {
				x: l.left,
				y: l.top
			}, c = s.x - a.x, h = s.y - a.y;
			this.move(c, h), this.bus.fire("expandNode", n);
		};
		const Tn = function(e, t) {
			const n = e.nodeObj, o = e.getBoundingClientRect(), s = {
				x: o.left,
				y: o.top
			};
			z(n, t ?? !n.expanded), this.refresh();
			const i = this.findEle(n.id).getBoundingClientRect(), r = {
				x: i.left,
				y: i.top
			}, l = s.x - r.x, a = s.y - r.y;
			this.move(l, a);
		};
		const Dn = function(e) {
			this.clearSelection(), e && (e = JSON.parse(JSON.stringify(e)), this.nodeData = e.nodeData, this.arrows = e.arrows || [], this.summaries = e.summaries || [], e.meta && (this.meta = e.meta)), Y(this.nodeData), this.layout(), this.linkDiv();
		};
		const Mn = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
			__proto__: null,
			cancelFocus: xn,
			clearSelection: an,
			disableEdit: un,
			enableEdit: fn,
			expandNode: Nn,
			expandNodeAll: Tn,
			focusNode: vn,
			getData: hn,
			getDataString: dn,
			initDown: Sn,
			initLeft: wn,
			initRight: En,
			initSide: Cn,
			install: bn,
			move: mn,
			refresh: Dn,
			scale: pn,
			scaleFit: gn,
			scrollIntoView: sn,
			selectNode: rn,
			selectNodes: ln,
			stringifyData: De,
			toCenter: yn,
			unselectNodes: cn
		}, Symbol.toStringTag, { value: "Module" }));
		const $e = "MIND-ELIXIR-WAIT-COPY";
		const _n = 40;
		const Ln = 10;
		const kn = ({ deltaMode: e, deltaY: t, viewportHeight: n }) => e === WheelEvent.DOM_DELTA_LINE ? t * _n : e === WheelEvent.DOM_DELTA_PAGE ? t * n : t;
		const An = ({ deltaMode: e, deltaY: t, scaleSensitivity: n, viewportHeight: o }) => {
			const i = -kn({
				deltaMode: e,
				deltaY: t,
				viewportHeight: o
			}) / Ln * n;
			return Math.max(-n, Math.min(n, i));
		};
		const st = (e, t, n) => {
			t !== 0 && e.scale(e.scaleVal + t, n);
		};
		const Pn = (e, t) => {
			const n = e.map.querySelectorAll(`.${t}>me-wrapper>me-parent>me-tpc`);
			n.length !== 0 && e.selectNode(n[Math.ceil(n.length / 2) - 1]);
		};
		const it = (e) => {
			e.selectNode(e.map.querySelector("me-root>me-tpc"));
		};
		const rt = function(e, t) {
			const n = t.parentElement.parentElement.parentElement.previousSibling;
			if (n) {
				const o = n.firstChild;
				e.selectNode(o);
			}
		};
		const lt = function(e, t) {
			const n = t.parentElement.nextSibling;
			if (n && n.firstChild) {
				const o = n.firstChild.firstChild.firstChild;
				e.selectNode(o);
			}
		};
		const He = function(e, t) {
			const n = e.currentNode || e.currentNodes?.[0];
			if (!n) return;
			const o = n.nodeObj, s = n.offsetParent.offsetParent.parentElement;
			o.parent ? s.className === t ? lt(e, n) : o.parent?.parent ? rt(e, n) : it(e) : Pn(e, t);
		};
		const ne = function(e, t) {
			const n = e.currentNode;
			if (!n || !n.nodeObj.parent) return;
			const s = t + "Sibling", i = n.parentElement.parentElement[s];
			i ? e.selectNode(i.firstChild.firstChild) : e.selectNode(n);
		};
		const On = function(e, t) {
			const n = t.nodeObj;
			n.parent && (n.parent.parent ? rt(e, t) : it(e));
		};
		const $n = function(e, t) {
			if (t.nodeObj.parent) lt(e, t);
			else {
				const o = e.map.querySelectorAll(".down>me-wrapper>me-parent>me-tpc");
				if (o.length === 0) return;
				e.selectNode(o[Math.ceil(o.length / 2) - 1]);
			}
		};
		const Ie = function(e, t, n) {
			const o = t === "in" ? e.scaleSensitivity : -e.scaleSensitivity;
			st(e, o, n);
		};
		const Hn = (e, t) => {
			const n = An({
				deltaMode: t.deltaMode,
				deltaY: t.deltaY,
				scaleSensitivity: e.scaleSensitivity,
				viewportHeight: e.container.clientHeight || window.innerHeight
			});
			st(e, n, {
				x: t.clientX,
				y: t.clientY
			});
		};
		function In(e, t) {
			t = t === !0 ? {} : t;
			const n = () => {
				e.currentArrow ? e.removeArrow() : e.currentSummary ? e.removeSummary(e.currentSummary.summaryObj.id) : e.currentNodes && e.removeNodes(e.currentNodes);
			};
			let o = !1, s = null;
			const i = () => {
				o = !1, s && (clearTimeout(s), s = null), e.container.removeEventListener("keydown", r);
			}, r = (c) => {
				if ([
					"Control",
					"Meta",
					"Shift",
					"Alt"
				].includes(c.key)) return;
				const h = e.nodeData;
				if (!h.children?.length) {
					i();
					return;
				}
				let d = !0;
				if (c.key === "0") for (const u of h.children) z(u, !1);
				else if (c.key === "=") for (const u of h.children) z(u, !0);
				else if ([
					"1",
					"2",
					"3",
					"4",
					"5",
					"6",
					"7",
					"8",
					"9"
				].includes(c.key)) for (const u of h.children) z(u, !0, Number(c.key) - 1);
				else d = !1;
				d && (e.refresh(), e.toCenter()), i();
			}, l = {
				Enter: (c) => {
					c.shiftKey ? e.insertSibling("before") : c.ctrlKey || c.metaKey ? e.insertParent() : e.insertSibling("after");
				},
				Tab: () => {
					e.addChild();
				},
				F1: () => {
					e.toCenter();
				},
				F2: () => {
					e.currentSummary ? e.editSummary(e.currentSummary) : e.currentArrow ? e.editArrowLabel(e.currentArrow) : e.beginEdit();
				},
				ArrowUp: (c) => {
					if (c.altKey) e.moveUpNode();
					else {
						if (c.metaKey || c.ctrlKey) return e.initSide();
						if (e.direction === 3) {
							const h = e.currentNode || e.currentNodes?.[0];
							h && On(e, h);
						} else ne(e, "previous");
					}
				},
				ArrowDown: (c) => {
					if (c.altKey) e.moveDownNode();
					else if (e.direction === 3) {
						const h = e.currentNode || e.currentNodes?.[0];
						h && $n(e, h);
					} else ne(e, "next");
				},
				ArrowLeft: (c) => {
					if (c.metaKey || c.ctrlKey) return e.initLeft();
					e.direction === 3 ? ne(e, "previous") : He(e, L.LHS);
				},
				ArrowRight: (c) => {
					if (c.metaKey || c.ctrlKey) return e.initRight();
					e.direction === 3 ? ne(e, "next") : He(e, L.RHS);
				},
				PageUp: () => e.moveUpNode(),
				PageDown: () => {
					e.moveDownNode();
				},
				"=": (c) => {
					(c.metaKey || c.ctrlKey) && Ie(e, "in");
				},
				"-": (c) => {
					(c.metaKey || c.ctrlKey) && Ie(e, "out");
				},
				0: (c) => {
					if (c.metaKey || c.ctrlKey) {
						if (o) return;
						e.scale(1);
					}
				},
				k: (c) => {
					(c.metaKey || c.ctrlKey) && (i(), o = !0, s = window.setTimeout(() => {
						s = null, i();
					}, 2e3), e.container.addEventListener("keydown", r));
				},
				Delete: n,
				Backspace: n,
				...t
			};
			e.container.onkeydown = (c) => {
				if ((c.ctrlKey || c.metaKey) && [
					"c",
					"v",
					"x"
				].includes(c.key) || c.preventDefault(), !e.editable) return;
				const d = l[c.key];
				d && d(c);
			};
			const a = (c) => {
				if (c.target instanceof HTMLElement && c.target.id === "input-box" || e.currentNodes.length === 0) return !1;
				if (c.clipboardData) {
					const h = Ee(e.currentNodes).map((u) => u.nodeObj), d = De({
						magic: $e,
						data: h
					});
					return c.clipboardData.setData("text/plain", d), c.preventDefault(), !0;
				}
				return !1;
			};
			e.container.addEventListener("copy", a), e.container.addEventListener("cut", (c) => {
				a(c) && n();
			}), e.container.addEventListener("paste", (c) => {
				const h = c.clipboardData?.getData("text/plain");
				if (h) try {
					const d = JSON.parse(h);
					if (d && d.magic === $e && Array.isArray(d.data)) {
						const u = d.data, p = u.map((m) => ({ nodeObj: m }));
						u.length > 0 && e.currentNode && (e.copyNodes(p, e.currentNode), c.preventDefault());
						return;
					}
				} catch {}
				e.pasteHandler && e.pasteHandler(c);
			});
		}
		function jn(e) {
			const { panHelper: t, container: n } = e;
			let o = null;
			e.spacePressed = !1;
			const s = {
				lastTap: 0,
				lastTapTarget: null,
				DOUBLE_CLICK_THRESHOLD: 300,
				detect(f, b) {
					if (f.button !== 0) {
						this.clear();
						return;
					}
					const w = (/* @__PURE__ */ new Date()).getTime(), E = w - this.lastTap, S = E < this.DOUBLE_CLICK_THRESHOLD && E > 0 && this.lastTapTarget === f.target;
					this.lastTap = w, this.lastTapTarget = f.target, S && b(f);
				},
				clear() {
					this.lastTap = 0, this.lastTapTarget = null;
				}
			}, i = {
				Idle: 0,
				Pinch: 1,
				DragWait: 2,
				Drag: 3,
				Pan: 4,
				BoxSelect: 5
			};
			e.ptState = i.Idle;
			const r = {
				lastDistance: null,
				activePointers: /* @__PURE__ */ new Map(),
				handlePointerDown(f) {
					if (f.pointerType !== "touch") return !1;
					if (this.activePointers.set(f.pointerId, {
						x: f.clientX,
						y: f.clientY
					}), this.activePointers.size >= 2) {
						const [b, w] = Array.from(this.activePointers.values());
						return this.lastDistance = ke(b, w), !0;
					}
					return !1;
				},
				handlePointerMove(f) {
					if (f.pointerType !== "touch" || !this.activePointers.has(f.pointerId)) return !1;
					if (this.activePointers.set(f.pointerId, {
						x: f.clientX,
						y: f.clientY
					}), this.activePointers.size >= 2) {
						const [b, w] = Array.from(this.activePointers.values()), E = ke(b, w);
						if (this.lastDistance !== null && this.lastDistance > 0) {
							const S = E / this.lastDistance;
							e.scale(e.scaleVal * S, {
								x: (b.x + w.x) / 2,
								y: (b.y + w.y) / 2
							});
						}
						return this.lastDistance = E, !0;
					}
					return !1;
				},
				handlePointerUp(f) {
					f.pointerType === "touch" && (this.activePointers.delete(f.pointerId), this.activePointers.size < 2 && (this.lastDistance = null));
				},
				clear() {
					this.activePointers.clear(), this.lastDistance = null;
				}
			}, l = Nt(e), a = {
				timer: null,
				startPos: null,
				pointerId: null,
				DURATION: 500,
				MOVE_THRESHOLD: 10,
				clear() {
					this.timer !== null && (clearTimeout(this.timer), this.timer = null, this.startPos = null, this.pointerId = null);
				},
				start(f, b) {
					this.timer = window.setTimeout(() => {
						b(f), this.timer = null, this.startPos = null, this.pointerId = null;
					}, this.DURATION), this.startPos = {
						x: f.clientX,
						y: f.clientY
					}, this.pointerId = f.pointerId;
				},
				handleMove(f) {
					if (this.timer !== null && this.startPos !== null && f.pointerId === this.pointerId) {
						const b = f.clientX - this.startPos.x, w = f.clientY - this.startPos.y;
						Math.sqrt(b * b + w * w) > this.MOVE_THRESHOLD && this.clear();
					}
				}
			}, c = (f, b) => {
				if (f.closest("#input-box")) return !1;
				const w = f.closest(".svg-label"), E = f.closest(".topiclinks, .summary"), S = w ? {
					type: w.dataset.type,
					element: document.getElementById(w.dataset.svgId)
				} : E ? {
					type: E.classList.contains("topiclinks") ? "arrow" : "summary",
					element: f.closest("g")
				} : null;
				if (!S?.type || !S?.element) return !1;
				const { type: M, element: N } = S;
				return e.clearSelection(), M === "arrow" ? b ? e.editArrowLabel(N) : e.selectArrow(N) : b ? e.editSummary(N) : e.selectSummary(N), !0;
			}, h = (f) => {
				if (f.pointerType === "mouse" && f.button !== 0) return;
				if (e.helper1?.moved) {
					e.helper1.clear();
					return;
				}
				if (e.helper2?.moved) {
					e.helper2.clear();
					return;
				}
				if (t.moved) {
					t.clear();
					return;
				}
				if (l?.isDragging) return;
				const b = f.target;
				b.tagName === "ME-EPD" && (f.ctrlKey || f.metaKey ? e.expandNodeAll(b.previousSibling) : e.expandNode(b.previousSibling));
			}, d = (f) => {
				if (!e.editable) return;
				const b = f.target;
				if (re(b)) {
					e.selectNode(b), e.beginEdit(b);
					return;
				}
				c(b, !0);
			}, u = (f) => {
				if (f.pointerType === "touch" && r.handlePointerDown(f)) {
					e.ptState = i.Pinch, a.clear(), t.clear(), (l.isDragging || l.pointerId !== null) && Oe(e, l);
					return;
				}
				if (e.ptState === i.Pinch) return;
				const b = f.target;
				if (e.editable && b.className === "map-container" && f.button === 0 && f.pointerType === "mouse") {
					e.ptState = i.BoxSelect;
					return;
				}
				if (t.handlePointerDown(f), t.mousedown && (e.ptState = i.Pan), f.button === 0 || f.pointerType === "touch") if (re(b)) {
					e.selection?.cancel();
					const E = e.currentNodes || [];
					if (f.ctrlKey || f.metaKey || e.mobileMultiSelect ? E.includes(b) ? o = b : ((e.currentArrow || e.currentSummary) && e.clearSelection(), e.selection?.select(b)) : E.includes(b) || e.selectNode(b), !e.editable) return;
					f.pointerType === "touch" ? (e.ptState = i.DragWait, a.start(f, (M) => {
						Pe(e, l, M, !0) && (e.ptState = i.Drag, b.setPointerCapture(M.pointerId));
					})) : Pe(e, l, f, !1) && (e.ptState = i.Drag, b.setPointerCapture(f.pointerId));
				} else c(b, !1);
			}, p = (f) => {
				switch (e.ptState) {
					case i.Pinch:
						r.handlePointerMove(f);
						break;
					case i.DragWait:
						a.handleMove(f), a.timer === null && (e.ptState = i.Pan, t.handlePointerMove(f));
						break;
					case i.Drag:
						Dt(e, l, f);
						break;
					case i.Pan: t.handlePointerMove(f);
				}
			}, m = (f) => {
				f.preventDefault(), window.removeEventListener("contextmenu", m, !0);
			}, x = (f) => {
				f.pointerType === "touch" && r.handlePointerUp(f);
				const b = l.isDragging, w = t.moved;
				switch (e.ptState) {
					case i.DragWait:
						a.clear();
						break;
					case i.Drag:
						Mt(e, l, f);
						break;
					case i.Pan: t.handlePointerUp(f), t.moved && f.button === 2 && f.pointerType === "mouse" && (window.addEventListener("contextmenu", m, {
						capture: !0,
						once: !0
					}), setTimeout(() => window.removeEventListener("contextmenu", m, !0), 300));
				}
				s.detect(f, d), (e.ptState !== i.Pinch || r.activePointers.size < 2) && (e.ptState = i.Idle), o && (!b && !w && e.selection?.deselect(o), o = null);
			}, y = () => {
				r.clear(), a.clear(), t.clear(), s.clear(), (l.isDragging || l.pointerId !== null) && Oe(e, l), e.ptState = i.Idle, o = null;
			}, g = (f) => {
				f.preventDefault(), f.button === 2 && e.editable && setTimeout(() => {
					if (e.panHelper.moved || e.ptState !== i.Idle && e.ptState !== i.Pan) return;
					const b = f.target;
					re(b) && !b.classList.contains("selected") && e.selectNode(b), e.bus.fire("showContextMenu", f);
				}, 200);
			}, v = (f) => {
				if (f.ctrlKey || f.metaKey) return f.stopPropagation(), f.preventDefault(), Hn(e, f);
				(f.shiftKey ? e.move(-f.deltaY, 0) : e.move(-f.deltaX, -f.deltaY)) && (f.stopPropagation(), f.preventDefault());
			}, C = (f) => {
				f.code === "Space" && (e.spacePressed = !0, e.container.classList.add("space-pressed"));
			}, T = (f) => {
				f.code === "Space" && (e.spacePressed = !1, e.container.classList.remove("space-pressed"));
			};
			return Ge([
				{
					dom: n,
					evt: "pointerdown",
					func: u
				},
				{
					dom: n,
					evt: "pointermove",
					func: p
				},
				{
					dom: n,
					evt: "pointerup",
					func: x
				},
				{
					dom: n,
					evt: "pointercancel",
					func: y
				},
				{
					dom: n,
					evt: "click",
					func: h
				},
				{
					dom: n,
					evt: "contextmenu",
					func: g
				},
				{
					dom: n,
					evt: "wheel",
					func: typeof e.handleWheel == "function" ? e.handleWheel : v
				},
				{
					dom: n,
					evt: "blur",
					func: y
				},
				{
					dom: n,
					evt: "keydown",
					func: C
				},
				{
					dom: n,
					evt: "keyup",
					func: T
				}
			]);
		}
		function Rn() {
			return {
				handlers: {},
				addListener: function(e, t) {
					this.handlers[e] === void 0 && (this.handlers[e] = []), this.handlers[e].push(t);
				},
				fire: function(e, ...t) {
					if (this.handlers[e] instanceof Array) {
						const n = this.handlers[e];
						for (let o = 0; o < n.length; o++) n[o](...t);
					}
				},
				removeListener: function(e, t) {
					if (!this.handlers[e]) return;
					const n = this.handlers[e];
					if (!t) n.length = 0;
					else if (n.length) for (let o = 0; o < n.length; o++) n[o] === t && this.handlers[e].splice(o, 1);
				}
			};
		}
		const H = "http://www.w3.org/2000/svg";
		const fe = function(e) {
			const t = e.clientWidth, n = e.clientHeight, o = e.dataset, s = Number(o.x), i = Number(o.y), r = o.anchor;
			let l = s;
			r === "middle" ? l = s - t / 2 : r === "end" && (l = s - t), e.style.left = `${l}px`, e.style.top = `${i - n / 2}px`, e.style.visibility = "visible";
		};
		const le = function(e, t, n, o) {
			const { anchor: s = "middle", color: i, dataType: r, svgId: l } = o, a = document.createElement("div");
			a.className = "svg-label", a.style.color = i || "#666";
			return a.id = "label-" + l, a.innerHTML = e, a.dataset.type = r, a.dataset.svgId = l, a.dataset.x = t.toString(), a.dataset.y = n.toString(), a.dataset.anchor = s, a;
		};
		const ct = function(e, t, n) {
			const o = document.createElementNS(H, "path");
			return _(o, {
				d: e,
				stroke: t || "#666",
				fill: "none",
				"stroke-width": n
			}), o;
		};
		const U = function(e) {
			const t = document.createElementNS(H, "svg");
			return t.setAttribute("class", e), t.setAttribute("overflow", "visible"), t;
		};
		const je = function() {
			const e = document.createElementNS(H, "line");
			return e.setAttribute("stroke", "#4dc4ff"), e.setAttribute("fill", "none"), e.setAttribute("stroke-width", "2"), e.setAttribute("opacity", "0.45"), e;
		};
		const Bn = function(e, t, n, o) {
			const s = document.createElementNS(H, "g");
			return [
				{
					name: "line",
					d: e
				},
				{
					name: "arrow1",
					d: t
				},
				{
					name: "arrow2",
					d: n
				}
			].forEach((r, l) => {
				const a = r.d, c = document.createElementNS(H, "path"), h = {
					d: a,
					stroke: o?.stroke || "rgb(227, 125, 116)",
					fill: "none",
					"stroke-width": String(o?.strokeWidth || "2")
				};
				o?.opacity !== void 0 && (h.opacity = String(o.opacity)), _(c, h), l === 0 && c.setAttribute("stroke-dasharray", o?.strokeDasharray || "8,2");
				const d = document.createElementNS(H, "path");
				_(d, {
					d: a,
					stroke: "transparent",
					fill: "none",
					"stroke-width": "15"
				}), s.appendChild(d), s.appendChild(c), s[r.name] = c;
			}), s;
		};
		const at = function(e, t, n) {
			if (!t) return;
			const o = n.label;
			t.style.opacity = "0";
			const s = t.cloneNode(!0);
			e.nodes.appendChild(s), s.id = "input-box", s.textContent = o, s.contentEditable = "plaintext-only", s.spellcheck = !1, s.style.cssText = `
    left:${t.style.left};
    top:${t.style.top}; 
    max-width: 200px;
  `, Ze(s), e.scrollIntoView(s), s.addEventListener("keydown", (i) => {
				if (i.stopPropagation(), i.isComposing) return;
				const r = i.key;
				if (r === "Enter" || r === "Tab") {
					if (i.shiftKey) return;
					i.preventDefault(), s.blur(), e.container.focus();
				}
			}), s.addEventListener("blur", () => {
				if (!s) return;
				const i = s.innerText?.trim() || "";
				i === "" ? n.label = o : n.label = i, t.style.opacity = "1", s.remove(), i !== o && (e.markdown ? t.innerHTML = e.markdown(n.label, n) : t.textContent = n.label, fe(t), "parent" in n ? e.bus.fire("operation", {
					name: "finishEditSummary",
					obj: n
				}) : e.bus.fire("operation", {
					name: "finishEditArrowLabel",
					obj: n
				}));
			});
		};
		const Wn = function(e) {
			const t = this.map.querySelector("me-root"), n = t.offsetTop, o = t.offsetLeft, s = t.offsetWidth, i = t.offsetHeight, r = this.map.querySelectorAll("me-main > me-wrapper");
			this.lines.innerHTML = "";
			for (let l = 0; l < r.length; l++) {
				const a = r[l], c = a.querySelector("me-tpc"), { offsetLeft: h, offsetTop: d } = $(this.nodes, c), u = c.offsetWidth, p = c.offsetHeight, m = a.parentNode.className, x = this.generateMainBranch({
					pT: n,
					pL: o,
					pW: s,
					pH: i,
					cT: d,
					cL: h,
					cW: u,
					cH: p,
					direction: m,
					containerHeight: this.nodes.offsetHeight,
					containerWidth: this.nodes.offsetWidth
				}), y = this.theme.palette, g = c.nodeObj.branchColor || y[l % y.length];
				if (c.style.borderColor = g, this.lines.appendChild(ct(x, g, "3")), e && e !== a) continue;
				const v = U("subLines"), C = a.lastChild;
				C.tagName === "svg" && C.remove(), a.appendChild(v), dt(this, v, g, a, m, !0);
			}
			this.labelContainer.innerHTML = "", this.renderArrow(), this.renderSummary(), this.bus.fire("linkDiv");
		};
		const dt = function(e, t, n, o, s, i) {
			const r = o.firstChild, l = o.children[1].children;
			if (l.length === 0) return;
			const a = r.offsetTop, c = r.offsetLeft, h = r.offsetWidth, d = r.offsetHeight;
			for (let u = 0; u < l.length; u++) {
				const p = l[u], m = p.firstChild, x = m.offsetTop, y = m.offsetLeft, g = m.offsetWidth, v = m.offsetHeight, C = m.firstChild.nodeObj.branchColor || n, T = e.generateSubBranch({
					pT: a,
					pL: c,
					pW: h,
					pH: d,
					cT: x,
					cL: y,
					cW: g,
					cH: v,
					direction: s,
					isFirst: i
				});
				t.appendChild(ct(T, C, "2"));
				const D = m.children[1];
				if (D) {
					if (!D.expanded) continue;
				} else continue;
				dt(e, t, C, p, s);
			}
		};
		const Yn = {
			addChild: "Add child",
			addParent: "Add parent",
			addSibling: "Add sibling",
			removeNode: "Remove node",
			focus: "Focus Mode",
			cancelFocus: "Cancel Focus Mode",
			moveUp: "Move up",
			moveDown: "Move down",
			link: "Link",
			linkBidirectional: "Bidirectional Link",
			clickTips: "Please click the target node",
			summary: "Summary"
		};
		function Xn(e, t) {
			const n = {
				focus: !0,
				link: !0,
				locale: Yn
			};
			t = t === !0 ? n : Object.assign(n, t);
			const o = (f) => {
				const b = document.createElement("div");
				return b.innerText = f, b.className = "tips", b;
			}, s = (f, b, w) => {
				const E = document.createElement("li");
				return E.id = f, E.innerHTML = `<span>${be(b)}</span><span ${w ? "class=\"key\"" : ""}>${be(w)}</span>`, E;
			}, i = t.locale, r = s("cm-add_child", i.addChild, "Tab"), l = s("cm-add_parent", i.addParent, "Ctrl + Enter"), a = s("cm-add_sibling", i.addSibling, "Enter"), c = s("cm-remove_child", i.removeNode, "Delete"), h = s("cm-fucus", i.focus, ""), d = s("cm-unfucus", i.cancelFocus, ""), u = s("cm-up", i.moveUp, "PgUp"), p = s("cm-down", i.moveDown, "Pgdn"), m = s("cm-link", i.link, ""), x = s("cm-link-bidirectional", i.linkBidirectional, ""), y = s("cm-summary", i.summary, ""), g = document.createElement("ul");
			if (g.className = "menu-list", g.appendChild(r), g.appendChild(l), g.appendChild(a), g.appendChild(c), t.focus && (g.appendChild(h), g.appendChild(d)), g.appendChild(u), g.appendChild(p), g.appendChild(y), t.link && (g.appendChild(m), g.appendChild(x)), t && t.extend) for (let f = 0; f < t.extend.length; f++) {
				const b = t.extend[f], w = s(b.name, b.name, b.key || "");
				g.appendChild(w), w.onclick = (E) => {
					b.onclick(E);
				};
			}
			const v = document.createElement("div");
			v.className = "context-menu", v.appendChild(g), v.hidden = !0, e.container.append(v);
			let C = !0;
			const T = (f) => {
				const b = f.target;
				if (re(b)) {
					b.parentElement.tagName === "ME-ROOT" ? C = !0 : C = !1, C ? (h.className = "disabled", u.className = "disabled", p.className = "disabled", l.className = "disabled", a.className = "disabled", c.className = "disabled") : (h.className = "", u.className = "", p.className = "", l.className = "", a.className = "", c.className = ""), v.hidden = !1, g.style.top = "", g.style.bottom = "", g.style.left = "", g.style.right = "";
					const w = g.offsetHeight, E = g.offsetWidth, S = g.getBoundingClientRect(), M = f.clientY - S.top, N = f.clientX - S.left;
					w + M > window.innerHeight ? (g.style.top = "", g.style.bottom = "0px") : (g.style.bottom = "", g.style.top = M + 15 + "px"), E + N > window.innerWidth ? (g.style.left = "", g.style.right = "0px") : (g.style.right = "", g.style.left = N + 10 + "px");
				}
			};
			e.bus.addListener("showContextMenu", T), v.onclick = (f) => {
				f.target === v && (v.hidden = !0);
			}, r.onclick = () => {
				e.addChild(), v.hidden = !0;
			}, l.onclick = () => {
				e.insertParent(), v.hidden = !0;
			}, a.onclick = () => {
				C || (e.insertSibling("after"), v.hidden = !0);
			}, c.onclick = () => {
				C || (e.removeNodes(e.currentNodes || []), v.hidden = !0);
			}, h.onclick = () => {
				C || (e.focusNode(e.currentNode), v.hidden = !0);
			}, d.onclick = () => {
				e.cancelFocus(), v.hidden = !0;
			}, u.onclick = () => {
				C || (e.moveUpNode(), v.hidden = !0);
			}, p.onclick = () => {
				C || (e.moveDownNode(), v.hidden = !0);
			};
			const D = (f) => {
				v.hidden = !0;
				const b = e.currentNode, w = o(i.clickTips);
				e.container.appendChild(w), e.map.addEventListener("click", (E) => {
					E.preventDefault(), w.remove();
					const S = E.target;
					(S.parentElement.tagName === "ME-PARENT" || S.parentElement.tagName === "ME-ROOT") && e.createArrow(b, S, f);
				}, { once: !0 });
			};
			return m.onclick = () => D(), x.onclick = () => D({ bidirectional: !0 }), y.onclick = () => {
				v.hidden = !0, e.createSummary(), e.unselectNodes(e.currentNodes);
			}, () => {
				r.onclick = null, l.onclick = null, a.onclick = null, c.onclick = null, h.onclick = null, d.onclick = null, u.onclick = null, p.onclick = null, m.onclick = null, y.onclick = null, v.onclick = null, e.container.oncontextmenu = null;
			};
		}
		const Fn = function(e) {
			return [
				"createSummary",
				"removeSummary",
				"finishEditSummary"
			].includes(e.name) ? {
				type: "summary",
				value: e.obj.id
			} : [
				"createArrow",
				"removeArrow",
				"finishEditArrowLabel",
				"reshapeArrow"
			].includes(e.name) ? {
				type: "arrow",
				value: e.obj.id
			} : [
				"removeNodes",
				"copyNodes",
				"moveNodeBefore",
				"moveNodeAfter",
				"moveNodeIn"
			].includes(e.name) ? {
				type: "nodes",
				value: e.objs.map((t) => t.id)
			} : {
				type: "nodes",
				value: [e.obj.id]
			};
		};
		function Kn(e) {
			let t = [], n = -1, o = e.getData(), s = [];
			e.undo = function() {
				if (n > -1) {
					const a = t[n];
					o = a.prev, e.refresh(a.prev);
					try {
						a.currentTarget.type === "nodes" && (a.operation === "removeNodes" ? e.selectNodes(a.currentTarget.value.map((c) => this.findEle(c))) : e.selectNodes(a.currentSelected.map((c) => this.findEle(c))));
					} catch {} finally {
						n--;
					}
				}
			}, e.redo = function() {
				if (n < t.length - 1) {
					n++;
					const a = t[n];
					o = a.next, e.refresh(a.next);
					try {
						a.currentTarget.type === "nodes" && (a.operation === "removeNodes" ? e.selectNodes(a.currentSelected.map((c) => this.findEle(c))) : e.selectNodes(a.currentTarget.value.map((c) => this.findEle(c))));
					} catch {}
				}
			}, e.clearHistory = function() {
				t = [], n = -1, o = e.getData(), e.clearSelection();
			};
			const i = function(a) {
				if (a.name === "beginEdit") return;
				t = t.slice(0, n + 1);
				const c = e.getData(), h = {
					prev: o,
					operation: a.name,
					currentSelected: s.map((d) => d.id),
					currentTarget: Fn(a),
					next: c
				};
				t.push(h), o = c, n = t.length - 1;
			}, r = function(a) {
				if (!e.editable || !a.metaKey && !a.ctrlKey) return;
				const c = a.key.toLowerCase();
				c === "z" ? a.shiftKey ? e.redo() : e.undo() : c === "y" && e.redo();
			}, l = function() {
				s = e.currentNodes.map((a) => a.nodeObj);
			};
			return e.bus.addListener("operation", i), e.bus.addListener("selectNodes", l), e.bus.addListener("unselectNodes", l), e.container.addEventListener("keydown", r), () => {
				e.bus.removeListener("operation", i), e.bus.removeListener("selectNodes", l), e.bus.removeListener("unselectNodes", l), e.container.removeEventListener("keydown", r);
			};
		}
		const Qn = {
			side: "<?xml version=\"1.0\" standalone=\"no\"?><!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\"><svg t=\"1750169394918\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"2021\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"200\" height=\"200\"><path d=\"M851.91168 328.45312c-59.97056 0-108.6208 48.47104-108.91264 108.36992l-137.92768 38.4a109.14304 109.14304 0 0 0-63.46752-46.58688l1.39264-137.11872c47.29344-11.86816 82.31936-54.66624 82.31936-105.64096 0-60.15488-48.76288-108.91776-108.91776-108.91776s-108.91776 48.76288-108.91776 108.91776c0 49.18784 32.60928 90.75712 77.38368 104.27392l-1.41312 138.87488a109.19936 109.19936 0 0 0-63.50336 48.55808l-138.93632-39.48544 0.01024-0.72704c0-60.15488-48.76288-108.91776-108.91776-108.91776s-108.91776 48.75776-108.91776 108.91776c0 60.15488 48.76288 108.91264 108.91776 108.91264 39.3984 0 73.91232-20.92032 93.03552-52.2496l139.19232 39.552-0.00512 0.2304c0 25.8304 9.00096 49.5616 24.02816 68.23424l-90.14272 132.63872a108.7488 108.7488 0 0 0-34.2528-5.504c-60.15488 0-108.91776 48.768-108.91776 108.91776 0 60.16 48.76288 108.91776 108.91776 108.91776 60.16 0 108.92288-48.75776 108.92288-108.91776 0-27.14624-9.9328-51.968-26.36288-71.04l89.04704-131.03104a108.544 108.544 0 0 0 37.6832 6.70208 108.672 108.672 0 0 0 36.48512-6.272l93.13792 132.57216a108.48256 108.48256 0 0 0-24.69888 69.0688c0 60.16 48.768 108.92288 108.91776 108.92288 60.16 0 108.91776-48.76288 108.91776-108.92288 0-60.14976-48.75776-108.91776-108.91776-108.91776a108.80512 108.80512 0 0 0-36.69504 6.3488l-93.07136-132.48a108.48768 108.48768 0 0 0 24.79616-72.22784l136.09984-37.888c18.99008 31.93856 53.84192 53.3504 93.69088 53.3504 60.16 0 108.92288-48.75776 108.92288-108.91264-0.00512-60.15488-48.77312-108.92288-108.92288-108.92288z\" p-id=\"2022\"></path></svg>",
			left: "<?xml version=\"1.0\" standalone=\"no\"?><!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\"><svg t=\"1750169375313\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"1775\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"200\" height=\"200\"><path d=\"M639 463.30000001L639 285.1c0-36.90000001-26.4-68.5-61.3-68.5l-150.2 0c-1.5 0-3 0.1-4.5 0.3-10.2-38.7-45.5-67.3-87.5-67.3-50 0-90.5 40.5-90.5 90.5s40.5 90.5 90.5 90.5c42 0 77.3-28.6 87.5-67.39999999 1.4 0.3 2.9 0.4 4.5 0.39999999L577.7 263.6c6.8 0 14.3 8.9 14.3 21.49999999l0 427.00000001c0 12.7-7.40000001 21.5-14.30000001 21.5l-150.19999999 0c-1.5 0-3 0.2-4.5 0.4-10.2-38.8-45.5-67.3-87.5-67.3-50 0-90.5 40.5-90.5 90.4 0 49.9 40.5 90.6 90.5 90.59999999 42 0 77.3-28.6 87.5-67.39999999 1.4 0.2 2.9 0.4 4.49999999 0.4L577.7 780.7c34.80000001 0 61.3-31.6 61.3-68.50000001L639 510.3l79.1 0c10.4 38.5 45.49999999 67 87.4 67 50 0 90.5-40.5 90.5-90.5s-40.5-90.5-90.5-90.5c-41.79999999 0-77.00000001 28.4-87.4 67L639 463.30000001z\" fill=\"currentColor\" p-id=\"1776\"></path></svg>",
			right: "<?xml version=\"1.0\" standalone=\"no\"?><!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\"><svg t=\"1750169667709\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"3037\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"200\" height=\"200\"><path d=\"M385 560.69999999L385 738.9c0 36.90000001 26.4 68.5 61.3 68.5l150.2 0c1.5 0 3-0.1 4.5-0.3 10.2 38.7 45.5 67.3 87.5 67.3 50 0 90.5-40.5 90.5-90.5s-40.5-90.5-90.5-90.5c-42 0-77.3 28.6-87.5 67.39999999-1.4-0.3-2.9-0.4-4.5-0.39999999L446.3 760.4c-6.8 0-14.3-8.9-14.3-21.49999999l0-427.00000001c0-12.7 7.40000001-21.5 14.30000001-21.5l150.19999999 0c1.5 0 3-0.2 4.5-0.4 10.2 38.8 45.5 67.3 87.5 67.3 50 0 90.5-40.5 90.5-90.4 0-49.9-40.5-90.6-90.5-90.59999999-42 0-77.3 28.6-87.5 67.39999999-1.4-0.2-2.9-0.4-4.49999999-0.4L446.3 243.3c-34.80000001 0-61.3 31.6-61.3 68.50000001L385 513.7l-79.1 0c-10.4-38.5-45.49999999-67-87.4-67-50 0-90.5 40.5-90.5 90.5s40.5 90.5 90.5 90.5c41.79999999 0 77.00000001-28.4 87.4-67L385 560.69999999z\" fill=\"currentColor\" p-id=\"3038\"></path></svg>",
			full: "<?xml version=\"1.0\" standalone=\"no\"?><!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\"><svg t=\"1750169402629\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"2170\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"200\" height=\"200\"><path d=\"M639.328 416c8.032 0 16.096-3.008 22.304-9.056l202.624-197.184-0.8 143.808c-0.096 17.696 14.144 32.096 31.808 32.192 0.064 0 0.128 0 0.192 0 17.6 0 31.904-14.208 32-31.808l1.248-222.208c0-0.672-0.352-1.248-0.384-1.92 0.032-0.512 0.288-0.896 0.288-1.408 0.032-17.664-14.272-32-31.968-32.032L671.552 96l-0.032 0c-17.664 0-31.968 14.304-32 31.968C639.488 145.632 653.824 160 671.488 160l151.872 0.224-206.368 200.8c-12.672 12.32-12.928 32.608-0.64 45.248C622.656 412.736 630.976 416 639.328 416z\" p-id=\"2171\"></path><path d=\"M896.032 639.552 896.032 639.552c-17.696 0-32 14.304-32.032 31.968l-0.224 151.872-200.832-206.4c-12.32-12.64-32.576-12.96-45.248-0.64-12.672 12.352-12.928 32.608-0.64 45.248l197.184 202.624-143.808-0.8c-0.064 0-0.128 0-0.192 0-17.6 0-31.904 14.208-32 31.808-0.096 17.696 14.144 32.096 31.808 32.192l222.24 1.248c0.064 0 0.128 0 0.192 0 0.64 0 1.12-0.32 1.76-0.352 0.512 0.032 0.896 0.288 1.408 0.288l0.032 0c17.664 0 31.968-14.304 32-31.968L928 671.584C928.032 653.952 913.728 639.584 896.032 639.552z\" p-id=\"2172\"></path><path d=\"M209.76 159.744l143.808 0.8c0.064 0 0.128 0 0.192 0 17.6 0 31.904-14.208 32-31.808 0.096-17.696-14.144-32.096-31.808-32.192L131.68 95.328c-0.064 0-0.128 0-0.192 0-0.672 0-1.248 0.352-1.888 0.384-0.448 0-0.8-0.256-1.248-0.256 0 0-0.032 0-0.032 0-17.664 0-31.968 14.304-32 31.968L96 352.448c-0.032 17.664 14.272 32 31.968 32.032 0 0 0.032 0 0.032 0 17.664 0 31.968-14.304 32-31.968l0.224-151.936 200.832 206.4c6.272 6.464 14.624 9.696 22.944 9.696 8.032 0 16.096-3.008 22.304-9.056 12.672-12.32 12.96-32.608 0.64-45.248L209.76 159.744z\" p-id=\"2173\"></path><path d=\"M362.368 617.056l-202.624 197.184 0.8-143.808c0.096-17.696-14.144-32.096-31.808-32.192-0.064 0-0.128 0-0.192 0-17.6 0-31.904 14.208-32 31.808l-1.248 222.24c0 0.704 0.352 1.312 0.384 2.016 0 0.448-0.256 0.832-0.256 1.312-0.032 17.664 14.272 32 31.968 32.032L352.448 928c0 0 0.032 0 0.032 0 17.664 0 31.968-14.304 32-31.968s-14.272-32-31.968-32.032l-151.936-0.224 206.4-200.832c12.672-12.352 12.96-32.608 0.64-45.248S375.008 604.704 362.368 617.056z\" p-id=\"2174\"></path></svg>",
			living: "<?xml version=\"1.0\" standalone=\"no\"?><!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\"><svg t=\"1750169573443\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"2883\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"200\" height=\"200\"><path d=\"M514.133333 488.533333m-106.666666 0a106.666667 106.666667 0 1 0 213.333333 0 106.666667 106.666667 0 1 0-213.333333 0Z\" fill=\"currentColor\" p-id=\"2884\"></path><path d=\"M512 64C264.533333 64 64 264.533333 64 512c0 236.8 183.466667 428.8 416 445.866667v-134.4c-53.333333-59.733333-200.533333-230.4-200.533333-334.933334 0-130.133333 104.533333-234.666667 234.666666-234.666666s234.666667 104.533333 234.666667 234.666666c0 61.866667-49.066667 153.6-145.066667 270.933334l-59.733333 68.266666V960C776.533333 942.933333 960 748.8 960 512c0-247.466667-200.533333-448-448-448z\" fill=\"currentColor\" p-id=\"2885\"></path></svg>",
			zoomin: "<?xml version=\"1.0\" standalone=\"no\"?><!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\"><svg t=\"1750169419447\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"2480\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"200\" height=\"200\"><path d=\"M863.328 482.56l-317.344-1.12L545.984 162.816c0-17.664-14.336-32-32-32s-32 14.336-32 32l0 318.4L159.616 480.064c-0.032 0-0.064 0-0.096 0-17.632 0-31.936 14.24-32 31.904C127.424 529.632 141.728 544 159.392 544.064l322.592 1.152 0 319.168c0 17.696 14.336 32 32 32s32-14.304 32-32l0-318.944 317.088 1.12c0.064 0 0.096 0 0.128 0 17.632 0 31.936-14.24 32-31.904C895.264 496.992 880.96 482.624 863.328 482.56z\" p-id=\"2481\"></path></svg>",
			zoomout: "<?xml version=\"1.0\" standalone=\"no\"?><!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\"><svg t=\"1750169426515\" class=\"icon\" viewBox=\"0 0 1024 1024\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" p-id=\"2730\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"200\" height=\"200\"><path d=\"M863.744 544 163.424 544c-17.664 0-32-14.336-32-32s14.336-32 32-32l700.32 0c17.696 0 32 14.336 32 32S881.44 544 863.744 544z\" p-id=\"2731\"></path></svg>"
		};
		const W = (e, t) => {
			const n = document.createElement("span");
			return n.id = e, n.innerHTML = Qn[t], n;
		};
		function eo(e) {
			const t = document.createElement("div"), n = W("fullscreen", "full"), o = W("toCenter", "living"), s = W("zoomout", "zoomout"), i = W("zoomin", "zoomin");
			t.appendChild(n), t.appendChild(o), t.appendChild(s), t.appendChild(i), t.className = "mind-elixir-toolbar rb";
			let r = null;
			const l = () => {
				const c = e.container.getBoundingClientRect(), h = Ce(e.map.style.transform), d = c.width / 2, u = c.height / 2;
				r = {
					containerRect: c,
					currentTransform: h,
					mapCenterX: (d - h.x) / e.scaleVal,
					mapCenterY: (u - h.y) / e.scaleVal
				};
			}, a = () => {
				if (r) {
					const c = e.container.getBoundingClientRect(), h = c.width / 2, d = c.height / 2, u = h - r.mapCenterX * e.scaleVal, p = d - r.mapCenterY * e.scaleVal, m = u - r.currentTransform.x, x = p - r.currentTransform.y;
					e.move(m, x);
				}
			};
			return e.el.addEventListener("fullscreenchange", a), n.onclick = () => {
				l(), document.fullscreenElement !== e.el ? e.el.requestFullscreen() : document.exitFullscreen();
			}, o.onclick = () => {
				e.toCenter();
			}, s.onclick = () => {
				e.scale(e.scaleVal - e.scaleSensitivity);
			}, i.onclick = () => {
				e.scale(e.scaleVal + e.scaleSensitivity);
			}, t;
		}
		function to(e) {
			const t = document.createElement("div"), n = W("tbltl", "left"), o = W("tbltr", "right"), s = W("tblts", "side");
			return t.appendChild(n), t.appendChild(o), t.appendChild(s), t.className = "mind-elixir-toolbar lt", n.onclick = () => {
				e.initLeft();
			}, o.onclick = () => {
				e.initRight();
			}, s.onclick = () => {
				e.initSide();
			}, t;
		}
		function no(e) {
			e.container.append(eo(e)), e.container.append(to(e));
		}
		var oo = class {
			_listeners = /* @__PURE__ */ new Map();
			addEventListener(t, n) {
				const o = this._listeners.get(t) ?? /* @__PURE__ */ new Set();
				return this._listeners.set(t, o), o.add(n), this;
			}
			removeEventListener(t, n) {
				return this._listeners.get(t)?.delete(n), this;
			}
			dispatchEvent(t, ...n) {
				let o = !0;
				for (const s of this._listeners.get(t) ?? []) o = s(...n) !== !1 && o;
				return o;
			}
			unbindAllListeners() {
				this._listeners.clear();
			}
			on = this.addEventListener;
			off = this.removeEventListener;
			emit = this.dispatchEvent;
		};
		const Re = (e, t = "px") => typeof e == "number" ? e + t : e, j = ({ style: e }, t, n) => {
			if (typeof t == "object") for (const [o, s] of Object.entries(t)) s !== void 0 && (e[o] = Re(s));
			else n !== void 0 && (e[t] = Re(n));
		}, Be = (e = 0, t = 0, n = 0, o = 0) => {
			const s = {
				x: e,
				y: t,
				width: n,
				height: o,
				top: t,
				left: e,
				right: e + n,
				bottom: t + o
			};
			return {
				...s,
				toJSON: () => JSON.stringify(s)
			};
		}, so = (e) => {
			let t, n = -1, o = !1;
			return {
				next: (...s) => {
					t = s, o || (o = !0, n = requestAnimationFrame(() => {
						e(...t), o = !1;
					}));
				},
				cancel: () => {
					cancelAnimationFrame(n), o = !1;
				}
			};
		}, We = (e, t, n = "touch") => {
			switch (n) {
				case "center": {
					const o = t.left + t.width / 2, s = t.top + t.height / 2;
					return o >= e.left && o <= e.right && s >= e.top && s <= e.bottom;
				}
				case "cover": return t.left >= e.left && t.top >= e.top && t.right <= e.right && t.bottom <= e.bottom;
				case "touch": return e.right >= t.left && e.left <= t.right && e.bottom >= t.top && e.top <= t.bottom;
			}
		}, io = () => matchMedia("(hover: none), (pointer: coarse)").matches, ro = () => "safari" in window, ve = (e) => Array.isArray(e) ? e : [e], ht = (e) => (t, n, o, s = {}) => {
			(t instanceof HTMLCollection || t instanceof NodeList) && (t = Array.from(t)), n = ve(n), t = ve(t);
			for (const i of t) if (i) for (const r of n) i[e](r, o, {
				capture: !1,
				...s
			});
		}, F = ht("addEventListener"), I = ht("removeEventListener"), oe = (e) => {
			const { clientX: t, clientY: n, target: o } = e.touches?.[0] ?? e;
			return {
				x: t,
				y: n,
				target: o
			};
		}, K = (e, t = document) => ve(e).map((n) => typeof n == "string" ? Array.from(t.querySelectorAll(n)) : n instanceof Element ? n : null).flat().filter(Boolean), lo = (e, t) => t.some((n) => typeof n == "number" ? e.button === n : typeof n == "object" ? n.button !== e.button ? !1 : n.modifiers.every((o) => {
			switch (o) {
				case "alt": return e.altKey;
				case "ctrl": return e.ctrlKey || e.metaKey;
				case "shift": return e.shiftKey;
			}
		}) : !1), { abs: B, max: Ye, min: Xe, ceil: Fe } = Math, Ke = (e = []) => ({
			stored: e,
			selected: [],
			touched: [],
			changed: {
				added: [],
				removed: []
			}
		});
		var co = class extends oo {
			static version = "mind-elixir-fork";
			_options;
			_selection = Ke();
			_area;
			_clippingElement;
			_targetElement;
			_targetBoundary;
			_targetBoundaryScrolled = !0;
			_targetRect;
			_selectables = [];
			_latestElement;
			_areaLocation = {
				y1: 0,
				x2: 0,
				y2: 0,
				x1: 0
			};
			_areaRect = Be();
			_singleClick = !0;
			_frame;
			_scrollAvailable = !0;
			_scrollingActive = !1;
			_scrollSpeed = {
				x: 0,
				y: 0
			};
			_scrollDelta = {
				x: 0,
				y: 0
			};
			constructor(t) {
				super(), this._options = {
					selectionAreaClass: "selection-area",
					selectionContainerClass: void 0,
					selectables: [],
					document: window.document,
					startAreas: ["html"],
					boundaries: ["html"],
					container: "body",
					mindElixirInstance: void 0,
					...t,
					behaviour: {
						overlap: "invert",
						intersect: "touch",
						triggers: [0],
						...t.behaviour,
						startThreshold: t.behaviour?.startThreshold ? typeof t.behaviour.startThreshold == "number" ? t.behaviour.startThreshold : {
							x: 10,
							y: 10,
							...t.behaviour.startThreshold
						} : {
							x: 10,
							y: 10
						},
						scrolling: {
							speedDivider: 10,
							...t.behaviour?.scrolling,
							startScrollMargins: {
								x: 0,
								y: 0,
								...t.behaviour?.scrolling?.startScrollMargins
							}
						}
					},
					features: {
						range: !0,
						touch: !0,
						deselectOnBlur: !1,
						...t.features,
						singleTap: {
							allow: !0,
							intersect: "native",
							...t.features?.singleTap
						}
					}
				};
				for (const i of Object.getOwnPropertyNames(Object.getPrototypeOf(this))) typeof this[i] == "function" && (this[i] = this[i].bind(this));
				const { document: n, selectionAreaClass: o, selectionContainerClass: s } = this._options;
				this._area = n.createElement("div"), this._clippingElement = n.createElement("div"), this._clippingElement.appendChild(this._area), this._area.classList.add(o), s && this._clippingElement.classList.add(s), j(this._area, {
					willChange: "top, left, bottom, right, width, height",
					top: 0,
					left: 0,
					position: "fixed"
				}), j(this._clippingElement, {
					overflow: "hidden",
					position: "fixed",
					transform: "translate3d(0, 0, 0)",
					pointerEvents: "none",
					zIndex: "1"
				}), this._frame = so((i) => {
					this._recalculateSelectionAreaRect(), this._updateElementSelection(), this._emitEvent("move", i), this._redrawSelectionArea();
				}), this.enable();
			}
			_toggleStartEvents(t = !0) {
				const { document: n } = this._options;
				(t ? F : I)(n, "pointerdown", this._onTapStart);
			}
			_onTapStart(t, n = !1) {
				const { x: o, y: s, target: i } = oe(t), { document: r, startAreas: l, boundaries: a, behaviour: c, features: h } = this._options, d = i.getBoundingClientRect();
				if (!lo(t, c.triggers)) return;
				const u = K(l, r), p = K(a, r);
				this._targetElement = p.find((g) => We(g.getBoundingClientRect(), d));
				const m = t.composedPath(), x = u.find((g) => m.includes(g));
				if (this._targetBoundary = p.find((g) => m.includes(g)), !this._targetElement || !x || !this._targetBoundary || !n && this._emitEvent("beforestart", t) === !1) return;
				this._areaLocation = {
					x1: o,
					y1: s,
					x2: 0,
					y2: 0
				};
				const y = r.scrollingElement ?? r.body;
				this._scrollDelta = {
					x: y.scrollLeft,
					y: y.scrollTop
				}, this._singleClick = !0, this.clearSelection(!1, !0), F(r, ["pointermove"], this._delayedTapMove, { passive: !1 }), F(r, ["pointerup", "pointercancel"], this._onTapStop), F(r, "scroll", this._onScroll), h.deselectOnBlur && (this._targetBoundaryScrolled = !1, F(this._targetBoundary, "scroll", this._onStartAreaScroll));
			}
			_onSingleTap(t) {
				const { singleTap: { intersect: n }, range: o } = this._options.features, s = oe(t);
				let i;
				if (n === "native") i = s.target;
				else if (n === "touch") {
					this.resolveSelectables();
					const { x: l, y: a } = s;
					i = this._selectables.find((c) => {
						const { right: h, left: d, top: u, bottom: p } = c.getBoundingClientRect();
						return l < h && l > d && a < p && a > u;
					});
				}
				if (!i) return;
				for (this.resolveSelectables(); !this._selectables.includes(i);) if (i.parentElement) i = i.parentElement;
				else {
					this._targetBoundaryScrolled || this.clearSelection();
					return;
				}
				const { stored: r } = this._selection;
				if (this._emitEvent("start", t), t.shiftKey && o && this._latestElement) {
					const l = this._latestElement, [a, c] = l.compareDocumentPosition(i) & 4 ? [i, l] : [l, i], h = [
						...this._selectables.filter((d) => d.compareDocumentPosition(a) & 4 && d.compareDocumentPosition(c) & 2),
						a,
						c
					];
					this.select(h), this._latestElement = l;
				} else r.includes(i) && (r.length === 1 || t.ctrlKey || r.every((l) => this._selection.stored.includes(l))) ? this.deselect(i) : (this.select(i), this._latestElement = i);
			}
			_delayedTapMove(t) {
				const { container: n, document: o, behaviour: { startThreshold: s } } = this._options, { x1: i, y1: r } = this._areaLocation, { x: l, y: a } = oe(t);
				if (typeof s == "number" && B(l + a - (i + r)) >= s || typeof s == "object" && B(l - i) >= s.x || B(a - r) >= s.y) {
					if (I(o, ["pointermove"], this._delayedTapMove, { passive: !1 }), this._emitEvent("beforedrag", t) === !1) {
						I(o, ["pointerup", "pointercancel"], this._onTapStop);
						return;
					}
					F(o, ["pointermove"], this._onTapMove, { passive: !1 }), j(this._area, "display", "block"), K(n, o)[0].appendChild(this._clippingElement), this.resolveSelectables(), this._singleClick = !1, this._targetRect = this._targetElement.getBoundingClientRect(), this._scrollAvailable = this._targetElement.scrollHeight !== this._targetElement.clientHeight || this._targetElement.scrollWidth !== this._targetElement.clientWidth, this._scrollAvailable && (this._selectables = this._selectables.filter((c) => this._targetElement.contains(c))), this._setupSelectionArea(), this._emitEvent("start", t), this._onTapMove(t);
				}
				this._handleMoveEvent(t);
			}
			_setupSelectionArea() {
				const { _clippingElement: t, _targetElement: n, _area: o } = this, s = this._targetRect = n.getBoundingClientRect();
				this._scrollAvailable ? (j(t, {
					top: s.top,
					left: s.left,
					width: s.width,
					height: s.height
				}), j(o, {
					marginTop: -s.top,
					marginLeft: -s.left
				})) : (j(t, {
					top: 0,
					left: 0,
					width: "100%",
					height: "100%"
				}), j(o, {
					marginTop: 0,
					marginLeft: 0
				}));
			}
			_onTapMove(t) {
				const { _scrollSpeed: n, _areaLocation: o, _options: s, _frame: i } = this, { speedDivider: r } = s.behaviour.scrolling, { x: l, y: a } = oe(t);
				if (o.x2 = l, o.y2 = a, this._scrollAvailable && !this._scrollingActive && (n.y || n.x)) {
					this._scrollingActive = !0;
					const c = () => {
						if (!n.x && !n.y) {
							this._scrollingActive = !1;
							return;
						}
						const h = this._options.mindElixirInstance;
						if (h && h.move) {
							const d = n.x ? Fe(n.x / r) : 0, u = n.y ? Fe(n.y / r) : 0;
							(d || u) && (h.move(-d, -u), o.x1 -= d, o.y1 -= u);
						}
						i.next(t), requestAnimationFrame(c);
					};
					requestAnimationFrame(c);
				} else i.next(t);
				this._handleMoveEvent(t);
			}
			_handleMoveEvent(t) {
				const { features: n } = this._options;
				(n.touch && io() || this._scrollAvailable && ro()) && t.preventDefault();
			}
			_onScroll() {
				const { _scrollDelta: t, _options: { document: n } } = this, { scrollTop: o, scrollLeft: s } = n.scrollingElement ?? n.body;
				this._areaLocation.x1 += t.x - s, this._areaLocation.y1 += t.y - o, t.x = s, t.y = o, this._setupSelectionArea(), this._frame.next(null);
			}
			_onStartAreaScroll() {
				this._targetBoundaryScrolled = !0, I(this._targetElement, "scroll", this._onStartAreaScroll);
			}
			_recalculateSelectionAreaRect() {
				const { _scrollSpeed: t, _areaLocation: n, _targetElement: o, _options: s } = this, i = this._targetRect, { x1: r, y1: l } = n;
				let { x2: a, y2: c } = n;
				const { behaviour: { scrolling: { startScrollMargins: h } } } = s;
				a < i.left + h.x ? (t.x = -B(i.left - a + h.x), a = a < i.left ? i.left : a) : a > i.right - h.x ? (t.x = B(i.left + i.width - a - h.x), a = a > i.right ? i.right : a) : t.x = 0, c < i.top + h.y ? (t.y = -B(i.top - c + h.y), c = c < i.top ? i.top : c) : c > i.bottom - h.y ? (t.y = B(i.top + i.height - c - h.y), c = c > i.bottom ? i.bottom : c) : t.y = 0;
				const d = Xe(r, a), u = Xe(l, c), p = Ye(r, a), m = Ye(l, c);
				this._areaRect = Be(d, u, p - d, m - u);
			}
			_redrawSelectionArea() {
				const { x: t, y: n, width: o, height: s } = this._areaRect, { style: i } = this._area;
				i.left = `${t}px`, i.top = `${n}px`, i.width = `${o}px`, i.height = `${s}px`;
			}
			_onTapStop(t, n) {
				const { document: o, features: s } = this._options, { _singleClick: i } = this;
				I(this._targetElement, "scroll", this._onStartAreaScroll), I(o, ["pointermove"], this._delayedTapMove), I(o, ["pointermove"], this._onTapMove), I(o, ["pointerup", "pointercancel"], this._onTapStop), I(o, "scroll", this._onScroll), this._keepSelection(), t && i && s.singleTap.allow ? this._onSingleTap(t) : !i && !n && (this._updateElementSelection(), this._emitEvent("stop", t)), this._scrollSpeed.x = 0, this._scrollSpeed.y = 0, this._clippingElement.remove(), this._frame?.cancel(), j(this._area, "display", "none");
			}
			_updateElementSelection() {
				const { _selectables: t, _options: n, _selection: o, _areaRect: s } = this, { stored: i, selected: r, touched: l } = o, { intersect: a, overlap: c } = n.behaviour, h = c === "invert", d = [], u = [], p = [];
				for (let x = 0; x < t.length; x++) {
					const y = t[x];
					if (We(s, y.getBoundingClientRect(), a)) {
						if (r.includes(y)) i.includes(y) && !l.includes(y) && l.push(y);
						else if (h && i.includes(y)) {
							p.push(y);
							continue;
						} else u.push(y);
						d.push(y);
					}
				}
				h && u.push(...i.filter((x) => !r.includes(x)));
				const m = c === "keep";
				for (let x = 0; x < r.length; x++) {
					const y = r[x];
					!d.includes(y) && !(m && i.includes(y)) && p.push(y);
				}
				o.selected = d, o.changed = {
					added: u,
					removed: p
				}, this._latestElement = void 0;
			}
			_emitEvent(t, n) {
				return this.emit(t, {
					event: n,
					store: this._selection,
					selection: this
				});
			}
			_keepSelection() {
				const { _options: t, _selection: n } = this, { selected: o, changed: s, touched: i, stored: r } = n, l = o.filter((a) => !r.includes(a));
				switch (t.behaviour.overlap) {
					case "drop":
						n.stored = [...l, ...r.filter((a) => !i.includes(a))];
						break;
					case "invert":
						n.stored = [...l, ...r.filter((a) => !s.removed.includes(a))];
						break;
					case "keep": n.stored = [...r, ...o.filter((a) => !r.includes(a))];
				}
			}
			/**
			* Manually triggers the start of a selection
			* @param evt A PointerEvent-like object
			* @param silent If beforestart should be fired
			*/
			trigger(t, n = !0) {
				this._onTapStart(t, n);
			}
			/**
			* Can be used if during a selection elements have been added
			* Will update everything that can be selected
			*/
			resolveSelectables() {
				this._selectables = K(this._options.selectables, this._options.document);
			}
			/**
			* Same as deselecting, but for all elements currently selected
			* @param includeStored If the store should also get cleared
			* @param quiet If move / stop events should be fired
			*/
			clearSelection(t = !0, n = !1) {
				const { selected: o, stored: s, changed: i } = this._selection;
				i.added = [], i.removed.push(...o, ...t ? s : []), n || (this._emitEvent("move", null), this._emitEvent("stop", null)), this._selection = Ke(t ? [] : s);
			}
			/**
			* @returns {Array} Selected elements
			*/
			getSelection() {
				return this._selection.stored;
			}
			/**
			* @returns {HTMLElement} The selection area element
			*/
			getSelectionArea() {
				return this._area;
			}
			/**
			* @returns {Element[]} Available selectable elements for current selection
			*/
			getSelectables() {
				return this._selectables;
			}
			/**
			* Set the location of the selection area
			* @param location A partial AreaLocation object
			*/
			setAreaLocation(t) {
				Object.assign(this._areaLocation, t), this._redrawSelectionArea();
			}
			/**
			* @returns {AreaLocation} The current location of the selection area
			*/
			getAreaLocation() {
				return this._areaLocation;
			}
			/**
			* Cancel the current selection process, pass true to fire a stop event after cancel
			* @param keepEvent If a stop event should be fired
			*/
			cancel(t = !1) {
				this._onTapStop(null, !t);
			}
			/**
			* Unbinds all events and removes the area-element.
			*/
			destroy() {
				this.cancel(), this.disable(), this._clippingElement.remove(), super.unbindAllListeners();
			}
			/**
			* Enable selecting elements
			*/
			enable = this._toggleStartEvents;
			/**
			* Disable selecting elements
			*/
			disable = this._toggleStartEvents.bind(this, !1);
			/**
			* Adds elements to the selection
			* @param query CSS Query, can be an array of queries
			* @param quiet If this should not trigger the move event
			*/
			select(t, n = !1) {
				const { changed: o, selected: s, stored: i } = this._selection, r = K(t, this._options.document).filter((l) => !s.includes(l) && !i.includes(l));
				return i.push(...r), s.push(...r), o.added.push(...r), o.removed = [], this._latestElement = void 0, n || (this._emitEvent("move", null), this._emitEvent("stop", null)), r;
			}
			/**
			* Removes a particular element from the selection
			* @param query CSS Query, can be an array of queries
			* @param quiet If this should not trigger the move event
			*/
			deselect(t, n = !1) {
				const { selected: o, stored: s, changed: i } = this._selection, r = K(t, this._options.document).filter((l) => o.includes(l) || s.includes(l));
				this._selection.stored = s.filter((l) => !r.includes(l)), this._selection.selected = o.filter((l) => !r.includes(l)), this._selection.changed.added = [], this._selection.changed.removed.push(...r.filter((l) => !i.removed.includes(l))), this._latestElement = void 0, n || (this._emitEvent("move", null), this._emitEvent("stop", null));
			}
		};
		function ao(e) {
			const t = e.mouseSelectionButton === 2 ? [2] : [0], n = new co({
				selectables: [".map-container me-tpc"],
				boundaries: [e.container],
				container: e.selectionContainer,
				mindElixirInstance: e,
				features: {
					touch: !1,
					singleTap: { allow: !1 }
				},
				behaviour: {
					triggers: t,
					scrolling: {
						speedDivider: 10,
						startScrollMargins: {
							x: 50,
							y: 50
						}
					}
				}
			}).on("beforestart", ({ event: o }) => {
				if (!e.editable || e.spacePressed || e.ptState !== 5) return !1;
				const s = o.target;
				if (s.id === "input-box" || s.className === "circle" || s.className !== "map-container") return !1;
				!o.ctrlKey && !o.metaKey && e.clearSelection();
				const i = n.getSelectionArea();
				return i.style.background = "#4f90f22d", i.style.border = "1px solid #4f90f2", i.style.borderRadius = "3px", i.parentElement && (i.parentElement.style.zIndex = "9999"), !0;
			}).on("move", ({ store: { changed: { added: o, removed: s } } }) => {
				if (o.length > 0 || s.length, o.length > 0) {
					const i = o.filter((r) => !e.currentNodes?.includes(r));
					if (i.length > 0) {
						for (const r of i) r.className = "selected";
						e.currentNodes = [...e.currentNodes || [], ...i], e.bus.fire("selectNodes", i.map((r) => r.nodeObj));
					}
				}
				if (s.length > 0) {
					const i = s.filter((r) => e.currentNodes?.includes(r));
					if (i.length > 0) {
						for (const r of i) r.classList.remove("selected");
						e.currentNodes = (e.currentNodes || []).filter((r) => !i.includes(r)), e.bus.fire("unselectNodes", i.map((r) => r.nodeObj));
					}
				}
			});
			e.selection = n;
		}
		const ft = function(e, t, n, o, s = 8) {
			if (e === n) return `M ${e} ${t} V ${o}`;
			const i = (t + o) / 2, r = n > e ? 1 : -1, l = Math.min(s, Math.abs(n - e) / 2, Math.abs(i - t), Math.abs(o - i));
			return `M ${e} ${t} V ${i - l} Q ${e} ${i} ${e + r * l} ${i} H ${n - r * l} Q ${n} ${i} ${n} ${i + l} V ${o}`;
		};
		function ut({ pT: e, pL: t, pW: n, pH: o, cT: s, cL: i, cW: r, cH: l, direction: a, containerHeight: c, containerWidth: h }) {
			if (a === L.DOWN) {
				const g = t + n / 2, v = i + r / 2, C = e + o;
				return ft(g, C, v, s);
			}
			let d = t + n / 2;
			const u = e + o / 2;
			let p;
			a === L.LHS ? p = i + r : p = i;
			const m = s + l / 2, y = (1 - Math.abs(m - u) / c) * .25 * (n / 2);
			return a === L.LHS ? d = d - n / 10 - y : d = d + n / 10 + y, `M ${d} ${u} Q ${d} ${m} ${p} ${m}`;
		}
		function pt({ pT: e, pL: t, pW: n, pH: o, cT: s, cL: i, cW: r, cH: l, direction: a, isFirst: c }) {
			if (a === L.DOWN) {
				const v = t + n / 2, C = e + o, T = i + r / 2;
				return ft(v, C, T, s);
			}
			const h = parseInt(this.container.style.getPropertyValue("--node-gap-x"));
			let d = 0, u = 0;
			c ? d = e + o / 2 : d = e + o;
			const p = s + l;
			let m = 0, x = 0, y = 0;
			const g = Math.abs(d - p) / 300 * h;
			return a === L.LHS ? (y = t, m = y + h, x = y - h, u = i + h, `M ${m} ${d} C ${y} ${d} ${y + g} ${p} ${x} ${p} H ${u}`) : (y = t + n, m = y - h, x = y + h, u = i + r - h, `M ${m} ${d} C ${y} ${d} ${y - g} ${p} ${x} ${p} H ${u}`);
		}
		const ho = function(e, t = !0) {
			this.theme = e, this.generateMainBranch = this.theme.generateMainBranch || ut, this.generateSubBranch = this.theme.generateSubBranch || pt;
			const o = {
				...(this.theme.type === "dark" ? ye : me).cssVar,
				...this.theme.cssVar
			};
			this.compact && (o["--node-gap-x"] = "15px", o["--node-gap-y"] = "2px", o["--main-gap-x"] = "30px", o["--main-gap-y"] = "6px");
			const s = Object.keys(o);
			for (let i = 0; i < s.length; i++) {
				const r = s[i];
				this.container.style.setProperty(r, o[r]);
			}
			t && this.refresh();
		};
		const fo = function(e) {
			this.compact = e, this.theme && this.changeTheme(this.theme);
		};
		const uo = function(e) {
			return {
				dom: e,
				moved: !1,
				sessionMoved: !1,
				pointerdown: !1,
				lastX: 0,
				lastY: 0,
				handlePointerMove(t) {
					if (this.pointerdown) {
						this.moved = !0, this.sessionMoved = !0;
						const n = t.clientX - this.lastX, o = t.clientY - this.lastY;
						this.lastX = t.clientX, this.lastY = t.clientY, this.cb && this.cb(n, o);
					}
				},
				handlePointerDown(t) {
					t.button === 0 && (this.pointerdown = !0, this.sessionMoved = !1, this.lastX = t.clientX, this.lastY = t.clientY, this.dom.setPointerCapture(t.pointerId));
				},
				handleClear(t) {
					const n = this.pointerdown && this.sessionMoved;
					this.pointerdown = !1, this.sessionMoved = !1, t.pointerId !== void 0 && this.dom.releasePointerCapture(t.pointerId), n && this.onEnd && this.onEnd();
				},
				cb: null,
				onEnd: null,
				init(t, n, o) {
					this.cb = n, this.onEnd = o || null, this.handleClear = this.handleClear.bind(this), this.handlePointerMove = this.handlePointerMove.bind(this), this.handlePointerDown = this.handlePointerDown.bind(this), this.destroy = Ge([
						{
							dom: t,
							evt: "pointermove",
							func: this.handlePointerMove
						},
						{
							dom: t,
							evt: "pointerleave",
							func: this.handleClear
						},
						{
							dom: t,
							evt: "pointerup",
							func: this.handleClear
						},
						{
							dom: this.dom,
							evt: "pointerdown",
							func: this.handlePointerDown
						}
					]);
				},
				destroy: null,
				clear() {
					this.moved = !1, this.pointerdown = !1;
				}
			};
		};
		const Ve = { create: uo };
		const gt = "#4dc4ff";
		function mt(e, t, n, o, s, i, r, l) {
			return {
				x: e / 8 + n * 3 / 8 + s * 3 / 8 + r / 8,
				y: t / 8 + o * 3 / 8 + i * 3 / 8 + l / 8
			};
		}
		function po(e, t, n) {
			e && (e.dataset.x = t.toString(), e.dataset.y = n.toString(), fe(e));
		}
		function V(e, t, n, o, s) {
			_(e, {
				x1: t + "",
				y1: n + "",
				x2: o + "",
				y2: s + ""
			});
		}
		function xe(e, t, n, o, s, i, r, l, a, c) {
			const h = `M ${t} ${n} C ${o} ${s} ${i} ${r} ${l} ${a}`;
			e.line.setAttribute("d", h);
			const d = c.style || {};
			e.line.setAttribute("stroke", d.stroke || "rgb(227, 125, 116)"), e.line.setAttribute("stroke-width", String(d.strokeWidth || "2")), e.line.setAttribute("stroke-dasharray", d.strokeDasharray || "8,2"), d.opacity !== void 0 && d.opacity !== null && d.opacity !== "" ? e.line.setAttribute("opacity", String(d.opacity)) : e.line.removeAttribute("opacity");
			const u = e.querySelectorAll("path[stroke=\"transparent\"]");
			u.length > 0 && u[0].setAttribute("d", h);
			const p = ae(i, r, l, a);
			if (p) {
				const g = `M ${p.x1} ${p.y1} L ${l} ${a} L ${p.x2} ${p.y2}`;
				e.arrow1.setAttribute("d", g), u.length > 1 && u[1].setAttribute("d", g), e.arrow1.setAttribute("stroke", d.stroke || "rgb(227, 125, 116)"), e.arrow1.setAttribute("stroke-width", String(d.strokeWidth || "2")), d.opacity !== void 0 && d.opacity !== null && d.opacity !== "" ? e.arrow1.setAttribute("opacity", String(d.opacity)) : e.arrow1.removeAttribute("opacity");
			}
			if (c.bidirectional) {
				const g = ae(o, s, t, n);
				if (g) {
					const v = `M ${g.x1} ${g.y1} L ${t} ${n} L ${g.x2} ${g.y2}`;
					e.arrow2.setAttribute("d", v), u.length > 2 && u[2].setAttribute("d", v);
				}
			} else e.arrow2.setAttribute("d", ""), u.length > 2 && u[2].setAttribute("d", "");
			e.arrow2.setAttribute("stroke", d.stroke || "rgb(227, 125, 116)"), e.arrow2.setAttribute("stroke-width", String(d.strokeWidth || "2")), d.opacity !== void 0 && d.opacity !== null && d.opacity !== "" ? e.arrow2.setAttribute("opacity", String(d.opacity)) : e.arrow2.removeAttribute("opacity");
			const { x: m, y: x } = mt(t, n, o, s, i, r, l, a);
			e.labelEl && po(e.labelEl, m, x);
			const y = e.labelEl;
			y && (y.style.color = d.labelColor || "rgb(235, 95, 82)"), wo(e);
		}
		function q(e, t, n) {
			const { offsetLeft: o, offsetTop: s } = $(e.nodes, t), i = t.offsetWidth, r = t.offsetHeight, l = o + i / 2, a = s + r / 2;
			return {
				w: i,
				h: r,
				cx: l,
				cy: a,
				ctrlX: l + n.x,
				ctrlY: a + n.y
			};
		}
		function R(e) {
			const t = e.w / 2, n = e.h / 2, o = e.ctrlX - e.cx, s = e.ctrlY - e.cy, i = Math.hypot(o, s);
			if (i === 0 || t === 0 && n === 0) return {
				x: e.cx,
				y: e.cy
			};
			const r = o / i, l = s / i, a = Math.min(t / Math.abs(r), n / Math.abs(l));
			return {
				x: e.cx + r * a,
				y: e.cy + l * a
			};
		}
		const yt = function(e, t, n) {
			const o = $(e.nodes, t), s = $(e.nodes, n), i = o.offsetLeft + t.offsetWidth / 2, r = o.offsetTop + t.offsetHeight / 2, l = s.offsetLeft + n.offsetWidth / 2, a = s.offsetTop + n.offsetHeight / 2, c = l - i, h = a - r, d = Math.sqrt(c * c + h * h), u = Math.max(50, Math.min(200, d * .3)), p = Math.abs(c), m = Math.abs(h);
			let x, y;
			if (d < 150) {
				const v = t.closest("me-main"), C = v ? v.className === "lhs" ? -1 : 1 : c > 0 ? -1 : 1;
				x = {
					x: 200 * C,
					y: 0
				}, y = {
					x: 200 * C,
					y: 0
				};
			} else if (p > m * 1.5) {
				const v = c > 0 ? t.offsetWidth / 2 : -t.offsetWidth / 2, C = c > 0 ? -n.offsetWidth / 2 : n.offsetWidth / 2;
				x = {
					x: v + (c > 0 ? u : -u),
					y: 0
				}, y = {
					x: C + (c > 0 ? -u : u),
					y: 0
				};
			} else if (m > p * 1.5) {
				const v = h > 0 ? t.offsetHeight / 2 : -t.offsetHeight / 2, C = h > 0 ? -n.offsetHeight / 2 : n.offsetHeight / 2;
				x = {
					x: 0,
					y: v + (h > 0 ? u : -u)
				}, y = {
					x: 0,
					y: C + (h > 0 ? -u : u)
				};
			} else {
				const v = Math.atan2(h, c), C = t.offsetWidth / 2 * Math.cos(v), T = t.offsetHeight / 2 * Math.sin(v), D = -(n.offsetWidth / 2) * Math.cos(v), f = -(n.offsetHeight / 2) * Math.sin(v), b = u * .7 * (c > 0 ? 1 : -1), w = u * .7 * (h > 0 ? 1 : -1);
				x = {
					x: C + b,
					y: T + w
				}, y = {
					x: D - b,
					y: f - w
				};
			}
			return {
				delta1: {
					x: Math.round(x.x),
					y: Math.round(x.y)
				},
				delta2: {
					x: Math.round(y.x),
					y: Math.round(y.y)
				}
			};
		};
		const _e = function(e, t, n, o, s) {
			if (!t || !n) return;
			if (!o.delta1 || !o.delta2) {
				const E = yt(e, t, n);
				o.delta1 = E.delta1, o.delta2 = E.delta2;
			}
			const i = q(e, t, o.delta1), r = q(e, n, o.delta2), { x: l, y: a } = R(i), { ctrlX: c, ctrlY: h } = i, { ctrlX: d, ctrlY: u } = r, { x: p, y: m } = R(r), x = ae(d, u, p, m);
			if (!x) return;
			const y = `M ${x.x1} ${x.y1} L ${p} ${m} L ${x.x2} ${x.y2}`;
			let g = "";
			if (o.bidirectional) {
				const E = ae(c, h, l, a);
				if (!E) return;
				g = `M ${E.x1} ${E.y1} L ${l} ${a} L ${E.x2} ${E.y2}`;
			}
			const v = Bn(`M ${l} ${a} C ${c} ${h} ${d} ${u} ${p} ${m}`, y, g, o.style), { x: C, y: T } = mt(l, a, c, h, d, u, p, m), D = o.style?.labelColor || "rgb(235, 95, 82)", f = "a-" + o.id;
			v.id = f;
			const b = e.markdown ? e.markdown(o.label, o) : o.label, w = le(b, C, T, {
				anchor: "middle",
				color: D,
				dataType: "arrow",
				svgId: f
			});
			v.labelEl = w, v.arrowObj = o, v.dataset.linkid = o.id, e.labelContainer.appendChild(w), e.arrowSvg.appendChild(v), fe(w), s || (e.arrows.push(o), e.currentArrow = v, vt(e, o, i, r));
		};
		const go = function(e, t, n = {}) {
			const o = {
				id: X(),
				label: "Custom Link",
				from: e.nodeObj.id,
				to: t.nodeObj.id,
				...n
			};
			_e(this, e, t, o), this.bus.fire("operation", {
				name: "createArrow",
				obj: o
			});
		};
		const mo = function(e) {
			ue(this);
			const t = {
				...e,
				id: X()
			};
			_e(this, this.findEle(t.from), this.findEle(t.to), t), this.bus.fire("operation", {
				name: "createArrow",
				obj: t
			});
		};
		const yo = function(e) {
			let t;
			if (e ? t = e : t = this.currentArrow, !t) return;
			ue(this);
			const n = t.arrowObj.id;
			this.arrows = this.arrows.filter((o) => o.id !== n), t.labelEl?.remove(), t.remove(), this.bus.fire("operation", {
				name: "removeArrow",
				obj: { id: n }
			});
		};
		const bo = function(e) {
			this.currentArrow = e;
			const t = e.arrowObj, n = this.findEle(t.from), o = this.findEle(t.to), s = q(this, n, t.delta1), i = q(this, o, t.delta2);
			this.editable ? vt(this, t, s, i) : bt(e, gt), this.bus.fire("selectArrow", t);
		};
		const vo = function() {
			ue(this), this.currentArrow = null, this.bus.fire("unselectArrow");
		};
		const pe = function(e, t) {
			const n = document.createElementNS(H, "path");
			return _(n, {
				d: e,
				stroke: t,
				fill: "none",
				"stroke-width": "6",
				"stroke-linecap": "round",
				"stroke-linejoin": "round"
			}), n;
		};
		const bt = function(e, t) {
			const n = document.createElementNS(H, "g");
			n.setAttribute("class", "arrow-highlight"), n.setAttribute("opacity", "0.45");
			const o = pe(e.line.getAttribute("d"), t);
			n.appendChild(o);
			const s = pe(e.arrow1.getAttribute("d"), t);
			if (n.appendChild(s), e.arrow2.getAttribute("d")) {
				const i = pe(e.arrow2.getAttribute("d"), t);
				n.appendChild(i);
			}
			e.insertBefore(n, e.firstChild);
		};
		const xo = function(e) {
			const t = e.querySelector(".arrow-highlight");
			t && t.remove();
		};
		const wo = function(e) {
			const t = e.querySelector(".arrow-highlight");
			if (!t) return;
			const n = t.querySelectorAll("path");
			n.length >= 1 && n[0].setAttribute("d", e.line.getAttribute("d")), n.length >= 2 && n[1].setAttribute("d", e.arrow1.getAttribute("d")), n.length >= 3 && e.arrow2.getAttribute("d") && n[2].setAttribute("d", e.arrow2.getAttribute("d"));
		};
		const ue = function(e) {
			e.helper1?.destroy(), e.helper2?.destroy(), e.linkController.style.display = "none", e.P2.style.display = "none", e.P3.style.display = "none", e.currentArrow && xo(e.currentArrow);
		};
		const vt = function(e, t, n, o) {
			const { linkController: s, P2: i, P3: r, line1: l, line2: a, nodes: c, map: h, currentArrow: d, bus: u } = e;
			if (!d) return;
			s.style.display = "initial", i.style.display = "initial", r.style.display = "initial", c.appendChild(s), c.appendChild(i), c.appendChild(r), bt(d, gt);
			let { x: p, y: m } = R(n), { ctrlX: x, ctrlY: y } = n, { ctrlX: g, ctrlY: v } = o, { x: C, y: T } = R(o);
			i.style.cssText = `top:${y}px;left:${x}px;`, r.style.cssText = `top:${v}px;left:${g}px;`, V(l, p, m, x, y), V(a, g, v, C, T), e.helper1 = Ve.create(i), e.helper2 = Ve.create(r);
			let D = G(t);
			const f = () => {
				u.fire("operation", {
					name: "reshapeArrow",
					obj: t,
					origin: D
				}), D = G(t);
			};
			e.helper1.init(h, (b, w) => {
				x = x + b / e.scaleVal, y = y + w / e.scaleVal;
				const E = R({
					...n,
					ctrlX: x,
					ctrlY: y
				});
				p = E.x, m = E.y, i.style.top = y + "px", i.style.left = x + "px", xe(d, p, m, x, y, g, v, C, T, t), V(l, p, m, x, y), t.delta1.x = Math.round(x - n.cx), t.delta1.y = Math.round(y - n.cy), u.fire("updateArrowDelta", t);
			}, f), e.helper2.init(h, (b, w) => {
				g = g + b / e.scaleVal, v = v + w / e.scaleVal;
				const E = R({
					...o,
					ctrlX: g,
					ctrlY: v
				});
				C = E.x, T = E.y, r.style.top = v + "px", r.style.left = g + "px", xe(d, p, m, x, y, g, v, C, T, t), V(a, g, v, C, T), t.delta2.x = Math.round(g - o.cx), t.delta2.y = Math.round(v - o.cy), u.fire("updateArrowDelta", t);
			}, f);
		};
		function Eo() {
			this.arrowSvg.innerHTML = "", this.labelContainer.querySelectorAll(".svg-label[data-type=\"arrow\"]").forEach((t) => t.remove());
			for (let t = 0; t < this.arrows.length; t++) {
				const n = this.arrows[t];
				try {
					_e(this, this.findEle(n.from), this.findEle(n.to), n, !0);
				} catch {}
			}
			this.nodes.appendChild(this.arrowSvg);
		}
		function Co(e) {
			ue(this), e && e.labelEl && at(this, e.labelEl, e.arrowObj);
		}
		function So() {
			this.arrows = this.arrows.filter((e) => ce(e.from, this.nodeData) && ce(e.to, this.nodeData));
		}
		const No = function(e, t) {
			const n = G(e);
			n.style && t.style && (t.style = Object.assign({}, n.style, t.style)), Object.assign(e, t);
			const o = this.arrowSvg.querySelector(`g[data-linkid="${e.id}"]`);
			if (o) {
				if (t.label !== void 0 && o.labelEl) {
					const r = this.markdown ? this.markdown(e.label, e) : e.label;
					o.labelEl.innerHTML = r;
				}
				const s = this.findEle(e.from), i = this.findEle(e.to);
				if (s && i) {
					if (!e.delta1 || !e.delta2) {
						const y = yt(this, s, i);
						e.delta1 = e.delta1 || y.delta1, e.delta2 = e.delta2 || y.delta2;
					}
					const r = q(this, s, e.delta1), l = q(this, i, e.delta2), { x: a, y: c } = R(r), { ctrlX: h, ctrlY: d } = r, { ctrlX: u, ctrlY: p } = l, { x: m, y: x } = R(l);
					xe(o, a, c, h, d, u, p, m, x, e), this.currentArrow?.arrowObj?.id === e.id && (this.P2.style.cssText = `top:${d}px;left:${h}px;`, this.P3.style.cssText = `top:${p}px;left:${u}px;`, V(this.line1, a, c, h, d), V(this.line2, u, p, m, x));
				}
			}
			this.bus.fire("operation", {
				name: "reshapeArrow",
				obj: e,
				origin: n
			});
		};
		const To = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
			__proto__: null,
			createArrow: go,
			createArrowFrom: mo,
			editArrowLabel: Co,
			removeArrow: yo,
			renderArrow: Eo,
			reshapeArrow: No,
			selectArrow: bo,
			tidyArrow: So,
			unselectArrow: vo
		}, Symbol.toStringTag, { value: "Module" }));
		const Do = function(e) {
			if (e.length === 0) throw new Error("No selected node.");
			if (e.length === 1) {
				const a = e[0].nodeObj, c = e[0].nodeObj.parent;
				if (!c) throw new Error("Can not select root node.");
				const h = c.children.findIndex((d) => a === d);
				return {
					parent: c.id,
					start: h,
					end: h
				};
			}
			let t = 0;
			const n = e.map((a) => {
				let c = a.nodeObj;
				const h = [];
				for (; c.parent;) {
					const d = c.parent, p = d.children?.indexOf(c);
					c = d, h.unshift({
						node: c,
						index: p
					});
				}
				return h.length > t && (t = h.length), h;
			});
			let o = 0;
			e: for (; o < t; o++) {
				const a = n[0][o]?.node;
				for (let c = 1; c < n.length; c++) if (n[c][o]?.node !== a) break e;
			}
			if (!o) throw new Error("Can not select root node.");
			const s = n.map((a) => a[o - 1].index).sort((a, c) => a - c), i = s[0] || 0, r = s[s.length - 1] || 0, l = n[0][o - 1].node;
			if (!l.parent) throw new Error("Please select nodes in the same main topic.");
			return {
				parent: l.id,
				start: i,
				end: r
			};
		};
		const Mo = function(e) {
			const t = document.createElementNS(H, "g");
			return t.setAttribute("id", e), t;
		};
		const ge = function(e, t) {
			const n = document.createElementNS(H, "path");
			return _(n, {
				d: e,
				stroke: t || "#666",
				fill: "none",
				"stroke-linecap": "round",
				"stroke-width": "2"
			}), n;
		};
		const _o = (e) => e.parentElement.parentElement;
		const xt = function(e, t) {
			const n = e.summaries.findIndex((o) => o.id === t);
			return n === -1 ? !1 : (e.summaries.splice(n, 1), e.nodes.querySelector("#s-" + t)?.remove(), e.nodes.querySelector("#label-s-" + t)?.remove(), !0);
		};
		const Lo = function(e, { parent: t, start: n }) {
			const o = e.findEle(t), s = o.nodeObj;
			let i;
			return s.parent ? i = o.closest("me-main").className : i = e.findEle(s.children[n].id).closest("me-main").className, i;
		};
		const Le = function(e, t) {
			const { id: n, label: o, parent: s, start: i, end: r, style: l } = t, { nodes: a, theme: c, summarySvg: h } = e, u = e.findEle(s).nodeObj, p = Lo(e, t);
			let m = 1 / 0, x = 0, y = 0, g = 0, v = 0, C = 1 / 0, T = 0;
			for (let N = i; N <= r; N++) {
				const A = u.children?.[N];
				if (!A) return null;
				const P = _o(e.findEle(A.id)), { offsetLeft: O, offsetTop: Q } = $(a, P), ee = i === r ? 10 : 20;
				N === i && (y = Q + ee), N === r && (g = Q + P.offsetHeight - ee), N === i && (C = O + ee), N === r && (T = O + P.offsetWidth - ee), Q + P.offsetHeight > v && (v = Q + P.offsetHeight), O < m && (m = O), P.offsetWidth + O > x && (x = P.offsetWidth + O);
			}
			let D, f;
			const b = l?.stroke || c.cssVar["--color"], w = l?.labelColor || c.cssVar["--color"], E = "s-" + n, S = e.markdown ? e.markdown(o, t) : o;
			if (p === L.DOWN) {
				const N = v + 10, A = (C + T) / 2;
				D = ge(`M ${C} ${N - 10} c 0 5 5 10 10 10 L ${T - 10} ${N} c 5 0 10 -5 10 -10 M ${A} ${N} v 10`, b), f = le(S, A, N + 20, {
					anchor: "middle",
					color: w,
					dataType: "summary",
					svgId: E
				});
			} else {
				const N = u.parent ? 10 : 0, A = y + N, P = g + N, O = (A + P) / 2;
				p === L.LHS ? (D = ge(`M ${m + 10} ${A} c -5 0 -10 5 -10 10 L ${m} ${P - 10} c 0 5 5 10 10 10 M ${m} ${O} h -10`, b), f = le(S, m - 20, O, {
					anchor: "end",
					color: w,
					dataType: "summary",
					svgId: E
				})) : (D = ge(`M ${x - 10} ${A} c 5 0 10 5 10 10 L ${x} ${P - 10} c 0 5 -5 10 -10 10 M ${x} ${O} h 10`, b), f = le(S, x + 20, O, {
					anchor: "start",
					color: w,
					dataType: "summary",
					svgId: E
				}));
			}
			const M = Mo(E);
			return M.appendChild(D), e.labelContainer.appendChild(f), fe(f), M.summaryObj = t, M.labelEl = f, h.appendChild(M), M;
		};
		const ko = function(e = {}) {
			if (!this.currentNodes) return;
			const { currentNodes: t, summaries: n, bus: o } = this, { parent: s, start: i, end: r } = Do(t), l = {
				id: X(),
				parent: s,
				start: i,
				end: r,
				label: "summary",
				style: e.style
			}, a = Le(this, l);
			n.push(l), this.editSummary(a), o.fire("operation", {
				name: "createSummary",
				obj: l
			});
		};
		const Ao = function(e) {
			const t = X(), n = {
				...e,
				id: t
			};
			Le(this, n), this.summaries.push(n), this.bus.fire("operation", {
				name: "createSummary",
				obj: n
			});
		};
		const Po = function(e) {
			xt(this, e) && this.bus.fire("operation", {
				name: "removeSummary",
				obj: { id: e }
			});
		};
		const Oo = function(e) {
			const t = e.labelEl;
			t && t.classList.add("selected"), this.currentSummary = e, this.bus.fire("selectSummary", e.summaryObj);
		};
		const $o = function() {
			this.currentSummary?.labelEl?.classList.remove("selected"), this.currentSummary = null, this.bus.fire("unselectSummary");
		};
		const Ho = function() {
			this.summarySvg.innerHTML = "";
			const e = [];
			this.summaries.forEach((t) => {
				try {
					Le(this, t) === null && e.push(t.id);
				} catch {}
			}), e.forEach((t) => xt(this, t)), this.nodes.insertAdjacentElement("beforeend", this.summarySvg);
		};
		const Io = function(e) {
			e && e.labelEl && at(this, e.labelEl, e.summaryObj);
		};
		const jo = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
			__proto__: null,
			createSummary: ko,
			createSummaryFrom: Ao,
			editSummary: Io,
			removeSummary: Po,
			renderSummary: Ho,
			selectSummary: Oo,
			unselectSummary: $o
		}, Symbol.toStringTag, { value: "Module" }));
		const k = "http://www.w3.org/2000/svg";
		function Ro(e, t) {
			const n = document.createElementNS(k, "svg");
			return _(n, {
				version: "1.1",
				xmlns: k,
				height: e,
				width: t
			}), n;
		}
		function Bo(e, t) {
			return (parseInt(e) - parseInt(t)) / 2;
		}
		function Wo(e, t, n, o) {
			const s = document.createElementNS(k, "g");
			let i = "";
			return e.text ? i = e.text.textContent : i = e.childNodes[0].textContent, i.split(`
`).forEach((l, a) => {
				const c = document.createElementNS(k, "text");
				_(c, {
					x: n + parseInt(t.paddingLeft) + "",
					y: o + parseInt(t.paddingTop) + Bo(t.lineHeight, t.fontSize) * (a + 1) + parseFloat(t.fontSize) * (a + 1) + "",
					"text-anchor": "start",
					"font-family": t.fontFamily,
					"font-size": `${t.fontSize}`,
					"font-weight": `${t.fontWeight}`,
					fill: `${t.color}`
				}), c.innerHTML = l, s.appendChild(c);
			}), s;
		}
		function Yo(e, t, n, o) {
			let s = "";
			e.nodeObj?.dangerouslySetInnerHTML ? s = e.nodeObj.dangerouslySetInnerHTML : e.text ? s = e.text.textContent : s = e.childNodes[0].textContent;
			const i = document.createElementNS(k, "foreignObject");
			_(i, {
				x: n + parseInt(t.paddingLeft) + "",
				y: o + parseInt(t.paddingTop) + "",
				width: t.width,
				height: t.height
			});
			const r = document.createElement("div");
			return _(r, {
				xmlns: "http://www.w3.org/1999/xhtml",
				style: `font-family: ${t.fontFamily}; font-size: ${t.fontSize}; font-weight: ${t.fontWeight}; color: ${t.color}; white-space: pre-wrap;`
			}), r.innerHTML = s, i.appendChild(r), i;
		}
		function Xo(e, t) {
			const n = getComputedStyle(t), { offsetLeft: o, offsetTop: s } = $(e.nodes, t), i = document.createElementNS(k, "rect");
			return _(i, {
				x: o + "",
				y: s + "",
				rx: n.borderRadius,
				ry: n.borderRadius,
				width: n.width,
				height: n.height,
				fill: n.backgroundColor,
				stroke: n.borderColor,
				"stroke-width": n.borderWidth
			}), i;
		}
		function se(e, t, n = !1) {
			const o = getComputedStyle(t), { offsetLeft: s, offsetTop: i } = $(e.nodes, t), r = document.createElementNS(k, "rect");
			_(r, {
				x: s + "",
				y: i + "",
				rx: o.borderRadius,
				ry: o.borderRadius,
				width: o.width,
				height: o.height,
				fill: o.backgroundColor,
				stroke: o.borderColor,
				"stroke-width": o.borderWidth
			});
			const l = document.createElementNS(k, "g");
			l.appendChild(r);
			let a;
			return n ? a = Yo(t, o, s, i) : a = Wo(t, o, s, i), l.appendChild(a), l;
		}
		function Fo(e, t) {
			const n = getComputedStyle(t), { offsetLeft: o, offsetTop: s } = $(e.nodes, t), i = document.createElementNS(k, "a"), r = document.createElementNS(k, "text");
			return _(r, {
				x: o + "",
				y: s + parseInt(n.fontSize) + "",
				"text-anchor": "start",
				"font-family": n.fontFamily,
				"font-size": `${n.fontSize}`,
				"font-weight": `${n.fontWeight}`,
				fill: `${n.color}`
			}), r.innerHTML = t.textContent, i.appendChild(r), i.setAttribute("href", t.href), i;
		}
		function Ko(e, t) {
			const n = getComputedStyle(t), { offsetLeft: o, offsetTop: s } = $(e.nodes, t), i = document.createElementNS(k, "image");
			return _(i, {
				x: o + "",
				y: s + "",
				width: n.width + "",
				height: n.height + "",
				href: t.src
			}), i;
		}
		const Vo = "<?xml version=\"1.0\" standalone=\"no\"?><!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">";
		const zo = (e, t = !1) => {
			const n = e.nodes, o = n.offsetHeight + 200, s = n.offsetWidth + 200, i = Ro(o + "px", s + "px"), r = document.createElementNS(k, "svg"), l = document.createElementNS(k, "rect");
			_(l, {
				x: "0",
				y: "0",
				width: `${s}`,
				height: `${o}`,
				fill: e.theme.cssVar["--bgcolor"]
			}), i.appendChild(l), n.querySelectorAll(".subLines").forEach((d) => {
				const u = d.cloneNode(!0), { offsetLeft: p, offsetTop: m } = $(n, d.parentElement);
				u.setAttribute("x", `${p}`), u.setAttribute("y", `${m}`), r.appendChild(u);
			});
			const a = n.querySelector(".lines")?.cloneNode(!0);
			a && r.appendChild(a);
			const c = n.querySelector(".topiclinks")?.cloneNode(!0);
			c && r.appendChild(c);
			const h = n.querySelector(".summary")?.cloneNode(!0);
			return h && r.appendChild(h), n.querySelectorAll("me-tpc").forEach((d) => {
				d.nodeObj.dangerouslySetInnerHTML ? r.appendChild(se(e, d, !t)) : (r.appendChild(Xo(e, d)), r.appendChild(se(e, d.text, !t)));
			}), n.querySelectorAll(".tags > span").forEach((d) => {
				r.appendChild(se(e, d));
			}), n.querySelectorAll(".icons > span").forEach((d) => {
				r.appendChild(se(e, d));
			}), n.querySelectorAll(".hyper-link").forEach((d) => {
				r.appendChild(Fo(e, d));
			}), n.querySelectorAll("img").forEach((d) => {
				r.appendChild(Ko(e, d));
			}), _(r, {
				x: "100",
				y: "100",
				overflow: "visible"
			}), i.appendChild(r), i;
		};
		const Go = (e, t) => (t && e.insertAdjacentHTML("afterbegin", "<style>" + t + "</style>"), Vo + e.outerHTML);
		function qo(e) {
			return new Promise((t, n) => {
				const o = new FileReader();
				o.onload = (s) => {
					t(s.target.result);
				}, o.onerror = (s) => {
					n(s);
				}, o.readAsDataURL(e);
			});
		}
		const Uo = function(e = !1, t) {
			const n = zo(this, e), o = Go(n, t);
			return new Blob([o], { type: "image/svg+xml" });
		};
		const Jo = async function(e = !1, t) {
			const o = await qo(this.exportSvg(e, t));
			return new Promise((s, i) => {
				const r = new Image();
				r.setAttribute("crossOrigin", "anonymous"), r.onload = () => {
					const l = document.createElement("canvas");
					l.width = r.width, l.height = r.height, l.getContext("2d").drawImage(r, 0, 0), l.toBlob(s, "image/png", 1);
				}, r.src = o, r.onerror = i;
			});
		};
		const Zo = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
			__proto__: null,
			exportPng: Jo,
			exportSvg: Uo
		}, Symbol.toStringTag, { value: "Module" }));
		function Qo(e, t) {
			return async function(...n) {
				const o = this.before[t];
				o && !await o.apply(this, n) || e.apply(this, n);
			};
		}
		const ze = Object.keys(ot);
		const wt = {};
		for (let e = 0; e < ze.length; e++) {
			const t = ze[e];
			wt[t] = Qo(ot[t], t);
		}
		const es = {
			getObjById: ce,
			generateNewObj: Et,
			layout: Lt,
			linkDiv: Wn,
			editTopic: It,
			createWrapper: Pt,
			createParent: Ot,
			createChildren: $t,
			createTopic: Ht,
			findEle: Je,
			changeTheme: ho,
			changeCompact: fo,
			...Mn,
			...wt,
			...To,
			...jo,
			...Zo,
			init(e) {
				if (e = JSON.parse(JSON.stringify(e)), !e || !e.nodeData) return /* @__PURE__ */ new Error("MindElixir: `data` is required");
				e.direction !== void 0 && (this.direction = e.direction), e.compact !== void 0 && (this.compact = e.compact), this.changeTheme(e.theme || this.theme, !1), e.meta && (this.meta = e.meta), this.nodeData = e.nodeData, Y(this.nodeData), this.arrows = e.arrows || [], this.summaries = e.summaries || [], this.tidyArrow(), this.toolBar && no(this), this.keypress && In(this, this.keypress), ao(this), this.disposable.push(_t()), this.contextMenu && this.disposable.push(Xn(this, this.contextMenu)), this.allowUndo && this.disposable.push(Kn(this)), this.layout(), this.linkDiv(), this.toCenter();
			},
			destroy() {
				this.disposable.forEach((e) => e()), this.el && (this.el.innerHTML = ""), this.el = void 0, this.nodeData = void 0, this.arrows = void 0, this.summaries = void 0, this.currentArrow = void 0, this.currentNodes = void 0, this.currentSummary = void 0, this.theme = void 0, this.direction = void 0, this.bus = void 0, this.container = void 0, this.map = void 0, this.lines = void 0, this.linkController = void 0, this.arrowSvg = void 0, this.P2 = void 0, this.P3 = void 0, this.line1 = void 0, this.line2 = void 0, this.nodes = void 0, this.selection?.destroy(), this.selection = void 0;
			},
			/**
			* @public
			* @param {boolean} enable
			*/
			enableMobileMultiSelect(e) {
				this.mobileMultiSelect = e;
			}
		};
		const ts = "5.15.1";
		function ns(e) {
			return {
				x: 0,
				y: 0,
				moved: !1,
				mousedown: !1,
				handlePointerDown(t) {
					this.moved = !1;
					const n = t.target, o = e.mouseSelectionButton === 0 ? 2 : 0, s = e.spacePressed && t.button === 0 && t.pointerType === "mouse", i = !e.editable || t.button === o && t.pointerType === "mouse" || t.pointerType === "touch";
					!s && !i || (this.x = t.clientX, this.y = t.clientY, n.className !== "circle" && n.contentEditable !== "plaintext-only" && (this.mousedown = !0, n.setPointerCapture(t.pointerId)));
				},
				handlePointerMove(t) {
					if (!this.mousedown || t.target.contentEditable === "plaintext-only" && !e.spacePressed) return !1;
					const n = t.clientX - this.x, o = t.clientY - this.y;
					return this.x = t.clientX, this.y = t.clientY, this.moved = !0, e.move(n, o), !0;
				},
				handlePointerUp(t) {
					if (!this.mousedown) return;
					const n = t.target;
					n.hasPointerCapture && n.hasPointerCapture(t.pointerId) && n.releasePointerCapture(t.pointerId), this.mousedown = !1;
				},
				clear() {
					this.mousedown = !1, this.moved = !1;
				}
			};
		}
		var os = class {
			static LEFT = 0;
			static RIGHT = 1;
			static SIDE = 2;
			static DOWN = 3;
			static THEME = me;
			static DARK_THEME = ye;
			/**
			* @memberof MindElixir
			* @static
			*/
			static version = ts;
			/**
			* @function
			* @memberof MindElixir
			* @static
			* @name E
			* @param {string} id Node id.
			* @return {TargetElement} Target element.
			* @example
			* E('bd4313fbac40284b')
			*/
			static E = Je;
			/**
			* @function new
			* @memberof MindElixir
			* @static
			* @param {String} topic root topic
			*/
			static new = (t) => ({ nodeData: {
				id: X(),
				topic: t || "new topic",
				children: []
			} });
			get currentNode() {
				return this.currentNodes[this.currentNodes.length - 1];
			}
			constructor({ el: t, direction: n, editable: o, contextMenu: s, toolBar: i, keypress: r, mouseSelectionButton: l, selectionContainer: a, before: c, newTopicName: h, allowUndo: d, generateMainBranch: u, generateSubBranch: p, overflowHidden: m, compact: x, theme: y, alignment: g, scaleSensitivity: v, scaleMax: C, scaleMin: T, handleWheel: D, markdown: f, imageProxy: b, pasteHandler: w, mobileMultiSelect: E }) {
				let S = null;
				const M = Object.prototype.toString.call(t);
				if (M === "[object HTMLDivElement]" ? S = t : M === "[object String]" && (S = document.querySelector(t)), !S) throw new Error("MindElixir: el is not a valid element");
				S.style.position = "relative", S.innerHTML = "", this.el = S, this.disposable = [], this.before = c || {}, this.newTopicName = h || "New Node", this.contextMenu = s ?? !0, this.toolBar = i ?? !0, this.keypress = r ?? !0, this.mouseSelectionButton = l ?? 0, this.direction = n ?? 1, this.editable = o ?? !0, this.allowUndo = d ?? !0, this.scaleSensitivity = v ?? .1, this.scaleMax = C ?? 1.4, this.scaleMin = T ?? .2, this.generateMainBranch = u || ut, this.generateSubBranch = p || pt, this.overflowHidden = m ?? !1, this.compact = x ?? !1, this.alignment = g ?? "root", this.handleWheel = D ?? !0, this.markdown = f || void 0, this.imageProxy = b || void 0, this.currentNodes = [], this.currentArrow = null, this.scaleVal = 1, this.tempDirection = null, this.mobileMultiSelect = E ?? !1, this.panHelper = ns(this), this.bus = Rn(), this.container = document.createElement("div"), this.selectionContainer = a || this.container, this.container.className = "map-container";
				const N = window.matchMedia("(prefers-color-scheme: dark)");
				this.theme = y || (N.matches ? ye : me);
				const A = document.createElement("div");
				A.className = "map-canvas", this.map = A, this.container.setAttribute("tabindex", "0"), this.container.appendChild(this.map), this.el.appendChild(this.container), this.nodes = document.createElement("me-nodes"), this.lines = U("lines"), this.summarySvg = U("summary"), this.linkController = U("linkcontroller"), this.P2 = document.createElement("div"), this.P3 = document.createElement("div"), this.P2.className = this.P3.className = "circle", this.P2.style.display = this.P3.style.display = "none", this.line1 = je(), this.line2 = je(), this.linkController.appendChild(this.line1), this.linkController.appendChild(this.line2), this.arrowSvg = U("topiclinks"), this.labelContainer = document.createElement("div"), this.labelContainer.className = "label-container", this.map.appendChild(this.nodes), this.overflowHidden ? this.container.style.overflow = "hidden" : this.disposable.push(jn(this)), w && (this.pasteHandler = w);
			}
		};
		Object.assign(os.prototype, es);
		//#endregion
		//#region src/shared/viewport.ts
		/** 计算让节点完整进入视口所需的最小平移；超大节点优先露出左上起始位置。 */
		function visibilityDelta(node, viewport, margin = 16) {
			const left = viewport.left + margin;
			const right = viewport.right - margin;
			const top = viewport.top + margin;
			const bottom = viewport.bottom - margin;
			const availableWidth = Math.max(0, right - left);
			const availableHeight = Math.max(0, bottom - top);
			let x = 0;
			let y = 0;
			if (node.width > availableWidth) x = left - node.left;
			else if (node.left < left) x = left - node.left;
			else if (node.right > right) x = right - node.right;
			if (node.height > availableHeight) y = top - node.top;
			else if (node.top < top) y = top - node.top;
			else if (node.bottom > bottom) y = bottom - node.bottom;
			return {
				x,
				y
			};
		}
		//#endregion
		//#region src/client/generated/mind-elixir-style.ts
		const MIND_ELIXIR_CSS = ".map-container p{margin:0}.map-container{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;-ms-user-select:none;user-select:none;touch-action:none;outline:none;width:100%;height:100%;font-family:-apple-system,BlinkMacSystemFont,Helvetica Neue,PingFang SC,Microsoft YaHei,Source Han Sans SC,Noto Sans CJK SC,WenQuanYi Micro Hei,sans-serif;font-size:16px;overflow:hidden}.map-container *{box-sizing:border-box}.map-container::-webkit-scrollbar{width:0;height:0}.map-container .selected{outline:2px solid var(--selected);outline-offset:1px}.map-container.space-pressed,.map-container.space-pressed *{cursor:grab!important}.map-container.space-pressed:active,.map-container.space-pressed:active *{cursor:grabbing!important}.map-container .hyper-link{margin-left:.3em;text-decoration:none}.map-container me-main>me-wrapper>me-parent>me-epd{top:calc(50% - 9px)}.map-container me-epd{top:calc(100% - 9px)}.map-container .lhs{direction:rtl}.map-container .lhs>me-wrapper>me-parent>me-epd{left:-10px}.map-container .lhs me-epd{left:5px}.map-container .lhs me-tpc{direction:ltr}.map-container .rhs>me-wrapper>me-parent>me-epd{right:-10px}.map-container .rhs me-epd{right:5px}.map-container me-nodes.down{flex-direction:column}.map-container me-nodes.down me-main{flex-direction:row;justify-content:center;align-items:flex-start;display:flex}.map-container me-nodes.down>me-main>me-wrapper{margin:var(--main-gap-x) var(--main-gap-y)}.map-container me-nodes.down me-wrapper{flex-direction:column;align-items:center;display:flex}.map-container me-nodes.down me-children{margin-top:var(--node-gap-x);flex-direction:row;justify-content:center;align-items:flex-start;display:flex}.map-container me-nodes.down me-parent{padding:0 var(--node-gap-y);margin:0}.map-container me-nodes.down me-children me-parent>me-tpc{border:1px solid var(--main-color);background-color:var(--main-bgcolor);border-radius:6px;padding:6px 12px}.map-container me-nodes.down me-epd{top:calc(100% - 9px);left:calc(50% - 9px);right:auto}.map-container me-nodes.down>me-main>me-wrapper>me-parent>me-epd{top:calc(100% - 9px);left:calc(50% - 9px);right:auto}.map-container me-nodes.down .insert-preview.before{width:14px;height:100%;top:0;left:-14px}.map-container me-nodes.down .insert-preview.after{width:14px;height:100%;top:0;left:auto;right:-14px}.map-container{background-color:var(--bgcolor)}.map-container .map-canvas{pointer-events:none;-webkit-user-select:none;-ms-user-select:none;user-select:none;width:-webkit-fit-content;width:fit-content;position:relative;transform:scale(1)}.map-container .map-canvas me-nodes{width:-webkit-max-content;width:max-content;height:-webkit-max-content;height:max-content;padding:var(--map-padding);justify-content:center;align-items:center;display:flex;position:relative}.map-container me-main>me-wrapper{margin:var(--main-gap-y) var(--main-gap-x);position:relative}.map-container me-main>me-wrapper>me-parent{margin:10px;padding:0}.map-container me-main>me-wrapper>me-parent>me-tpc{border-radius:var(--main-radius);background-color:var(--main-bgcolor);border:var(--main-border,2px solid var(--main-color));color:var(--main-color);padding:8px 25px}.map-container me-wrapper{width:-webkit-fit-content;width:fit-content;display:block}.map-container me-children{vertical-align:middle;display:inline-block}.map-container me-parent{vertical-align:middle;display:inline-block}.map-container me-root{z-index:10;margin:45px 0;position:relative}.map-container me-root me-tpc{color:var(--root-color);border-radius:var(--root-radius);border:var(--root-border-color) 2px solid;background-color:var(--root-bgcolor);padding:10px 30px;font-size:25px}.map-container me-parent{cursor:pointer;padding:6px var(--node-gap-x);margin-top:var(--node-gap-y);z-index:10;position:relative}.map-container me-parent me-tpc{color:var(--color);padding:var(--topic-padding);border-radius:3px;position:relative}.map-container me-parent me-tpc .insert-preview{z-index:9;width:100%;position:absolute;left:0}.map-container me-parent me-tpc .show{pointer-events:none;opacity:.7;background:#7ad5ff;border-radius:3px}.map-container me-parent me-tpc .before{height:14px;top:-14px}.map-container me-parent me-tpc .in{height:100%;top:0}.map-container me-parent me-tpc .after{height:14px;bottom:-14px}.map-container me-parent me-epd{opacity:.8;pointer-events:all;z-index:9;background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+CjxzdmcgdD0iMTY1NjY1NDcxNzI0MiIgY2xhc3M9Imljb24iIHZpZXdCb3g9IjAgMCAxMDI0IDEwMjQiIHZlcnNpb249IjEuMSIKICAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+CiAgICA8cGF0aCBkPSJNNTEyIDc0LjY2NjY2N0MyNzAuOTMzMzMzIDc0LjY2NjY2NyA3NC42NjY2NjcgMjcwLjkzMzMzMyA3NC42NjY2NjcgNTEyUzI3MC45MzMzMzMgOTQ5LjMzMzMzMyA1MTIgOTQ5LjMzMzMzMyA5NDkuMzMzMzMzIDc1My4wNjY2NjcgOTQ5LjMzMzMzMyA1MTIgNzUzLjA2NjY2NyA3NC42NjY2NjcgNTEyIDc0LjY2NjY2N3oiIHN0cm9rZS13aWR0aD0iNTQiIHN0cm9rZT0nYmxhY2snIGZpbGw9J3doaXRlJyA+PC9wYXRoPgogICAgPHBhdGggZD0iTTY4Mi42NjY2NjcgNDgwaC0xMzguNjY2NjY3VjM0MS4zMzMzMzNjMC0xNy4wNjY2NjctMTQuOTMzMzMzLTMyLTMyLTMycy0zMiAxNC45MzMzMzMtMzIgMzJ2MTM4LjY2NjY2N0gzNDEuMzMzMzMzYy0xNy4wNjY2NjcgMC0zMiAxNC45MzMzMzMtMzIgMzJzMTQuOTMzMzMzIDMyIDMyIDMyaDEzOC42NjY2NjdWNjgyLjY2NjY2N2MwIDE3LjA2NjY2NyAxNC45MzMzMzMgMzIgMzIgMzJzMzItMTQuOTMzMzMzIDMyLTMydi0xMzguNjY2NjY3SDY4Mi42NjY2NjdjMTcuMDY2NjY3IDAgMzItMTQuOTMzMzMzIDMyLTMycy0xNC45MzMzMzMtMzItMzItMzJ6Ij48L3BhdGg+Cjwvc3ZnPg==);background-position:50%;background-repeat:no-repeat;background-size:contain;width:18px;height:18px;position:absolute}.map-container me-parent me-epd.minus{opacity:0;transition:opacity .3s;background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+CjxzdmcgdD0iMTY1NjY1NTU2NDk4NSIgY2xhc3M9Imljb24iIHZpZXdCb3g9IjAgMCAxMDI0IDEwMjQiIHZlcnNpb249IjEuMSIKICAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+CiAgICA8cGF0aCBkPSJNNTEyIDc0LjY2NjY2N0MyNzAuOTMzMzMzIDc0LjY2NjY2NyA3NC42NjY2NjcgMjcwLjkzMzMzMyA3NC42NjY2NjcgNTEyUzI3MC45MzMzMzMgOTQ5LjMzMzMzMyA1MTIgOTQ5LjMzMzMzMyA5NDkuMzMzMzMzIDc1My4wNjY2NjcgOTQ5LjMzMzMzMyA1MTIgNzUzLjA2NjY2NyA3NC42NjY2NjcgNTEyIDc0LjY2NjY2N3oiIHN0cm9rZS13aWR0aD0iNTQiIHN0cm9rZT0nYmxhY2snIGZpbGw9J3doaXRlJyA+PC9wYXRoPgogICAgPHBhdGggZD0iTTY4Mi42NjY2NjcgNTQ0SDM0MS4zMzMzMzNjLTE3LjA2NjY2NyAwLTMyLTE0LjkzMzMzMy0zMi0zMnMxNC45MzMzMzMtMzIgMzItMzJoMzQxLjMzMzMzNGMxNy4wNjY2NjcgMCAzMiAxNC45MzMzMzMgMzIgMzJzLTE0LjkzMzMzMyAzMi0zMiAzMnoiPjwvcGF0aD4KPC9zdmc+)!important}@media (hover:hover){.map-container me-parent me-epd.minus:hover{opacity:.8}}@media (hover:none){.map-container me-parent me-epd.minus{opacity:.8}}.map-container .icon{vertical-align:-.15em;fill:currentColor;width:1em;height:1em;overflow:hidden}.map-container .lines,.map-container .summary,.map-container .subLines,.map-container .topiclinks,.map-container .linkcontroller{width:100%;height:102%;position:absolute;top:0;left:0}.map-container .topiclinks,.map-container .linkcontroller,.map-container .summary{pointer-events:none;z-index:20}.map-container .summary>g{cursor:pointer;pointer-events:stroke;z-index:20}.map-container .topiclinks>g{cursor:pointer;pointer-events:stroke;z-index:20}.map-container .label-container{z-index:21}.map-container .lines,.map-container .subLines{pointer-events:none}.map-container #input-box{-webkit-user-select:auto;-ms-user-select:auto;user-select:auto;pointer-events:auto;width:-webkit-max-content;width:max-content;max-width:35em;color:var(--color);background-color:var(--bgcolor);z-index:100;direction:ltr;border-radius:3px;outline:1px solid #ccc;position:absolute;top:0;left:0}.map-container me-tpc{white-space:pre-wrap;pointer-events:all;max-width:35em;display:block}.map-container me-tpc>*{pointer-events:none}.map-container me-tpc>a{pointer-events:auto}.map-container me-tpc>iframe{pointer-events:auto}.map-container me-tpc>.text{display:inline-block}.map-container me-tpc>.text a{pointer-events:auto}.map-container me-tpc>img{object-fit:cover;margin-bottom:8px;display:block}.map-container .circle{pointer-events:all;z-index:50;cursor:pointer;background:#757575;border:2px solid #fff;border-radius:100%;width:10px;height:10px;margin-top:-5px;margin-left:-5px;position:absolute}.map-container .circle:before{content:\"\";background:0 0;width:30px;height:30px;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}.map-container .tags{direction:ltr}.map-container .tags span{color:#276f86;background:#d6f0f8;border-radius:3px;margin:2px 4px 0 0;padding:2px 4px;font-size:12px;line-height:1.3em;display:inline-block}.map-container .icons{direction:ltr;margin-left:5px;display:inline-block}.map-container .icons span{line-height:1.3em;display:inline-block}.map-container .mind-elixir-ghost{box-sizing:content-box;opacity:.7;background-color:var(--main-bgcolor);border:2px solid var(--main-color);color:var(--main-color);white-space:nowrap;text-overflow:ellipsis;pointer-events:none;z-index:1000;border-radius:6px;width:-webkit-fit-content;width:fit-content;max-width:200px;padding:8px 16px;display:none;position:absolute;top:0;left:0;overflow:hidden}.map-container .selection-area{background:#4f90f22d;border:1px solid #4f90f2}.map-container .svg-label{overflow-wrap:break-word;-webkit-hyphens:auto;-ms-hyphens:auto;hyphens:auto;pointer-events:auto;cursor:pointer;z-index:10;width:-webkit-max-content;width:max-content;line-height:1.2;position:absolute}.map-container .svg-label p{max-width:200px}.map-container .svg-label{padding:var(--topic-padding);border-radius:3px}.map-container .svg-label[data-type=arrow]{background-color:var(--main-bgcolor-transparent)}.map-container h1{color:var(--selected);font-size:1.5rem;font-weight:700}.map-container h2{color:var(--selected);font-size:1.25rem;font-weight:600}.map-container h3{color:var(--selected);font-size:1.125rem;font-weight:600}.map-container h4{color:var(--selected);font-size:1rem;font-weight:600}.map-container h5{color:var(--selected);font-size:.875rem;font-weight:600}.map-container h6{color:var(--selected);margin:.1rem 0;font-size:.875rem;font-style:italic;font-weight:500}.map-container strong.asterisk-emphasis,.map-container em{color:var(--selected)}.map-container strong.underscore-emphasis{background:#ffeb3b40;border-radius:.15em;padding:.05em .15em}.map-container a{color:var(--selected)}.map-container a:hover{color:var(--selected);text-decoration:underline}.map-container .context-menu{z-index:99;width:100%;height:100%;position:fixed;top:0;left:0}.map-container .context-menu .menu-list{color:var(--panel-color);border-radius:5px;margin:0;padding:0;list-style:none;position:fixed;overflow:hidden;box-shadow:0 12px 15px #0003}.map-container .context-menu .menu-list li{white-space:nowrap;background:var(--panel-bgcolor);border-bottom:1px solid var(--panel-border-color);cursor:pointer;min-width:200px;padding:6px 10px;overflow:hidden}.map-container .context-menu .menu-list li span{line-height:20px}.map-container .context-menu .menu-list li a{color:#333;text-decoration:none}.map-container .context-menu .menu-list li.disabled{display:none}.map-container .context-menu .menu-list li:hover{filter:brightness(.95)}.map-container .context-menu .menu-list li:last-child{border-bottom:0}.map-container .context-menu .menu-list li span:last-child{float:right}.map-container .context-menu .key{color:#333;background-color:#f1f1f1;border-radius:3px;padding:2px 5px;font-size:10px}.map-container .tips{color:var(--panel-color);background:var(--panel-bgcolor);opacity:.8;border-radius:5px;padding:5px 10px;font-weight:700;position:absolute;bottom:28px;left:50%;transform:translate(-50%)}.mind-elixir-toolbar{color:var(--panel-color);background:var(--panel-bgcolor);border-radius:5px;padding:10px;position:absolute;box-shadow:0 1px 2px #0003}.mind-elixir-toolbar svg{display:inline-block}.mind-elixir-toolbar span:active{opacity:.5}.mind-elixir-toolbar.rb{bottom:20px;right:20px}.mind-elixir-toolbar.rb span+span{margin-left:10px}.mind-elixir-toolbar.lt{font-size:20px;top:20px;left:20px}.mind-elixir-toolbar.lt span{display:block}.mind-elixir-toolbar.lt span+span{margin-top:10px}\n";
		//#endregion
		//#region src/client/views/fit-mindmap.ts
		/** 隐藏／零尺寸时延迟首次布局，避免上游scaleFit产生0或NaN并冻结到下一次挂载。 */
		function fitVisibleMindmap(mind, size) {
			if (!Number.isFinite(size.width) || !Number.isFinite(size.height) || size.width <= 0 || size.height <= 0) return false;
			mind.scaleFit();
			const value = Number.isFinite(mind.scaleVal) ? Math.min(3, Math.max(.3, mind.scaleVal)) : 1;
			if (value !== mind.scaleVal) mind.scale(value);
			mind.toCenter();
			return true;
		}
		//#endregion
		//#region src/client/views/mindmap-view.tsx
		/**
		* 思维导图视图（Mind Map View）：mind-elixir 封装。
		*
		* 交互能力（对应需求第 9 章）：
		* - 节点展示：标题/内容摘要，角色图标；
		* - 展开 / 收起：点击展开器（'expandNode' 事件回流到视图状态）；
		* - 点击节点：'selectNodes' 事件 → select_node（同步当前节点）；
		* - 缩放：滚轮 / 触控板 + 工具栏按钮（'scale' 事件回写 View State）；
		* - 平移：拖动画布（'move' 事件回写 View State）；
		* - 聚焦：focused_node 变化 → scrollIntoView(forceCenter)；
		* - 布局切换：mind / logical / down → initSide / initRight / initDown；
		* - Node ID 与结构化文档 Node ID 一致（adapter 保证）。
		*
		* 设计约束：本插件视图状态是唯一权威（不依赖 mind-elixir 内部数据），
		* 所有用户操作通过事件回流更新 View State 后整体 refresh。
		*/
		/** 主题（浅色，贴合 DSH Web 界面）。 */
		const LIGHT_THEME = {
			name: "dsh-light",
			type: "light",
			palette: [
				"#4f6ef7",
				"#2e9e6b",
				"#e0813c",
				"#a06ee1",
				"#3ba6c9",
				"#c94f4f"
			],
			cssVar: {
				"--main-color": "#4f6ef7",
				"--main-bgcolor": "#eef2ff",
				"--main-bgcolor-transparent": "rgba(238, 242, 255, 0.4)",
				"--color": "#333",
				"--bgcolor": "#fff",
				"--selected": "#4f6ef7",
				"--accent-color": "#ff7a00"
			}
		};
		/** 把框架无关模型转为 mind-elixir 数据。 */
		function toMindElixirData(model) {
			const mapNode = (node) => {
				const icon = model.roleIcons[node.role] ?? "";
				return {
					id: node.id,
					topic: icon !== "" ? `${icon} ${node.topic}` : node.topic,
					expanded: node.expanded,
					children: node.children.map(mapNode)
				};
			};
			return {
				nodeData: mapNode(model.root),
				direction: model.direction,
				theme: LIGHT_THEME
			};
		}
		/** 样式注入标记（避免重复注入）。 */
		const STYLE_ID = "dsh-sdv-mindelixir-style";
		function nextFrame() {
			return new Promise((resolve) => requestAnimationFrame(() => resolve()));
		}
		/** 思维导图视图组件。 */
		function MindMapView(props) {
			const { model, document: structuredDocument, state, onSelectNode, onOpenNode, onToggleNode, onViewStateChange, onViewportReady, onCommand } = props;
			const containerRef = (0, react.useRef)(null);
			const mindRef = (0, react.useRef)(null);
			const [currentZoom, setCurrentZoom] = (0, react.useState)(1);
			const currentZoomRef = (0, react.useRef)(1);
			const renderedLayoutRef = (0, react.useRef)(void 0);
			const renderedDataRef = (0, react.useRef)(void 0);
			const selectionRequestRef = (0, react.useRef)(0);
			const suppressSelectRef = (0, react.useRef)(false);
			const selectedNodeRef = (0, react.useRef)(state.selectedNodeId);
			selectedNodeRef.current = state.selectedNodeId;
			const renderedModelKey = JSON.stringify(model.root);
			(0, react.useEffect)(() => {
				const container = containerRef.current;
				if (container === null) return;
				if (document.getElementById(STYLE_ID) === null) {
					const style = document.createElement("style");
					style.id = STYLE_ID;
					style.textContent = MIND_ELIXIR_CSS;
					document.head.appendChild(style);
				}
				let disposed = false;
				const mind = new os({
					el: container,
					editable: false,
					direction: model.direction,
					theme: LIGHT_THEME,
					contextMenu: false,
					toolBar: false,
					keypress: false,
					allowUndo: false,
					mouseSelectionButton: 0,
					scaleMin: .3,
					scaleMax: 3
				});
				mindRef.current = mind;
				renderedLayoutRef.current = model.layout;
				try {
					const data = toMindElixirData(model);
					mind.init(data);
					renderedDataRef.current = JSON.stringify(data.nodeData);
				} catch (error) {
					console.error("[dsh-structured-document-view] mind-elixir init 失败：", error);
					mindRef.current = null;
					return;
				}
				mind.bus.addListener("selectNodes", (nodes) => {
					const node = nodes[0];
					if (node !== void 0 && !disposed && !suppressSelectRef.current) onSelectNode(node.id);
				});
				mind.bus.addListener("expandNode", (node) => {
					if (!disposed) onToggleNode(node.id);
				});
				const handleDoubleClick = (event) => {
					const raw = (event.target?.closest("me-tpc[data-nodeid]"))?.dataset.nodeid;
					if (raw?.startsWith("me") === true) onOpenNode(raw.slice(2));
				};
				mind.container.addEventListener("dblclick", handleDoubleClick);
				mind.bus.addListener("scale", (scale) => {
					currentZoomRef.current = scale;
					setCurrentZoom(scale);
					if (!disposed) onViewStateChange({ zoom: scale });
				});
				mind.bus.addListener("move", (data) => {
					if (!disposed) onViewStateChange({ pan: {
						x: data.dx,
						y: data.dy
					} });
				});
				let fitted = fitVisibleMindmap(mind, container.getBoundingClientRect());
				const selectAndLocate = async (nodeId, mode) => {
					const request = ++selectionRequestRef.current;
					await nextFrame();
					if (disposed || request !== selectionRequestRef.current) return {
						ok: false,
						code: "INTERNAL_ERROR",
						message: "定位请求已被更新的选择替代。"
					};
					const el = mind.findEle(nodeId);
					if (el === void 0 || el === null) return {
						ok: false,
						code: "NODE_HIDDEN",
						message: "目标节点当前被收起、层级限制或筛选隐藏。"
					};
					suppressSelectRef.current = true;
					try {
						mind.selectNode(el);
						if (mode === "center") mind.scrollIntoView(el, true);
						else {
							const delta = visibilityDelta(el.getBoundingClientRect(), mind.container.getBoundingClientRect());
							if (delta.x !== 0 || delta.y !== 0) mind.move(delta.x, delta.y, true);
						}
					} finally {
						suppressSelectRef.current = false;
					}
					await nextFrame();
					return {
						ok: true,
						code: "OK",
						message: mode === "center" ? "已将节点移到画布中央。" : "已确保节点在可视范围内。",
						value: { nodeId }
					};
				};
				const unregisterViewport = onViewportReady({
					focusNode: selectAndLocate,
					setZoom: async (command) => {
						const target = command.zoom ?? currentZoomRef.current * (command.factor ?? 1);
						const zoom = Math.min(3, Math.max(.3, target));
						mind.scale(zoom);
						await nextFrame();
						return {
							ok: true,
							code: "OK",
							message: `已缩放到 ${Math.round(zoom * 100)}%。`,
							value: { zoom }
						};
					},
					fitView: async () => {
						if (!fitVisibleMindmap(mind, container.getBoundingClientRect())) return {
							ok: false,
							code: "INTERNAL_ERROR",
							message: "导图画布尚无可用尺寸，请展开面板后重试。"
						};
						fitted = true;
						await nextFrame();
						return {
							ok: true,
							code: "OK",
							message: "已显示当前全部可见内容。",
							value: { zoom: currentZoomRef.current }
						};
					},
					resetViewport: async () => {
						mind.scale(1);
						mind.toCenter();
						await nextFrame();
						return {
							ok: true,
							code: "OK",
							message: "已将视口恢复为 100% 并居中根节点。",
							value: { zoom: 1 }
						};
					}
				});
				const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
					if (!fitted) fitted = fitVisibleMindmap(mind, container.getBoundingClientRect());
					const selected = selectedNodeRef.current;
					if (selected !== null) selectAndLocate(selected, "visible");
				});
				observer?.observe(container);
				return () => {
					disposed = true;
					observer?.disconnect();
					unregisterViewport();
					try {
						mind.bus.removeListener("selectNodes", () => void 0);
					} catch {}
					mind.container.removeEventListener("dblclick", handleDoubleClick);
					try {
						mind.destroy();
					} catch {}
					mindRef.current = null;
				};
			}, []);
			(0, react.useEffect)(() => {
				const mind = mindRef.current;
				if (mind === null) return;
				const data = toMindElixirData(model);
				const dataKey = JSON.stringify(data.nodeData);
				const layoutChanged = renderedLayoutRef.current !== model.layout;
				const dataChanged = renderedDataRef.current !== dataKey;
				if (!layoutChanged && !dataChanged) return;
				if (layoutChanged) {
					renderedLayoutRef.current = model.layout;
					try {
						if (model.layout === "logical") mind.initRight();
						else if (model.layout === "down") mind.initDown();
						else mind.initSide();
					} catch (error) {
						console.error("[dsh-structured-document-view] 布局切换失败：", error);
					}
				}
				try {
					mind.refresh(data);
					renderedDataRef.current = dataKey;
					if (layoutChanged) mind.toCenter();
				} catch (error) {
					console.error("[dsh-structured-document-view] 刷新思维导图失败：", error);
				}
			}, [model]);
			(0, react.useEffect)(() => {
				const mind = mindRef.current;
				const selected = state.selectedNodeId;
				if (mind === null || selected === null) return;
				const request = ++selectionRequestRef.current;
				requestAnimationFrame(() => {
					if (request !== selectionRequestRef.current) return;
					const el = mind.findEle(selected);
					if (el === void 0 || el === null) return;
					suppressSelectRef.current = true;
					try {
						mind.selectNode(el);
						const delta = visibilityDelta(el.getBoundingClientRect(), mind.container.getBoundingClientRect());
						if (delta.x !== 0 || delta.y !== 0) mind.move(delta.x, delta.y, true);
					} finally {
						suppressSelectRef.current = false;
					}
				});
			}, [
				state.selectedNodeId,
				renderedModelKey,
				model.layout
			]);
			const selected = state.selectedNodeId === null ? null : findNodeWithPath(structuredDocument.root, state.selectedNodeId);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "sdv-mindmap",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "sdv-mindmap-toolbar",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "sdv-btn",
								onClick: () => void onCommand({
									name: "set_zoom",
									factor: 1.25
								}),
								title: "放大",
								children: "＋"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "sdv-btn",
								onClick: () => void onCommand({
									name: "set_zoom",
									factor: .8
								}),
								title: "缩小",
								children: "－"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "sdv-btn",
								onClick: () => void onCommand({ name: "fit_view" }),
								title: "自适应",
								children: "⤢"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "sdv-btn",
								onClick: () => void onCommand({ name: "reset_viewport" }),
								title: "重置视口",
								children: "⟳"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "sdv-mindmap-zoom",
								children: [Math.round(currentZoom * 100), "%"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "sdv-mindmap-hint",
								children: "滚轮缩放 · 拖动画布平移 · 点击节点选中"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						ref: containerRef,
						className: "sdv-mindmap-canvas"
					}),
					selected !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "sdv-mindmap-preview",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: selected.node.title }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: selected.path.map((node) => node.title).join(" / ") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: summarizeNode(selected.node) })
						] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "sdv-btn",
							type: "button",
							onClick: () => onOpenNode(selected.node.id),
							children: "打开正文"
						})]
					})
				]
			});
		}
		function findNodeWithPath(root, id, path = []) {
			const current = [...path, root];
			if (root.id === id) return {
				node: root,
				path: current
			};
			for (const child of root.children) {
				const found = findNodeWithPath(child, id, current);
				if (found !== null) return found;
			}
			return null;
		}
		function summarizeNode(node) {
			const text = node.content.replace(/\s+/g, " ").trim();
			if (text === "") return node.children.length > 0 ? `包含 ${node.children.length} 个子章节` : "本节点没有正文。";
			return text.length > 120 ? `${text.slice(0, 120)}…` : text;
		}
		//#endregion
		//#region src/client/adapters/table.ts
		/** 角色名 → 中文标签（V0.1 内置；未来可由 Profile 定义驱动）。 */
		const ROLE_LABELS = {
			note: "笔记",
			topic: "议题",
			discussion: "讨论",
			problem: "问题",
			conclusion: "结论",
			decision: "决定",
			action_item: "待办",
			objective: "目标",
			key_result: "关键结果",
			milestone: "阶段",
			task: "任务",
			issue: "问题",
			risk: "风险",
			idea: "想法",
			solution: "方案",
			question: "疑问"
		};
		/** 角色展示名。 */
		function roleLabel(role) {
			return ROLE_LABELS[role] ?? role;
		}
		/** 把属性转成便于展示的值。 */
		function propertyDisplay(value) {
			if (typeof value === "boolean") return value ? "是" : "否";
			return value;
		}
		/** 计算表格数据。 */
		function toTableViewModel(document, state) {
			const rows = flattenViewTree(buildViewTreeFor(document, state, "table", { ignoreCollapse: true })).filter((node) => node.visible).map((node) => {
				const { node: docNode, level } = node;
				return {
					id: docNode.id,
					role: docNode.role,
					title: nodeDisplayTitle(docNode),
					content: summarize(docNode.content, 80),
					properties: { ...docNode.properties },
					level
				};
			});
			const groups = [];
			const groupByRole = /* @__PURE__ */ new Map();
			for (const row of rows) {
				let group = groupByRole.get(row.role);
				if (group === void 0) {
					group = {
						role: row.role,
						rows: [],
						propertyKeys: []
					};
					groupByRole.set(row.role, group);
					groups.push(group);
				}
				group.rows.push(row);
				for (const key of Object.keys(row.properties)) if (!group.propertyKeys.includes(key)) group.propertyKeys.push(key);
			}
			return {
				title: document.title,
				profile: document.profile,
				groups,
				totalRows: rows.length
			};
		}
		/** 导出（供测试与工具输出）。 */
		function rowProperty(row, key) {
			const value = row.properties[key];
			return value === void 0 ? void 0 : propertyDisplay(value);
		}
		//#endregion
		//#region src/client/views/table-view.tsx
		/**
		* 表格视图（Table View）：按角色分组展示节点与属性。
		*/
		/** 表格视图组件。 */
		function TableView({ runtime, state }) {
			const document = runtime.bridge.getDocument();
			if (document === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "sdv-empty",
				children: "当前没有可展示的文档。"
			});
			const model = toTableViewModel(document, state);
			if (model.totalRows === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "sdv-empty",
				children: "当前筛选下没有可展示的行。"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "sdv-table-scroll",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "sdv-table-summary",
					children: [
						"共 ",
						model.totalRows,
						" 行 · 按角色分组",
						state.filter !== null ? "（已筛选）" : ""
					]
				}), model.groups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: "sdv-table-group",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: "sdv-table-group-title",
						children: roleLabel(group.role)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: "sdv-table",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "标题" }),
							group.propertyKeys.map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: key }, key)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "内容" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "层级" })
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: group.rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
							className: row.id === state.selectedNodeId ? "sdv-row-selected" : "",
							onClick: () => runtime.handleUserSelectNode(row.id),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "sdv-cell-title",
									children: row.title
								}),
								group.propertyKeys.map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: String(rowProperty(row, key) ?? "") }, key)),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "sdv-cell-content",
									children: row.content
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "sdv-cell-level",
									children: row.level
								})
							]
						}, row.id)) })]
					})]
				}, group.role))]
			});
		}
		//#endregion
		//#region src/shared/command-guide.ts
		/** UI 与 get_view_help 共用的自然语言指令目录。 */
		const VIEW_COMMAND_GUIDE = [
			{
				id: "find-current",
				level: "simple",
				phrase: "找到当前节点",
				description: "节点看不全时移入可视范围。",
				commands: [{
					name: "focus_node",
					mode: "visible"
				}],
				needsSelection: true,
				views: ["mindmap"]
			},
			{
				id: "center-current",
				level: "simple",
				phrase: "把当前节点移到中间",
				description: "将当前节点放到画布中央。",
				commands: [{
					name: "focus_node",
					mode: "center"
				}],
				needsSelection: true,
				views: ["mindmap"]
			},
			{
				id: "fit",
				level: "simple",
				phrase: "显示全图",
				description: "适配当前已经显示的全部内容。",
				commands: [{ name: "fit_view" }],
				views: ["mindmap"]
			},
			{
				id: "zoom-in",
				level: "simple",
				phrase: "放大一点",
				description: "在当前比例上放大 25%。",
				commands: [{
					name: "set_zoom",
					factor: 1.25
				}],
				views: ["mindmap"]
			},
			{
				id: "zoom-out",
				level: "simple",
				phrase: "缩小一点",
				description: "在当前比例上缩小 20%。",
				commands: [{
					name: "set_zoom",
					factor: .8
				}],
				views: ["mindmap"]
			},
			{
				id: "reset-viewport",
				level: "simple",
				phrase: "重置视口",
				description: "恢复 100%，并将根节点居中。",
				commands: [{ name: "reset_viewport" }],
				views: ["mindmap"]
			},
			{
				id: "right-layout",
				level: "simple",
				phrase: "节点全部放到右边",
				description: "切换为右侧单向布局。",
				commands: [{
					name: "set_layout",
					layout: "logical"
				}],
				views: ["mindmap"]
			},
			{
				id: "two-levels",
				level: "simple",
				phrase: "只显示两层",
				description: "将显示深度限制为两层。",
				commands: [{
					name: "set_depth",
					depth: 2
				}]
			},
			{
				id: "expand-current",
				level: "simple",
				phrase: "展开当前节点",
				description: "显示当前节点的子节点。",
				commands: [{ name: "expand_node" }],
				needsSelection: true
			},
			{
				id: "collapse-current",
				level: "simple",
				phrase: "收起当前节点",
				description: "隐藏当前节点的子节点。",
				commands: [{ name: "collapse_node" }],
				needsSelection: true
			},
			{
				id: "mindmap",
				level: "simple",
				phrase: "切成思维导图",
				description: "查看文档结构。",
				commands: [{
					name: "set_view",
					view: "mindmap"
				}]
			},
			{
				id: "open-current",
				level: "simple",
				phrase: "打开当前章节",
				description: "在阅读器中显示当前节点及其全部子节点。",
				commands: [{ name: "open_node" }],
				needsSelection: true
			},
			{
				id: "whole-document",
				level: "simple",
				phrase: "查看全文",
				description: "显示整篇文档并定位当前节点。",
				commands: [{
					name: "set_reader_mode",
					mode: "document"
				}]
			},
			{
				id: "next-section",
				level: "simple",
				phrase: "下一节",
				description: "打开同一父节点下的下一个章节。",
				commands: [{
					name: "navigate_section",
					direction: "next"
				}],
				needsSelection: true
			},
			{
				id: "reset-view",
				level: "simple",
				phrase: "恢复默认视图",
				description: "恢复默认视图设置并保留当前节点。",
				commands: [{ name: "reset_view" }]
			},
			{
				id: "filter-tasks",
				level: "simple",
				phrase: "只看任务",
				description: "筛选出任务节点（项目文档）。",
				commands: [{
					name: "set_filter",
					filter: { role: "task" }
				}]
			},
			{
				id: "filter-risks",
				level: "simple",
				phrase: "只看风险",
				description: "筛选出风险节点（项目文档）。",
				commands: [{
					name: "set_filter",
					filter: { role: "risk" }
				}]
			},
			{
				id: "filter-in-progress-tasks",
				level: "simple",
				phrase: "只看进行中的任务",
				description: "按角色与状态 AND 组合筛选（项目文档）。",
				commands: [{
					name: "set_filter",
					filter: {
						role: "task",
						properties: { status: "进行中" }
					}
				}]
			},
			{
				id: "filter-in-progress-strategies",
				level: "simple",
				phrase: "只看进行中的策略",
				description: "按角色与状态 AND 组合筛选（项目文档）。",
				commands: [{
					name: "set_filter",
					filter: {
						role: "strategy",
						properties: { status: "进行中" }
					}
				}]
			},
			{
				id: "clear-filter",
				level: "simple",
				phrase: "清除筛选",
				description: "取消角色/属性筛选，显示全部节点。",
				commands: [{
					name: "set_filter",
					filter: null
				}]
			},
			{
				id: "right-two-fit",
				level: "combined",
				phrase: "切成右侧思维导图，只显示两层，再显示全图",
				description: "依次切换视图、布局、层级并适配画布。",
				commands: [
					{
						name: "set_view",
						view: "mindmap"
					},
					{
						name: "set_layout",
						layout: "logical"
					},
					{
						name: "set_depth",
						depth: 2
					},
					{ name: "fit_view" }
				]
			},
			{
				id: "expand-center",
				level: "combined",
				phrase: "展开当前节点，再把它移到中间",
				description: "展开并居中当前节点。",
				commands: [{ name: "expand_node" }, {
					name: "focus_node",
					mode: "center"
				}],
				needsSelection: true
			},
			{
				id: "clear-find-target",
				level: "combined",
				phrase: "清除筛选，切成思维导图，再找到〈节点标题〉",
				description: "选择目标后清除筛选并定位。",
				commands: [{
					name: "set_filter",
					filter: null
				}, {
					name: "set_view",
					view: "mindmap"
				}],
				needsTarget: true
			}
		];
		//#endregion
		//#region src/client/views/command-guide.tsx
		function nodeOptions(document) {
			if (document === null) return [];
			const result = [];
			const visit = (node, parents) => {
				const title = node.title.trim() || node.content.trim().slice(0, 30) || node.id;
				const path = [...parents, title];
				result.push({
					id: node.id,
					label: path.join(" › ")
				});
				for (const child of node.children) visit(child, path);
			};
			visit(document.root, []);
			return result;
		}
		function CommandGuide({ runtime, state, document }) {
			const [expanded, setExpanded] = (0, react.useState)(false);
			const [query, setQuery] = (0, react.useState)("");
			const [target, setTarget] = (0, react.useState)("");
			const [targetQuery, setTargetQuery] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(null);
			const [status, setStatus] = (0, react.useState)("");
			const options = (0, react.useMemo)(() => nodeOptions(document), [document]);
			const filteredOptions = options.filter((option) => targetQuery.trim() === "" || option.label.includes(targetQuery.trim()));
			const selectedTitle = runtime.bridge.getSelectedNode()?.title;
			const entries = VIEW_COMMAND_GUIDE.filter((entry) => query.trim() === "" || `${entry.phrase}${entry.description}`.includes(query.trim()));
			const quickIds = state.currentView === "mindmap" ? [
				"find-current",
				"fit",
				"zoom-in"
			] : [
				"mindmap",
				"two-levels",
				"reset-view"
			];
			const execute = async (entry) => {
				if (busy !== null) return;
				if (entry.needsSelection && state.selectedNodeId === null) {
					setStatus("请先在文档或视图中选择一个节点。");
					return;
				}
				if (entry.needsTarget && target === "") {
					setStatus("请先选择要查找的节点。");
					return;
				}
				setBusy(entry.id);
				setStatus("正在执行…");
				const commands = [...entry.commands];
				if (entry.needsTarget) commands.push({
					name: "focus_node",
					node: target,
					mode: "visible"
				});
				const completed = [];
				try {
					for (const command of commands) {
						const result = await runtime.applyCommandAsync(command);
						if (!result.ok) {
							setStatus(`${completed.length > 0 ? `已完成 ${completed.length} 步；` : ""}${result.message}`);
							return;
						}
						completed.push(result.message);
					}
					setStatus("已执行：" + entry.phrase.replace("〈节点标题〉", options.find((option) => option.id === target)?.label ?? "目标节点"));
				} finally {
					setBusy(null);
				}
			};
			const copy = async (entry) => {
				const phrase = entry.phrase.replace("〈节点标题〉", options.find((option) => option.id === target)?.label ?? "节点标题");
				try {
					await navigator.clipboard.writeText(phrase);
					setStatus("已复制：" + phrase);
				} catch {
					setStatus("复制失败，请直接选择上面的指令文字复制。");
				}
			};
			const renderEntry = (entry) => {
				const disabled = busy !== null || entry.needsSelection === true && state.selectedNodeId === null || entry.needsTarget === true && target === "";
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "sdv-guide-entry",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "sdv-guide-copy-text",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: entry.phrase }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: entry.description })]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "sdv-guide-actions",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "sdv-btn",
							disabled,
							onClick: () => void execute(entry),
							children: busy === entry.id ? "执行中" : "执行"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "sdv-btn",
							onClick: () => void copy(entry),
							children: "复制"
						})]
					})]
				}, entry.id);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "sdv-guide",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "sdv-guide-quick",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "sdv-guide-label",
							children: "你可以这样说："
						}),
						quickIds.map((id) => {
							const entry = VIEW_COMMAND_GUIDE.find((item) => item.id === id);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "sdv-guide-chip",
								disabled: entry.needsSelection === true && state.selectedNodeId === null,
								onClick: () => void execute(entry),
								children: entry.phrase
							}, id);
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "sdv-guide-more",
							"aria-expanded": expanded,
							onClick: () => setExpanded((value) => !value),
							children: expanded ? "收起" : "更多说法"
						})
					]
				}), expanded && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "sdv-guide-panel",
					"aria-label": "自然语言视图指令指南",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "sdv-guide-context",
							children: ["可通过现有语音输入照着说，也可直接点击执行。当前节点：", selectedTitle ?? "未选择"]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "sdv-guide-controls",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "sdv-guide-search",
									value: query,
									onChange: (event) => setQuery(event.target.value),
									placeholder: "搜索指令",
									"aria-label": "搜索指令"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "sdv-guide-search",
									value: targetQuery,
									onChange: (event) => setTargetQuery(event.target.value),
									placeholder: "搜索节点",
									"aria-label": "搜索目标节点"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: "sdv-select",
									value: target,
									onChange: (event) => setTarget(event.target.value),
									"aria-label": "选择目标节点",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: "选择目标节点…"
									}), filteredOptions.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: option.id,
										children: option.label
									}, option.id))]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: "简单指令" }),
						entries.filter((entry) => entry.level === "simple").map(renderEntry),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: "组合指令" }),
						entries.filter((entry) => entry.level === "combined").map(renderEntry),
						status !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "sdv-guide-status",
							role: "status",
							children: status
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/views/tab-view.tsx
		/**
		* TabView（结构化文档视图页）：better-sidebar 侧边栏页的根组件。
		*
		* 顶部工具栏：视图切换 / 文档切换（Mock）/ 层级 / 布局 / 筛选 / 重置；
		* 内容区：按当前视图渲染 Markdown / 思维导图 / 表格。
		* 用户交互全部走 ViewRuntime（更新视图状态并镜像到宿主）。
		*/
		/** 每个视图的订阅集合（无变化即无重渲染）。 */
		function subscribeToRuntime(runtime, callback) {
			const offStore = runtime.store.subscribe(callback);
			const offBridge = runtime.bridge.subscribe(callback);
			const offRuntime = runtime.subscribe(callback);
			return () => {
				offStore();
				offBridge();
				offRuntime();
			};
		}
		function TabView(props) {
			const { scope, visible, manager } = props;
			const runtime = (0, react.useMemo)(() => manager.ensureRuntime(scope.sessionId), [manager, scope.sessionId]);
			(0, react.useEffect)(() => {
				if (visible) manager.setActiveSession(scope.sessionId);
			}, [
				manager,
				scope.sessionId,
				visible
			]);
			(0, react.useSyncExternalStore)((callback) => subscribeToRuntime(runtime, callback), () => runtime.store.getState(), () => runtime.store.getState());
			if (!visible) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "sdv-tab" });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ViewPanel, { runtime });
		}
		/** 视图面板（工具栏 + 内容区）。 */
		function ViewPanel({ runtime }) {
			const state = runtime.store.getState();
			const source = runtime.getSource();
			const document = runtime.bridge.getDocument();
			const selected = runtime.bridge.getSelectedNode();
			const switchView = (view) => {
				runtime.applyCommand({
					name: "set_view",
					view
				});
			};
			const resetView = () => {
				runtime.applyCommand({ name: "reset_view" });
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "sdv-tab",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "sdv-toolbar",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "sdv-toolbar-group",
								role: "group",
								"aria-label": "视图切换",
								children: VIEW_NAMES.map((view) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: `sdv-btn ${state.currentView === view ? "sdv-btn-active" : ""}`,
									onClick: () => switchView(view),
									title: VIEW_LABELS[view],
									children: VIEW_LABELS[view]
								}, view))
							}),
							source === "mock" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "sdv-toolbar-group",
								role: "group",
								"aria-label": "文档切换",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
									className: "sdv-select",
									value: runtime.mockProvider.getActiveDocumentId(),
									onChange: (event) => runtime.setActiveDocument(event.target.value),
									title: "切换示例文档（Mock Provider）",
									children: runtime.mockProvider.listDocuments().map((doc) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: doc.id,
										children: doc.label
									}, doc.id))
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "sdv-toolbar-group",
								role: "group",
								"aria-label": "显示层级",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: "sdv-select",
									value: state.depth === null ? 0 : state.depth,
									onChange: (event) => {
										const depth = Number(event.target.value);
										runtime.applyCommand({
											name: "set_depth",
											depth: depth === 0 ? null : depth
										});
									},
									title: "显示层级（0 = 不限）",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 0,
											children: "不限层级"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 1,
											children: "1 层"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 2,
											children: "2 层"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 3,
											children: "3 层"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 4,
											children: "4 层"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: 5,
											children: "5 层"
										})
									]
								})
							}),
							state.currentView === "mindmap" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "sdv-toolbar-group",
								role: "group",
								"aria-label": "思维导图布局",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
									className: "sdv-select",
									value: state.layout,
									onChange: (event) => runtime.applyCommand({
										name: "set_layout",
										layout: event.target.value
									}),
									title: "思维导图布局",
									children: MIND_MAP_LAYOUTS.map((layout) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: layout,
										children: LAYOUT_LABELS[layout]
									}, layout))
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "sdv-toolbar-group",
								role: "group",
								"aria-label": "筛选",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: "sdv-select",
									value: state.filter?.role ?? "",
									onChange: (event) => {
										const role = event.target.value;
										runtime.applyCommand({
											name: "set_filter",
											filter: role === "" ? null : { role }
										});
									},
									title: "按角色筛选",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: "无筛选"
									}), documentRoles(document).map((role) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: role,
										children: role
									}, role))]
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "sdv-btn",
								onClick: resetView,
								title: "恢复默认视图",
								children: "恢复默认"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "sdv-statusbar",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "sdv-status-doc",
							children: [
								source === "connecting" ? "正在连接视图桥…" : document === null ? "无文档" : document.title,
								source === "connecting" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "sdv-status-meta",
									children: "（等待宿主应答 hello；数据源未就绪）"
								}),
								source !== "connecting" && document !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "sdv-status-meta",
									children: source === "host" ? `（结构化文档 · ${baseName(runtime.currentFile)} · revision ${document.revision}）` : `（示例数据（未安装结构化文档内核） · revision ${document.revision}）`
								}),
								source === "host" && document === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "sdv-status-meta",
									children: "（在侧边栏打开一个 Markdown 结构化文档）"
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "sdv-status-selected",
							children: ["当前节点：", selected !== null ? `${selected.title}（${selected.id}）` : "（无）"]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommandGuide, {
						runtime,
						state,
						document
					}),
					source === "mock" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "sdv-sample-banner",
						role: "note",
						children: "示例数据：宿主未安装结构化文档内核（dsh-structured-document），以下为内置示例，不是你的文档。"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "sdv-content",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContentView, {
							runtime,
							state,
							source
						})
					})
				]
			});
		}
		/** 内容区：按数据源状态与当前视图渲染。 */
		function ContentView({ runtime, state, source }) {
			if (source === "connecting") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "sdv-empty",
				children: "正在连接视图桥…（尚未收到宿主应答，不展示任何文档）"
			});
			switch (state.currentView) {
				case "mindmap": {
					const document = runtime.bridge.getDocument();
					if (document === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "sdv-empty",
						children: "当前没有可展示的文档。"
					});
					const model = toMindMapViewModel(document, state);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MindMapView, {
						model,
						document,
						state,
						onSelectNode: (nodeId) => runtime.handleUserSelectNode(nodeId),
						onOpenNode: (nodeId) => runtime.handleUserOpenNode(nodeId),
						onToggleNode: (nodeId) => runtime.handleUserToggleNode(nodeId),
						onViewStateChange: (patch) => runtime.applyViewStateChange(patch),
						onViewportReady: (controller) => runtime.registerViewportController(controller),
						onCommand: (command) => runtime.applyCommandAsync(command)
					});
				}
				case "table": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TableView, {
					runtime,
					state
				});
				default: return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarkdownView, {
					runtime,
					state
				});
			}
		}
		/** 收集文档中出现过的角色（用于筛选下拉）。 */
		function documentRoles(document) {
			if (document === null) return [];
			const roles = [];
			const visit = (node) => {
				if (node.role !== "" && !roles.includes(node.role)) roles.push(node.role);
				for (const child of node.children) visit(child);
			};
			visit(document.root);
			return roles;
		}
		/** 取路径最后一段（状态栏展示）。 */
		function baseName(path) {
			if (path === null || path === "") return "（未绑定）";
			const parts = path.split(/[\\/]/);
			return parts[parts.length - 1] ?? path;
		}
		//#endregion
		//#region src/client/plugin-style.ts
		/**
		* 本插件视图 UI 的样式（自包含，客户端注入）。
		* 与 mind-elixir 的样式（generated/mind-elixir-style.ts）分离。
		*/
		const PLUGIN_STYLE = `
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
  overflow: auto;
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
/* 示例数据提示条（仅 mock 状态显示，SPEC F010 / A2） */
.sdv-sample-banner {
  flex: none;
  margin: 0 10px 6px;
  padding: 6px 8px;
  border: 1px solid rgba(200,140,0,.45);
  border-radius: 4px;
  background: rgba(200,140,0,.10);
  color: inherit;
  font-size: 12px;
  line-height: 1.45;
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
  min-height: 260px;
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
`;
		/** 注入插件样式（幂等）。 */
		function injectPluginStyle() {
			if (typeof document === "undefined") return;
			if (document.getElementById("dsh-sdv-plugin-style") !== null) return;
			const style = document.createElement("style");
			style.id = "dsh-sdv-plugin-style";
			style.textContent = PLUGIN_STYLE;
			document.head.appendChild(style);
		}
		//#endregion
		//#region src/client/sidebar-file.ts
		/** 是否为打开的"文件"标签页（编辑器标签 + 非文件夹窗口）。 */
		function isEditorFileTab(tab) {
			if (tab.type !== "editor") return false;
			if (typeof tab.path !== "string" || tab.path === "") return false;
			const meta = tab.meta;
			if (meta !== null && typeof meta === "object" && meta.dir === true) return false;
			return true;
		}
		/** 一棵分栏树的所有叶子（深度优先，稳定顺序）。 */
		function leavesOf(node) {
			if (node.kind === "leaf") return [node];
			return node.children.flatMap(leavesOf);
		}
		/** 右侧面板与底部面板的全部叶子。 */
		function allLeaves(state) {
			return leavesOf(state.bottomSplits);
		}
		/** 当前活动的编辑器文件路径；无则 null。 */
		function activeFileOf(state) {
			if (state === void 0) return null;
			const leaves = allLeaves(state);
			const activeLeaf = leaves.find((leaf) => leaf.id === state.activePane) ?? leaves[0];
			if (activeLeaf !== void 0 && activeLeaf.active !== null) {
				const tab = activeLeaf.tabs.find((t) => t.id === activeLeaf.active);
				if (tab !== void 0 && isEditorFileTab(tab)) return tab.path;
			}
			for (const leaf of leaves) {
				if (leaf.active === null) continue;
				const tab = leaf.tabs.find((t) => t.id === leaf.active);
				if (tab !== void 0 && isEditorFileTab(tab)) return tab.path;
			}
			return null;
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* 客户端半区的服务依赖：仅在 `ctx.betterSidebar` 可用时激活（软依赖，
		* 与 dsh-better-sidebar-controller 客户端入口同款模式）。
		*/
		const inject = ["betterSidebar"];
		/** 会话是否合法（非空字符串）。 */
		function validSessionId(value) {
			return typeof value === "string" && value !== "";
		}
		/** 是否为结构化文档源文件（Markdown；仅此类文件联动 dsh-structured-document）。 */
		function isMarkdownFile(path) {
			return typeof path === "string" && /\.(md|markdown)$/i.test(path);
		}
		/** 客户端插件主体。 */
		function apply(ctx) {
			ctx.effect(() => {
				const service = ctx.betterSidebar;
				const manager = new ViewSessionManager();
				let lastSessionId;
				injectPluginStyle();
				const adapter = new SidebarAdapter({
					service,
					component: () => (props) => (0, react.createElement)(TabView, {
						...props,
						manager
					})
				});
				manager.setOpenTabHandler(() => adapter.openViewTab());
				manager.setViewDefaultsReader(() => adapter.readViewDefaults());
				const disposers = [adapter.registerTab()];
				const onChange = () => {
					const snapshot = service.getSnapshot();
					const nextSession = snapshot.sessionId;
					if (validSessionId(nextSession)) {
						if (nextSession !== lastSessionId) {
							lastSessionId = nextSession;
							manager.setActiveSession(nextSession);
							if (adapter.shouldAutoOpenTab()) adapter.openViewTab();
						}
						const runtime = manager.getRuntime(nextSession);
						if (runtime !== void 0) {
							if (window.__DSH_DISCUSSION_WORKBENCH__?.ownsDocumentBinding !== true) {
								const currentFile = activeFileOf(snapshot.state);
								const path = isMarkdownFile(currentFile) ? currentFile : null;
								runtime.sendCurrentFile(path);
							}
						}
					}
				};
				disposers.push(adapter.subscribeState(onChange));
				window.addEventListener("dsh-workbench:target", onChange);
				disposers.push(() => window.removeEventListener("dsh-workbench:target", onChange));
				onChange();
				return () => {
					for (const dispose of disposers) try {
						dispose();
					} catch {}
					manager.disposeAll();
				};
			}, "dsh-structured-document-view: client");
		}
		//#endregion
		exports.VIEW_TAB_TYPE = VIEW_TAB_TYPE;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
