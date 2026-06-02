import { useEffect, useRef, type RefObject } from 'react'

import { timeToY, type TimelineMetrics } from '@/features/timeline-editor/noteCanvasModel'

type Args = {
  readonly cursorNs: number
  readonly followPlayback: boolean
  readonly isPlaying: boolean
  readonly metrics: TimelineMetrics
  readonly scrollRef: RefObject<HTMLDivElement | null>
}

export function usePlaybackTimelineScroll(args: Args): void {
  const frameRef = useRef(0)

  useEffect(() => {
    if (!args.isPlaying || !args.followPlayback) {
      return
    }
    const element = args.scrollRef.current
    if (!element) {
      return
    }
    if (frameRef.current !== 0) {
      window.cancelAnimationFrame(frameRef.current)
    }
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = 0
      const cursorY = timeToY(args.cursorNs, args.metrics)
      const topGuard = element.scrollTop + element.clientHeight * 0.22
      const bottomGuard = element.scrollTop + element.clientHeight * 0.72
      if (cursorY >= topGuard && cursorY <= bottomGuard) {
        return
      }
      element.scrollTop = Math.max(0, cursorY - element.clientHeight * 0.35)
    })
    return () => {
      if (frameRef.current !== 0) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = 0
      }
    }
  }, [args.cursorNs, args.followPlayback, args.isPlaying, args.metrics, args.scrollRef])
}
