/** 空数据源（无文档、无选中、无事件）。 */
export class EmptyDocumentProvider {
    id = 'empty';
    displayName = '未连接';
    getDocument() {
        return null;
    }
    getSelectedNode() {
        return null;
    }
    selectNode(_nodeId) {
        // 数据源未就绪：没有文档可选，忽略（命令层会先返回 SOURCE_NOT_READY）。
    }
    subscribeDocumentChanged(_listener) {
        return () => undefined;
    }
    subscribeSelectedNodeChanged(_listener) {
        return () => undefined;
    }
    dispose() {
        // 无资源。
    }
}
