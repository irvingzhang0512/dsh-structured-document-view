/** View 状态镜像存储。 */
export class ViewMirrorStore {
    mirrors = new Map();
    listeners = new Map();
    /** 客户端推送新状态。 */
    apply(wire, now = Date.now()) {
        const existing = this.mirrors.get(wire.sessionId);
        if (existing !== undefined) {
            existing.state = wire;
            existing.connected = true;
            existing.updatedAt = now;
        }
        else {
            this.mirrors.set(wire.sessionId, {
                sessionId: wire.sessionId,
                connected: true,
                state: wire,
                updatedAt: now,
            });
        }
        this.emit(wire.sessionId);
    }
    /** 会话失去连接。 */
    markDisconnected(sessionId, now = Date.now()) {
        const mirror = this.mirrors.get(sessionId);
        if (mirror !== undefined) {
            mirror.connected = false;
            mirror.updatedAt = now;
            this.emit(sessionId);
        }
    }
    /** 读取某会话的最新镜像；无镜像返回 undefined。 */
    get(sessionId) {
        return this.mirrors.get(sessionId);
    }
    /** 全部镜像（调试 / 测试用）。 */
    snapshot() {
        return [...this.mirrors.values()];
    }
    subscribe(sessionId, listener) {
        const set = this.listeners.get(sessionId) ?? new Set();
        set.add(listener);
        this.listeners.set(sessionId, set);
        listener(this.mirrors.get(sessionId));
        return () => {
            set.delete(listener);
            if (set.size === 0)
                this.listeners.delete(sessionId);
        };
    }
    /** 清空（teardown）。 */
    clear() {
        this.mirrors.clear();
        this.listeners.clear();
    }
    emit(sessionId) {
        const state = this.mirrors.get(sessionId);
        for (const listener of this.listeners.get(sessionId) ?? [])
            listener(state);
    }
}
