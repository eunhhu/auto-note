import { ChevronLeft, ChevronRight } from 'lucide-react'

import type { KeyName } from './types'

type Props = {
  readonly lanes: readonly KeyName[]
  readonly lane: KeyName
  readonly onMoveLane: (lane: KeyName, direction: 'left' | 'right') => void
}

export function NoteLaneHeader(props: Props) {
  const index = props.lanes.indexOf(props.lane)
  return (
    <div className="timeline-lane-pill">
      <button
        type="button"
        aria-label={`Move ${props.lane} left`}
        className="lane-order-button"
        disabled={index <= 0}
        onClick={() => props.onMoveLane(props.lane, 'left')}
      >
        <ChevronLeft size={13} />
      </button>
      <span>{props.lane}</span>
      <button
        type="button"
        aria-label={`Move ${props.lane} right`}
        className="lane-order-button"
        disabled={index < 0 || index >= props.lanes.length - 1}
        onClick={() => props.onMoveLane(props.lane, 'right')}
      >
        <ChevronRight size={13} />
      </button>
    </div>
  )
}
