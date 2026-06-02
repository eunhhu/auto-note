export type PaintRange = {
  readonly bottom: number
  readonly top: number
}

export function paintRangeForViewport(
  metricsHeight: number,
  viewportTop: number,
  viewportBottom: number,
): PaintRange {
  const top = Math.max(0, Math.floor(viewportTop - 80))
  const bottom = Math.min(metricsHeight, Math.ceil(viewportBottom + 120))
  return { bottom: Math.max(top, bottom), top }
}

export function isYInPaintRange(range: PaintRange, y: number): boolean {
  return y >= range.top && y <= range.bottom
}
