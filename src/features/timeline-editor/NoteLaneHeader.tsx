import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'

import type { KeyName } from '@/lib/types'

type Props = {
  readonly lanes: readonly KeyName[]
  readonly lane: KeyName
  readonly canDelete: boolean
  readonly onDeleteLane: (lane: KeyName) => void
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
      <button
        type="button"
        aria-label={`Delete lane ${props.lane}`}
        className="lane-order-button lane-delete-button"
        disabled={!props.canDelete}
        onClick={() => props.onDeleteLane(props.lane)}
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}
