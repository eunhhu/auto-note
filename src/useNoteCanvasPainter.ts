import { useEffect, type RefObject } from 'react'

import { canvasBitmapSize, type TimelineMetrics } from './noteCanvasModel'
import type { MarqueeRect } from './noteCanvasInteraction'
import type { NoteCanvasControllerProps } from './noteCanvasProps'
import { drawTimeline } from './noteCanvasPaint'
import type { NoteSpan } from './timeline'

type PaintArgs = {
  readonly canvasRef: RefObject<HTMLCanvasElement | null>
  readonly ghostNotes: readonly NoteSpan[]
  readonly marquee: MarqueeRect | null
  readonly metrics: TimelineMetrics
  readonly notes: readonly NoteSpan[]
  readonly props: NoteCanvasControllerProps
  readonly selected: ReadonlySet<string>
}

export function useNoteCanvasPainter(args: PaintArgs): void {
  useEffect(() => {
    const canvas = args.canvasRef.current
    if (!canvas) {
      return
    }
    const size = canvasBitmapSize(args.metrics, window.devicePixelRatio || 1)
    canvas.width = size.bitmapWidth
    canvas.height = size.bitmapHeight
    canvas.style.width = `${size.cssWidth}px`
    canvas.style.height = `${size.cssHeight}px`
    const context = canvas.getContext('2d')
    if (!context) {
      return
    }
    context.setTransform(size.ratio, 0, 0, size.ratio, 0, 0)
    drawTimeline(context, {
      ...args.props,
      ghostNotes: args.ghostNotes,
      marquee: args.marquee,
      metrics: args.metrics,
      notes: args.notes,
      selected: args.selected,
    })
  }, [args])
}
