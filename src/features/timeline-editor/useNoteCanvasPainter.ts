import { useEffect, type RefObject } from 'react'

import { canvasBitmapSize, type TimelineMetrics } from '@/features/timeline-editor/noteCanvasModel'
import type { MarqueeRect } from '@/features/timeline-editor/noteCanvasInteraction'
import type { NoteCanvasControllerProps } from '@/features/timeline-editor/noteCanvasProps'
import { drawTimeline } from '@/features/timeline-editor/noteCanvasPaint'
import type { NoteSpan } from '@/lib/timeline'

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
  const { bpm, cursorNs, offsetMs } = args.props
  useEffect(() => {
    const canvas = args.canvasRef.current
    if (!canvas) {
      return
    }
    const size = canvasBitmapSize(args.metrics, window.devicePixelRatio || 1)
    if (canvas.width !== size.bitmapWidth) {
      canvas.width = size.bitmapWidth
    }
    if (canvas.height !== size.bitmapHeight) {
      canvas.height = size.bitmapHeight
    }
    canvas.style.width = `${size.cssWidth}px`
    canvas.style.height = `${size.cssHeight}px`
    const context = canvas.getContext('2d')
    if (!context) {
      return
    }
    const scroller = canvas.parentElement
    let frame = 0
    function paint(): void {
      if (!context || !canvas) {
        return
      }
      const viewport = visibleCanvasRange(canvas, scroller)
      context.setTransform(size.xRatio, 0, 0, size.yRatio, 0, 0)
      drawTimeline(context, {
        bpm,
        cursorNs,
        ghostNotes: args.ghostNotes,
        marquee: args.marquee,
        metrics: args.metrics,
        notes: args.notes,
        offsetMs,
        selected: args.selected,
        viewportBottom: viewport.bottom,
        viewportTop: viewport.top,
      })
    }
    function schedulePaint(): void {
      if (frame !== 0) {
        return
      }
      frame = window.requestAnimationFrame(() => {
        frame = 0
        paint()
      })
    }
    paint()
    scroller?.addEventListener('scroll', schedulePaint, { passive: true })
    return () => {
      scroller?.removeEventListener('scroll', schedulePaint)
      if (frame !== 0) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [
    args.canvasRef,
    args.ghostNotes,
    args.marquee,
    args.metrics,
    args.notes,
    args.selected,
    bpm,
    cursorNs,
    offsetMs,
  ])
}

function visibleCanvasRange(
  canvas: HTMLCanvasElement,
  scroller: HTMLElement | null,
): { readonly bottom: number; readonly top: number } {
  if (!scroller) {
    return { bottom: canvas.offsetHeight, top: 0 }
  }
  const canvasTopInScroller =
    canvas.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
  const top = Math.max(0, scroller.scrollTop - canvasTopInScroller)
  return { bottom: Math.min(canvas.offsetHeight, top + scroller.clientHeight), top }
}
