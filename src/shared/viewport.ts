export interface RectLike { left: number; top: number; right: number; bottom: number; width: number; height: number }

/** 计算让节点完整进入视口所需的最小平移；超大节点优先露出左上起始位置。 */
export function visibilityDelta(node: RectLike, viewport: RectLike, margin = 16): { x: number; y: number } {
  const left = viewport.left + margin
  const right = viewport.right - margin
  const top = viewport.top + margin
  const bottom = viewport.bottom - margin
  const availableWidth = Math.max(0, right - left)
  const availableHeight = Math.max(0, bottom - top)
  let x = 0
  let y = 0
  if (node.width > availableWidth) x = left - node.left
  else if (node.left < left) x = left - node.left
  else if (node.right > right) x = right - node.right
  if (node.height > availableHeight) y = top - node.top
  else if (node.top < top) y = top - node.top
  else if (node.bottom > bottom) y = bottom - node.bottom
  return { x, y }
}
