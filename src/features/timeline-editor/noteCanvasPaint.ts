import {
  HEADER_HEIGHT,
  KEY_LANE_WIDTH,
  TIME_RULER_WIDTH,
  laneToX,
  noteRect,
  timeToY,
  visibleNotesInViewport,
  yToTimeNs,
  type TimelineMetrics,
} from '@/features/timeline-editor/noteCanvasModel'
import type { MarqueeRect } from '@/features/timeline-editor/noteCanvasInteraction'
import { isYInPaintRange, paintRangeForViewport, type PaintRange } from '@/features/timeline-editor/noteCanvasPaintRange'
import { NS_PER_SECOND, msToNs, nsToMs, type NoteSpan } from '@/lib/timeline'

type DrawArgs = {
  readonly bpm: number
  readonly cursorNs: number
  readonly ghostNotes: readonly NoteSpan[]
  readonly metrics: TimelineMetrics
  readonly marquee: MarqueeRect | null
  readonly notes: readonly NoteSpan[]
  readonly offsetMs: number
  readonly selected: ReadonlySet<string>
  readonly viewportBottom: number
  readonly viewportTop: number
}

export function drawTimeline(context: CanvasRenderingContext2D, args: DrawArgs): void {
  const { metrics } = args
  const { bottom, top } = paintRangeForViewport(metrics.height, args.viewportTop, args.viewportBottom)
  context.clearRect(0, top, metrics.width, bottom - top)
  context.fillStyle = '#0b0c10'
  context.fillRect(0, top, metrics.width, bottom - top)
  context.fillStyle = '#111418'
  context.fillRect(0, top, TIME_RULER_WIDTH, bottom - top)
  drawColumns(context, metrics, top, bottom)
  drawGrid(context, args)
  paintNotes(context, metrics, visibleNotesInViewport(args.ghostNotes, metrics, top, bottom), args.selected, true)
  paintNotes(context, metrics, visibleNotesInViewport(args.notes, metrics, top, bottom), args.selected, false)
  drawMarquee(context, args.marquee)
  drawCursor(context, metrics, args.cursorNs, { bottom, top })
}

function drawGrid(context: CanvasRenderingContext2D, args: DrawArgs): void {
  const { metrics } = args
  const beatNs = Math.max(1, Math.round(NS_PER_SECOND * (60 / Math.max(1, args.bpm))))
  const stepNs = Math.round(beatNs / 4)
  const offsetNs = msToNs(args.offsetMs)
  const firstVisibleNs = yToTimeNs(args.viewportTop - 120, metrics)
  const lastVisibleNs = yToTimeNs(args.viewportBottom + 160, metrics)
  const firstStep = Math.max(0, Math.floor((firstVisibleNs + offsetNs) / stepNs))
  const lastStep = Math.ceil((lastVisibleNs + offsetNs) / stepNs)
  for (let stepIndex = firstStep; stepIndex <= lastStep; stepIndex += 1) {
    const t = stepIndex * stepNs - offsetNs
    if (t < 0) {
      continue
    }
    const y = timeToY(t, metrics)
    const isBeat = stepIndex % 4 === 0
    context.lineWidth = isBeat ? 1.25 : 1
    drawLine(context, TIME_RULER_WIDTH, y, metrics.width, y, isBeat ? '#36566a' : '#1d252d')
    if (isBeat) {
      context.fillStyle = stepIndex % 16 === 0 ? '#20e6ff' : '#6b7280'
      context.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace'
      context.textAlign = 'right'
      context.textBaseline = 'middle'
      context.fillText(`b${Math.floor(stepIndex / 4)}`, TIME_RULER_WIDTH - 44, y)
      context.fillStyle = '#6b7280'
      context.fillText(`${(nsToMs(t) / 1000).toFixed(1)}s`, TIME_RULER_WIDTH - 10, y)
    }
  }
  context.lineWidth = 1
}

