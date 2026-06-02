import { describe, expect, it } from 'vitest'

import { snappedMoveDeltaNs } from '@/features/timeline-editor/noteCanvasInteraction'
import { msToNs } from '@/lib/timeline'

describe('note canvas interaction', () => {
  it('returns a movement delta that lands the dragged note start on the bpm grid', () => {
    const delta = snappedMoveDeltaNs({
      bpm: 180,
      offsetMs: 0,
      originStartNs: msToNs(100),
      rawDeltaNs: msToNs(180),
    })

    expect(delta).toBe(149_999_999)
  })
})
