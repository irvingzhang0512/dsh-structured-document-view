/**
 * 客户端 View State Store：持有权威视图状态（仅存在于浏览器），
 * 通过纯 reducer 更新，并向渲染层与宿主镜像推送变更。
 */
import { createDefaultViewState, type ViewState } from '../shared/view-state.ts'

/** View State 存储。 */
export class ViewStateStore {
  private state: ViewState = createDefaultViewState()
  private readonly listeners = new Set<() => void>()

  /** 当前状态（只读）。 */
  getState(): ViewState {
    return this.state
  }

  /**
   * 应用一次纯 reducer 更新；状态未变化则不通知。
   * @returns 是否发生了变更。
   */
  update(updater: (state: ViewState) => ViewState): boolean {
    const next = updater(this.state)
    if (next === this.state) return false
    this.state = next
    this.emit()
    return true
  }

  /** 订阅变更；返回退订函数。 */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** 重置为默认状态（新会话 / 重置）。 */
  reset(): void {
    this.state = createDefaultViewState()
    this.emit()
  }

  private emit(): void {
    for (const listener of [...this.listeners]) {
      try {
        listener()
      } catch {
        // 忽略监听器异常。
      }
    }
  }
}