function drawColumns(
  context: CanvasRenderingContext2D,
  metrics: TimelineMetrics,
  top: number,
  bottom: number,
): void {
  context.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  for (const [index] of metrics.lanes.entries()) {
    const x = laneToX(index)
    context.fillStyle = index % 2 === 0 ? '#0f1115' : '#12151a'
    context.fillRect(x, top, KEY_LANE_WIDTH, bottom - top)
    drawLine(context, x, top, x, bottom, '#242a33')
    if (top < 80) {
      context.fillStyle = 'rgb(255 255 255 / 16%)'
      context.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace'
      context.fillText(`COL ${index + 1}`, x + KEY_LANE_WIDTH / 2, HEADER_HEIGHT + 26)
    }
  }
  drawLine(
    context,
    TIME_RULER_WIDTH + metrics.lanes.length * KEY_LANE_WIDTH,
    top,
    TIME_RULER_WIDTH + metrics.lanes.length * KEY_LANE_WIDTH,
    bottom,
    '#242a33',
  )
  if (metrics.lanes.length === 0) {
    context.fillStyle = '#777d89'
    context.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace'
    context.textAlign = 'left'
    context.fillText('No recorded keys', TIME_RULER_WIDTH + 18, HEADER_HEIGHT + 28)
  }
}

function paintNotes(
  context: CanvasRenderingContext2D,
  metrics: TimelineMetrics,
  notes: readonly NoteSpan[],
  selected: ReadonlySet<string>,
  isGhost: boolean,
): void {
  context.globalAlpha = isGhost ? 0.5 : 1
  for (const note of notes) {
    const rect = noteRect(note, metrics)
    if (!rect) {
      continue
    }
    const { height, width, x, y } = rect
    const colors = noteColors(note.key, selected.has(note.id), isGhost)
    context.fillStyle = colors.fill
    roundRect(context, x, y, width, height, 6)
    context.fill()
    context.strokeStyle = colors.stroke
    context.lineWidth = selected.has(note.id) ? 4 : 2
    context.stroke()
    if (selected.has(note.id)) {
      drawResizeHandle(context, x, y, width)
      drawResizeHandle(context, x, y + height, width)
    }
    context.fillStyle = selected.has(note.id) ? '#ffffff' : '#edf0f5'
    context.font = '800 12px ui-monospace, SFMono-Regular, Menlo, monospace'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(note.key, x + width / 2, y + Math.min(22, height / 2))
    if (height >= 34) {
      context.fillStyle = '#b7bdc8'
      context.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace'
      context.fillText(`${nsToMs(note.end_ns - note.start_ns)}ms`, x + width / 2, y + height - 14)
    }
  }
  context.lineWidth = 1
  context.globalAlpha = 1
}

function drawResizeHandle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
): void {
  context.fillStyle = '#edf0f5'
  context.fillRect(x + width / 2 - 5, y - 2, 10, 4)
}

function drawCursor(
  context: CanvasRenderingContext2D,
  metrics: TimelineMetrics,
  cursorNs: number,
  range: PaintRange,
): void {
  const y = timeToY(cursorNs, metrics)
  if (!isYInPaintRange(range, y)) {
    return
  }
  drawLine(context, TIME_RULER_WIDTH, y, metrics.width, y, '#20e6ff')
  context.fillStyle = '#20e6ff'
  context.beginPath()
  context.arc(TIME_RULER_WIDTH, y, 5, 0, Math.PI * 2)
  context.fill()
}

function drawMarquee(context: CanvasRenderingContext2D, marquee: MarqueeRect | null): void {
  if (!marquee || marquee.width < 2 || marquee.height < 2) {
    return
  }
  context.fillStyle = 'rgb(32 230 255 / 8%)'
  context.strokeStyle = 'rgb(32 230 255 / 72%)'
  context.lineWidth = 1
  context.setLineDash([4, 4])
  context.fillRect(marquee.x, marquee.y, marquee.width, marquee.height)
  context.strokeRect(marquee.x, marquee.y, marquee.width, marquee.height)
  context.setLineDash([])
}

function noteColors(key: string, selected: boolean, isGhost: boolean): { readonly fill: string; readonly stroke: string } {
  if (selected) {
    return { fill: 'rgb(255 0 127 / 28%)', stroke: '#ff007f' }
  }
  if (isGhost) {
    return { fill: 'rgb(234 179 8 / 12%)', stroke: '#eab308' }
  }
  const index = key.charCodeAt(0) % 4
  if (index === 0) {
    return { fill: 'rgb(14 165 233 / 20%)', stroke: '#0ea5e9' }
  }
  if (index === 1) {
    return { fill: 'rgb(168 85 247 / 18%)', stroke: '#a855f7' }
  }
  if (index === 2) {
    return { fill: 'rgb(234 179 8 / 18%)', stroke: '#eab308' }
  }
  return { fill: 'rgb(16 185 129 / 18%)', stroke: '#10b981' }
}

function drawLine(
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
): void {
  context.strokeStyle = color
  context.beginPath()
  context.moveTo(x1, y1)
  context.lineTo(x2, y2)
  context.stroke()
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}
