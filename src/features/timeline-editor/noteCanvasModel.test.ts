import { describe, expect, it } from 'vitest'

import {
  NOTE_WIDTH,
  HEADER_HEIGHT,
  KEY_LANE_WIDTH,
  NOTE_HANDLE_HEIGHT,
  TIME_RULER_WIDTH,
  canvasBitmapSize,
  hitTest,
  buildNoteHitIndex,
  laneAtX,
  noteRect,
  hitTestIndexed,
  timelineMetrics,
  timeToY,
  visibleNotesInViewport,
  yToTimeNs,
} from '@/features/timeline-editor/noteCanvasModel'
import { snapTimeToGrid } from '@/features/timeline-editor/noteCanvasGrid'
import { msToNs } from '@/lib/timeline'
import type { SessionEvent } from '@/lib/types'

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
      xRatio: 2,
      yRatio: 2,
    })
  })

  it('caps only vertical bitmap scale on very tall timelines', () => {
    const metrics = { ...timelineMetrics([], [], 1), height: 100_000, width: 900 }

    const size = canvasBitmapSize(metrics, 2)

    expect(size.bitmapWidth).toBe(1_800)
    expect(size.bitmapHeight).toBe(32_000)
    expect(size.xRatio).toBe(2)
    expect(size.yRatio).toBe(0.32)
  })

  it('uses actual rounded bitmap ratios for canvas transforms', () => {
    const metrics = { ...timelineMetrics([], [], 1), height: 821, width: 763 }

    const size = canvasBitmapSize(metrics, 1.33)

    expect(size.bitmapHeight).toBe(Math.round(metrics.height * 1.33))
    expect(size.bitmapWidth).toBe(Math.round(metrics.width * 1.33))
    expect(size.yRatio).toBe(size.bitmapHeight / metrics.height)
    expect(size.xRatio).toBe(size.bitmapWidth / metrics.width)
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

  it('returns only viewport notes from a 10k note timeline', () => {
    const notes = Array.from({ length: 10_000 }, (_, index) => ({
      id: `n${index}`,
      key: index % 2 === 0 ? 'D' : 'K',
      start_ns: msToNs(index * 200),
      end_ns: msToNs(index * 200 + 80),
    }))
    const events = notes.flatMap((note) => [
      { t_ns: note.start_ns, key: note.key, action: 'press' as const },
      { t_ns: note.end_ns, key: note.key, action: 'release' as const },
    ])
    const metrics = timelineMetrics(events, [], 1)
    const top = timeToY(msToNs(500_000), metrics)
    const bottom = timeToY(msToNs(501_000), metrics)

    const visible = visibleNotesInViewport(notes, metrics, top, bottom)

    expect(visible.length).toBeLessThan(80)
    expect(visible.every((note) => note.end_ns >= msToNs(500_000))).toBe(true)
    expect(visible.every((note) => note.start_ns <= msToNs(501_000))).toBe(true)
  })

  it('hit-tests only the target lane index on large timelines', () => {
    const notes = Array.from({ length: 10_000 }, (_, index) => ({
      id: `n${index}`,
      key: index % 2 === 0 ? 'D' : 'K',
      start_ns: msToNs(index * 200),
      end_ns: msToNs(index * 200 + 80),
    }))
    const events = notes.flatMap((note) => [
      { t_ns: note.start_ns, key: note.key, action: 'press' as const },
      { t_ns: note.end_ns, key: note.key, action: 'release' as const },
    ])
    const metrics = timelineMetrics(events, [], 1)
    const index = buildNoteHitIndex(notes)
    const target = notes[5000]
    if (!target) {
      throw new Error('fixture note missing')
    }
    const rect = noteRect(target, metrics)
    if (!rect) {
      throw new Error('fixture note rect missing')
    }

    const hit = hitTestIndexed(
      TIME_RULER_WIDTH + KEY_LANE_WIDTH / 2,
      rect.y + NOTE_HANDLE_HEIGHT + 1,
      metrics,
      index,
    )

    expect(hit).toEqual({ kind: 'note', note: target })
  })

  it('snaps raw times to the visible bpm grid when explicitly enabled', () => {
    expect(snapTimeToGrid(msToNs(1_280), 180, 0)).toBe(1_249_999_995)
    expect(snapTimeToGrid(msToNs(84), 180, 10)).toBe(73_333_333)
  })
})
