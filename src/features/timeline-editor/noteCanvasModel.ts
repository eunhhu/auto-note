import { NS_PER_SECOND, mergeLaneOrder, notesToEvents, type NoteSpan } from '@/lib/timeline'
import type { KeyName, SessionEvent } from '@/lib/types'

export const TIME_RULER_WIDTH = 85
export const HEADER_HEIGHT = 0
export const KEY_LANE_WIDTH = 72
export const NOTE_WIDTH = 56
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
  readonly xRatio: number
  readonly yRatio: number
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

export type NoteHitIndex = ReadonlyMap<KeyName, readonly NoteSpan[]>

export function timelineMetrics(
  events: readonly SessionEvent[],
  ghostEvents: readonly SessionEvent[],
  zoom: number,
  laneOrder: readonly KeyName[] = [],
): TimelineMetrics {
  const lanes = mergeLanes(laneOrder, deriveKeysFromEventSets(events, ghostEvents))
  const durationNs = durationForEventSets(events, ghostEvents)
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

export function laneAtX(x: number, metrics: TimelineMetrics): KeyName | null {
  if (x < TIME_RULER_WIDTH) {
    return null
  }
  const laneIndex = Math.floor((x - TIME_RULER_WIDTH) / KEY_LANE_WIDTH)
  return metrics.lanes[laneIndex] ?? null
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
  const desiredRatio = Math.min(3, Math.round(devicePixelRatio * 100) / 100)
  const maxBitmapHeight = 32_000
  const maxHeightRatio = maxBitmapHeight / Math.max(1, metrics.height)
  const rawYRatio = Math.max(0.1, Math.min(desiredRatio, maxHeightRatio))
  const bitmapWidth = Math.max(1, Math.round(metrics.width * desiredRatio))
  const bitmapHeight = Math.max(1, Math.round(metrics.height * rawYRatio))
  const xRatio = bitmapWidth / Math.max(1, metrics.width)
  const yRatio = bitmapHeight / Math.max(1, metrics.height)
  return {
    bitmapHeight,
    bitmapWidth,
    cssHeight: metrics.height,
    cssWidth: metrics.width,
    ratio: yRatio,
    xRatio,
    yRatio,
  }
}

export function buildNoteHitIndex(notes: readonly NoteSpan[]): NoteHitIndex {
  const index = new Map<KeyName, NoteSpan[]>()
  for (const note of notes) {
    const laneNotes = index.get(note.key)
    if (laneNotes) {
      laneNotes.push(note)
    } else {
      index.set(note.key, [note])
    }
  }
  for (const laneNotes of index.values()) {
    laneNotes.sort((a, b) => a.start_ns - b.start_ns || a.end_ns - b.end_ns)
  }
  return index
}

export function visibleNotesInViewport(
  notes: readonly NoteSpan[],
  metrics: TimelineMetrics,
  viewportTop: number,
  viewportBottom: number,
): readonly NoteSpan[] {
  const startNs = yToTimeNs(viewportTop, metrics)
  const endNs = yToTimeNs(viewportBottom, metrics)
  const visible: NoteSpan[] = []
  const endIndex = upperBoundByStart(notes, endNs)
  for (let index = 0; index < endIndex; index += 1) {
    const note = notes[index]
    if (note && note.end_ns >= startNs) {
      visible.push(note)
    }
  }
  return visible
}

export function hitTest(
  x: number,
  y: number,
  metrics: TimelineMetrics,
  notes: readonly NoteSpan[],
): HitResult | null {
  return hitTestIndexed(x, y, metrics, buildNoteHitIndex(notes))
}

export function hitTestIndexed(
  x: number,
  y: number,
  metrics: TimelineMetrics,
  noteIndex: NoteHitIndex,
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
  const laneNotes = noteIndex.get(lane) ?? []
  const maxStartNs = yToTimeNs(y + NOTE_MIN_HEIGHT + NOTE_HANDLE_HEIGHT, metrics)
  const endIndex = upperBoundByStart(laneNotes, maxStartNs)
  for (let index = endIndex - 1; index >= 0; index -= 1) {
    const note = laneNotes[index]
    if (!note) {
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

function mergeLanes(
  laneOrder: readonly KeyName[],
  recordedKeys: readonly KeyName[],
): readonly KeyName[] {
  return mergeLaneOrder(laneOrder, recordedKeys)
}

function upperBoundByStart(notes: readonly NoteSpan[], timeNs: number): number {
  let low = 0
  let high = notes.length
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    const note = notes[mid]
    if (note && note.start_ns <= timeNs) {
      low = mid + 1
    } else {
      high = mid
    }
  }
  return low
}

function deriveKeysFromEventSets(
  events: readonly SessionEvent[],
  ghostEvents: readonly SessionEvent[],
): readonly KeyName[] {
  const ordered: KeyName[] = []
  const seen = new Set<KeyName>()
  appendEventKeys(events, ordered, seen)
  appendEventKeys(ghostEvents, ordered, seen)
  return ordered
}

function appendEventKeys(
  events: readonly SessionEvent[],
  ordered: KeyName[],
  seen: Set<KeyName>,
): void {
  for (const event of events) {
    if (seen.has(event.key)) {
      continue
    }
    seen.add(event.key)
    ordered.push(event.key)
  }
}

function durationForEventSets(
  events: readonly SessionEvent[],
  ghostEvents: readonly SessionEvent[],
): number {
  let maxEvent = 0
  for (const event of events) {
    maxEvent = Math.max(maxEvent, event.t_ns)
  }
  for (const event of ghostEvents) {
    maxEvent = Math.max(maxEvent, event.t_ns)
  }
  return Math.max(NS_PER_SECOND * 8, maxEvent + NS_PER_SECOND)
}
