import { describe, expect, it } from 'vitest'
import { visibilityDelta, type RectLike } from '../src/shared/viewport.ts'

const viewport: RectLike = { left: 0, top: 0, right: 300, bottom: 200, width: 300, height: 200 }

describe('visibilityDelta', () => {
  it('完整可见时不移动', () => {
    expect(visibilityDelta({ left: 20, top: 20, right: 100, bottom: 60, width: 80, height: 40 }, viewport)).toEqual({ x: 0, y: 0 })
  })

  it('对四边裁切计算最小平移', () => {
    expect(visibilityDelta({ left: -10, top: 30, right: 70, bottom: 70, width: 80, height: 40 }, viewport).x).toBe(26)
    expect(visibilityDelta({ left: 260, top: 30, right: 330, bottom: 70, width: 70, height: 40 }, viewport).x).toBe(-46)
    expect(visibilityDelta({ left: 30, top: -5, right: 90, bottom: 30, width: 60, height: 35 }, viewport).y).toBe(21)
    expect(visibilityDelta({ left: 30, top: 180, right: 90, bottom: 220, width: 60, height: 40 }, viewport).y).toBe(-36)
  })

  it('完全在视口外时移回，超大节点优先对齐左上', () => {
    expect(visibilityDelta({ left: 500, top: 400, right: 580, bottom: 440, width: 80, height: 40 }, viewport)).toEqual({ x: -296, y: -256 })
    expect(visibilityDelta({ left: -80, top: -40, right: 400, bottom: 260, width: 480, height: 300 }, viewport)).toEqual({ x: 96, y: 56 })
  })
})
