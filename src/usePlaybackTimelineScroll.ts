import { useEffect, type RefObject } from 'react'

import { timeToY, type TimelineMetrics } from './noteCanvasModel'

type Args = {
  readonly cursorNs: number
  readonly isPlaying: boolean
  readonly metrics: TimelineMetrics
  readonly scrollRef: RefObject<HTMLDivElement | null>
}

export function usePlaybackTimelineScroll(args: Args): void {
  useEffect(() => {
    if (!args.isPlaying) {
      return
    }
    const element = args.scrollRef.current
    if (!element) {
      return
    }
    const cursorY = timeToY(args.cursorNs, args.metrics)
    const topGuard = element.scrollTop + 80
    const bottomGuard = element.scrollTop + element.clientHeight - 130
    if (cursorY >= topGuard && cursorY <= bottomGuard) {
      return
    }
    element.scrollTop = Math.max(0, cursorY - element.clientHeight * 0.35)
  }, [args.cursorNs, args.isPlaying, args.metrics, args.scrollRef])
}
