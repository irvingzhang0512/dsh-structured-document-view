export interface RectLike {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}
/** 计算让节点完整进入视口所需的最小平移；超大节点优先露出左上起始位置。 */
export declare function visibilityDelta(node: RectLike, viewport: RectLike, margin?: number): {
    x: number;
    y: number;
};
