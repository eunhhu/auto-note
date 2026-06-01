import {
  HEADER_HEIGHT,
  KEY_LANE_WIDTH,
  TIME_RULER_WIDTH,
  laneToX,
  noteRect,
  timeToY,
  type TimelineMetrics,
} from './noteCanvasModel'
import { NS_PER_SECOND, msToNs, nsToMs, type NoteSpan } from './timeline'

type DrawArgs = {
  readonly bpm: number
  readonly cursorNs: number
  readonly ghostNotes: readonly NoteSpan[]
  readonly metrics: TimelineMetrics
  readonly notes: readonly NoteSpan[]
  readonly offsetMs: number
  readonly selected: ReadonlySet<string>
}

export function drawTimeline(context: CanvasRenderingContext2D, args: DrawArgs): void {
  const { metrics } = args
  context.clearRect(0, 0, metrics.width, metrics.height)
  context.fillStyle = '#101114'
  context.fillRect(0, 0, metrics.width, metrics.height)
  context.fillStyle = '#191b20'
  context.fillRect(0, 0, TIME_RULER_WIDTH, metrics.height)
  drawColumns(context, metrics)
  drawGrid(context, args)
  paintNotes(context, metrics, args.ghostNotes, '#e1c45a', 0.36, new Set())
  paintNotes(context, metrics, args.notes, '#65d6c8', 0.9, args.selected)
  drawCursor(context, metrics, args.cursorNs)
}

function drawGrid(context: CanvasRenderingContext2D, args: DrawArgs): void {
  const { metrics } = args
  const beatNs = Math.max(1, Math.round(NS_PER_SECOND * (60 / Math.max(1, args.bpm))))
  const stepNs = Math.round(beatNs / 4)
  const offsetNs = msToNs(args.offsetMs)
  let stepIndex = 0
  for (let t = -offsetNs; t <= metrics.durationNs; t += stepNs) {
    if (t < 0) {
      stepIndex += 1
      continue
    }
    const y = timeToY(t, metrics)
    const isBeat = stepIndex % 4 === 0
    context.lineWidth = isBeat ? 1.25 : 1
    drawLine(context, 0, y, metrics.width, y, isBeat ? '#4f6373' : '#26313a')
    if (isBeat) {
      context.fillStyle = '#d6dbe3'
      context.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'
      context.textAlign = 'right'
      context.textBaseline = 'middle'
      context.fillText(`${(nsToMs(t) / 1000).toFixed(1)}s`, TIME_RULER_WIDTH - 12, y)
    }
    stepIndex += 1
  }
  context.lineWidth = 1
}

function drawColumns(context: CanvasRenderingContext2D, metrics: TimelineMetrics): void {
  context.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  for (const [index] of metrics.lanes.entries()) {
    const x = laneToX(index)
    context.fillStyle = index % 2 === 0 ? '#14161a' : '#171a1f'
    context.fillRect(x, HEADER_HEIGHT, KEY_LANE_WIDTH, metrics.height - HEADER_HEIGHT)
    drawLine(context, x, 0, x, metrics.height, '#282d35')
  }
  drawLine(
    context,
    TIME_RULER_WIDTH + metrics.lanes.length * KEY_LANE_WIDTH,
    0,
    TIME_RULER_WIDTH + metrics.lanes.length * KEY_LANE_WIDTH,
    metrics.height,
    '#282d35',
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
  color: string,
  alpha: number,
  selected: ReadonlySet<string>,
): void {
  context.globalAlpha = alpha
  for (const note of notes) {
    const rect = noteRect(note, metrics)
    if (!rect) {
      continue
    }
    const { height, width, x, y } = rect
    context.fillStyle = selected.has(note.id) ? '#f5d76e' : color
    roundRect(context, x, y, width, height, 6)
    context.fill()
    context.strokeStyle = selected.has(note.id) ? '#ff00a8' : color
    context.lineWidth = selected.has(note.id) ? 3 : 2
    context.stroke()
    if (selected.has(note.id)) {
      drawResizeHandle(context, x, y, width)
      drawResizeHandle(context, x, y + height, width)
    }
    context.fillStyle = '#edf0f5'
    context.font = '700 12px ui-monospace, SFMono-Regular, Menlo, monospace'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(note.key, x + width / 2, y + Math.min(22, height / 2))
    if (height >= 34) {
      context.fillStyle = '#b7bdc8'
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
  context.fillRect(x + width / 2 - 8, y - 2, 16, 4)
}

function drawCursor(
  context: CanvasRenderingContext2D,
  metrics: TimelineMetrics,
  cursorNs: number,
): void {
  const y = timeToY(cursorNs, metrics)
  drawLine(context, 0, y, metrics.width, y, '#20e6ff')
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
