import {
  NS_PER_SECOND,
  deriveKeys,
  notesToEvents,
  timelineDurationNs,
  type NoteSpan,
} from './timeline'
import type { KeyName, SessionEvent } from './types'

export const TIME_RULER_WIDTH = 96
export const HEADER_HEIGHT = 0
export const KEY_LANE_WIDTH = 118
export const NOTE_WIDTH = 72
export const NOTE_HANDLE_HEIGHT = 6
export const NOTE_MIN_HEIGHT = 14
export const MIN_CANVAS_WIDTH = 760
export const MIN_CANVAS_HEIGHT = 820

export type CanvasBitmapSize = {
  readonly bitmapHeight: number
  readonly bitmapWidth: number
  readonly cssHeight: number
  readonly cssWidth: number
  readonly ratio: number
}

export type NoteRect = {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

export type TimelineMetrics = {
  readonly durationNs: number
  readonly height: number
  readonly lanes: readonly KeyName[]
  readonly nsPerPixel: number
  readonly width: number
}

export type HitResult =
  | { readonly kind: 'note'; readonly note: NoteSpan }
  | { readonly kind: 'resize-start'; readonly note: NoteSpan }
  | { readonly kind: 'resize-end'; readonly note: NoteSpan }
  | { readonly kind: 'empty'; readonly timeNs: number }

export function timelineMetrics(
  events: readonly SessionEvent[],
  ghostEvents: readonly SessionEvent[],
  zoom: number,
): TimelineMetrics {
  const lanes = mergeLanes(deriveKeys([...events, ...ghostEvents]))
  const durationNs = timelineDurationNs([...events, ...ghostEvents])
  const nsPerPixel = Math.max(50_000, NS_PER_SECOND / (125 * zoom))
  const laneCount = Math.max(1, lanes.length)
  const width = Math.max(MIN_CANVAS_WIDTH, TIME_RULER_WIDTH + laneCount * KEY_LANE_WIDTH)
  const height = Math.max(MIN_CANVAS_HEIGHT, HEADER_HEIGHT + Math.ceil(durationNs / nsPerPixel))
  return {
    durationNs,
    height,
    lanes,
    nsPerPixel,
    width,
  }
}

export function timeToY(timeNs: number, metrics: TimelineMetrics): number {
  return HEADER_HEIGHT + timeNs / metrics.nsPerPixel
}

export function yToTimeNs(y: number, metrics: TimelineMetrics): number {
  return Math.max(0, Math.round((y - HEADER_HEIGHT) * metrics.nsPerPixel))
}

export function laneToX(index: number): number {
  return TIME_RULER_WIDTH + index * KEY_LANE_WIDTH
}

export function noteRect(note: NoteSpan, metrics: TimelineMetrics): NoteRect | null {
  const lane = metrics.lanes.indexOf(note.key)
  if (lane < 0) {
    return null
  }
  const laneX = laneToX(lane)
  const y = timeToY(note.start_ns, metrics)
  return {
    height: Math.max(NOTE_MIN_HEIGHT, timeToY(note.end_ns, metrics) - y),
    width: NOTE_WIDTH,
    x: laneX + (KEY_LANE_WIDTH - NOTE_WIDTH) / 2,
    y,
  }
}

export function canvasBitmapSize(
  metrics: TimelineMetrics,
  devicePixelRatio: number,
): CanvasBitmapSize {
  const ratio = Math.max(1, Math.min(4, Math.round(devicePixelRatio * 100) / 100))
  return {
    bitmapHeight: Math.round(metrics.height * ratio),
    bitmapWidth: Math.round(metrics.width * ratio),
    cssHeight: metrics.height,
    cssWidth: metrics.width,
    ratio,
  }
}

export function hitTest(
  x: number,
  y: number,
  metrics: TimelineMetrics,
  notes: readonly NoteSpan[],
): HitResult | null {
  if (y < HEADER_HEIGHT || x < TIME_RULER_WIDTH) {
    return null
  }
  const laneIndex = Math.floor((x - TIME_RULER_WIDTH) / KEY_LANE_WIDTH)
  const lane = metrics.lanes[laneIndex]
  const timeNs = yToTimeNs(y, metrics)
  if (!lane) {
    return { kind: 'empty', timeNs }
  }
  for (const note of notes) {
    if (note.key !== lane) {
      continue
    }
    const rect = noteRect(note, metrics)
    if (!rect || x < rect.x || x > rect.x + rect.width || y < rect.y || y > rect.y + rect.height) {
      continue
    }
    if (y - rect.y <= NOTE_HANDLE_HEIGHT) {
      return { kind: 'resize-start', note }
    }
    if (rect.y + rect.height - y <= NOTE_HANDLE_HEIGHT) {
      return { kind: 'resize-end', note }
    }
    return { kind: 'note', note }
  }
  return { kind: 'empty', timeNs }
}

export function nextTimelineEvents(notes: readonly NoteSpan[]): readonly SessionEvent[] {
  return notesToEvents(notes)
}

function mergeLanes(keys: readonly KeyName[]): readonly KeyName[] {
  return keys.length > 0 ? keys : []
}
