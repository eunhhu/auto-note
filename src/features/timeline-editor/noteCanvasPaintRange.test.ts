import { describe, expect, it } from 'vitest'

import { isYInPaintRange, paintRangeForViewport } from '@/features/timeline-editor/noteCanvasPaintRange'

describe('canvas paint range', () => {
  it('rounds paint bounds outward to cover fractional bottom pixels', () => {
    const range = paintRangeForViewport(820, 701.4, 819.2)

    expect(range).toEqual({ top: 621, bottom: 820 })
  })

  it('excludes cursor lines outside the painted range', () => {
    const range = paintRangeForViewport(820, 200, 360)

    expect(isYInPaintRange(range, 110)).toBe(false)
    expect(isYInPaintRange(range, 240)).toBe(true)
    expect(isYInPaintRange(range, 500)).toBe(false)
  })
})
