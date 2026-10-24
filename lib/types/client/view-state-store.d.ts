/**
 * 客户端 View State Store：持有权威视图状态（仅存在于浏览器），
 * 通过纯 reducer 更新，并向渲染层与宿主镜像推送变更。
 *
 * 初始状态按 SPEC F011 的侧边卡片配置默认值构造：构造时读取一次
 * （已存在会话的状态不因之后改配置而变，A5）；`reset()` 在调用时重新读取，
 * 因此「恢复默认视图」采用此刻配置的默认值（A9）。未注入读取器时用内置默认
 * （无设置能力时的软依赖回退）。
 */
import type { ViewState } from '../shared/view-state.ts';
import { type ViewDefaults } from '../shared/view-settings.ts';
/** View State 存储。 */
export declare class ViewStateStore {
    private readonly readDefaults;
    private state;
    private readonly listeners;
    /**
     * @param readDefaults 读取当前侧边卡片配置默认值；缺省为内置默认。
     *   传入函数而非快照，是为了让 `reset()` 取「此刻的配置」（A9）。
     */
    constructor(readDefaults?: () => ViewDefaults);
    /** 当前状态（只读）。 */
    getState(): ViewState;
    /**
     * 应用一次纯 reducer 更新；状态未变化则不通知。
     * @returns 是否发生了变更。
     */
    update(updater: (state: ViewState) => ViewState): boolean;
    /** 订阅变更；返回退订函数。 */
    subscribe(listener: () => void): () => void;
    /**
     * 重置为初始状态（不含选中节点）：按**此刻**的配置默认值重建。
     * 需要保留当前选中节点的路径（`reset_view`）走运行时里的
     * `resetView(state, initialViewState(...))`，见 SPEC F002／F011 A9。
     */
    reset(): void;
    private emit;
}
