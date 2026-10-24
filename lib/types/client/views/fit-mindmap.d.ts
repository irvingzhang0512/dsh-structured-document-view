export interface FitTarget {
    scaleVal: number;
    scaleFit(): void;
    scale(value: number): void;
    toCenter(): void;
}
/** 隐藏／零尺寸时延迟首次布局，避免上游scaleFit产生0或NaN并冻结到下一次挂载。 */
export declare function fitVisibleMindmap(mind: FitTarget, size: {
    width: number;
    height: number;
}): boolean;
