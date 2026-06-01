import { describe, expect, it } from 'vitest'

import {
  NOTE_WIDTH,
  HEADER_HEIGHT,
  KEY_LANE_WIDTH,
  TIME_RULER_WIDTH,
  canvasBitmapSize,
  hitTest,
  laneAtX,
  noteRect,
  timelineMetrics,
  timeToY,
  yToTimeNs,
} from './noteCanvasModel'
import { msToNs } from './timeline'
import type { SessionEvent } from './types'

describe('vertical timeline canvas model', () => {
  it('uses recorded keys as horizontal columns and time as the vertical axis', () => {
    const events: SessionEvent[] = [
      { t_ns: msToNs(100), key: 'Space', action: 'press' },
      { t_ns: msToNs(250), key: 'Space', action: 'release' },
      { t_ns: msToNs(300), key: 'Q', action: 'press' },
      { t_ns: msToNs(450), key: 'Q', action: 'release' },
    ]

    const metrics = timelineMetrics(events, [], 1)

    expect(metrics.lanes).toEqual(['Space', 'Q'])
    expect(metrics.width).toBeGreaterThanOrEqual(TIME_RULER_WIDTH + KEY_LANE_WIDTH * 2)
    expect(timeToY(msToNs(300), metrics)).toBeGreaterThan(HEADER_HEIGHT)
    expect(yToTimeNs(timeToY(msToNs(300), metrics), metrics)).toBe(msToNs(300))
  })

  it('selects a note by column and vertical time', () => {
    const events: SessionEvent[] = [
      { t_ns: msToNs(100), key: 'D', action: 'press' },
      { t_ns: msToNs(300), key: 'D', action: 'release' },
      { t_ns: msToNs(400), key: 'K', action: 'press' },
      { t_ns: msToNs(550), key: 'K', action: 'release' },
    ]
    const metrics = timelineMetrics(events, [], 1)
    const notes = [
      { id: 'd', key: 'D', start_ns: msToNs(100), end_ns: msToNs(300) },
      { id: 'k', key: 'K', start_ns: msToNs(400), end_ns: msToNs(550) },
    ]

    const hit = hitTest(
      TIME_RULER_WIDTH + KEY_LANE_WIDTH / 2,
      timeToY(msToNs(180), metrics),
      metrics,
      notes,
    )
    const empty = hitTest(
      TIME_RULER_WIDTH + KEY_LANE_WIDTH / 2,
      timeToY(msToNs(350), metrics),
      metrics,
      notes,
    )

    expect(hit).toEqual({ kind: 'note', note: notes[0] })
    expect(empty).toEqual({ kind: 'empty', timeNs: msToNs(350) })
  })

  it('limits note hit testing to the narrow visible block and exposes resize handles', () => {
    const events: SessionEvent[] = [
      { t_ns: msToNs(100), key: 'D', action: 'press' },
      { t_ns: msToNs(300), key: 'D', action: 'release' },
    ]
    const metrics = timelineMetrics(events, [], 1)
    const note = { id: 'd', key: 'D', start_ns: msToNs(100), end_ns: msToNs(300) }
    const rect = noteRect(note, metrics)
    if (rect === null) {
      throw new Error('expected visible note rect')
    }

    const outsideBlock = hitTest(TIME_RULER_WIDTH + KEY_LANE_WIDTH - 3, rect.y + 20, metrics, [note])
    const startHandle = hitTest(rect.x + NOTE_WIDTH / 2, rect.y + 2, metrics, [note])
    const endHandle = hitTest(rect.x + NOTE_WIDTH / 2, rect.y + rect.height - 2, metrics, [note])

    expect(outsideBlock).toEqual({ kind: 'empty', timeNs: yToTimeNs(rect.y + 20, metrics) })
    expect(startHandle).toEqual({ kind: 'resize-start', note })
    expect(endHandle).toEqual({ kind: 'resize-end', note })
  })

  it('separates canvas bitmap size from logical css size for retina displays', () => {
    const metrics = timelineMetrics([], [], 1)

    const size = canvasBitmapSize(metrics, 2)

    expect(size).toEqual({
      bitmapHeight: metrics.height * 2,
      bitmapWidth: metrics.width * 2,
      cssHeight: metrics.height,
      cssWidth: metrics.width,
      ratio: 2,
    })
  })

  it('uses compact lanes and narrow notes like the reference editor', () => {
    expect(TIME_RULER_WIDTH).toBe(85)
    expect(KEY_LANE_WIDTH).toBe(72)
    expect(NOTE_WIDTH).toBe(56)
  })

  it('returns the lane at an empty grid coordinate for alt-click creation', () => {
    const events: SessionEvent[] = [
      { t_ns: msToNs(100), key: 'S', action: 'press' },
      { t_ns: msToNs(200), key: 'S', action: 'release' },
      { t_ns: msToNs(300), key: 'D', action: 'press' },
      { t_ns: msToNs(400), key: 'D', action: 'release' },
    ]
    const metrics = timelineMetrics(events, [], 1)

    expect(laneAtX(TIME_RULER_WIDTH + KEY_LANE_WIDTH + 12, metrics)).toBe('D')
  })

  it('keeps configured lane order and appends keys from recorded/ghost events', () => {
    const events: SessionEvent[] = [
      { t_ns: msToNs(100), key: 'J', action: 'press' },
      { t_ns: msToNs(200), key: 'J', action: 'release' },
    ]
    const ghostEvents: SessionEvent[] = [
      { t_ns: msToNs(300), key: 'K', action: 'press' },
      { t_ns: msToNs(400), key: 'K', action: 'release' },
    ]

    const metrics = timelineMetrics(events, ghostEvents, 1, ['F', 'D'])

    expect(metrics.lanes).toEqual(['F', 'D', 'J', 'K'])
  })
})
