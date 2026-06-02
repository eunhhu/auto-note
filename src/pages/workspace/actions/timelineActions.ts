import type { Dispatch, SetStateAction } from 'react'

import { removeLaneEvents } from '@/lib/timeline'
import type { KeyName, SessionEvent } from '@/lib/types'
import type { Action, AppState } from '@/store/appStore'

type TimelineActionArgs = {
  readonly dispatch: Dispatch<Action>
  readonly setShowGhostNotes: Dispatch<SetStateAction<boolean>>
  readonly state: AppState
}

export function createTimelineActions(args: TimelineActionArgs) {
  function onTimelineEventsChange(events: readonly SessionEvent[]): void {
    args.dispatch({ type: 'set_timeline_events', events })
  }

  function onLaneOrderChange(keys: readonly KeyName[]): void {
    args.dispatch({ type: 'set_timeline_keys', keys })
  }

  function onDeleteLane(key: KeyName): void {
    args.dispatch({
      type: 'set_timeline_events',
      events: removeLaneEvents(args.state.timelineEvents, key),
    })
    args.dispatch({
      type: 'set_timeline_keys',
      keys: args.state.timelineKeys.filter((lane) => lane !== key),
    })
  }

  function onToggleGhostNotes(): void {
    args.setShowGhostNotes((value) => !value)
  }

  return { onDeleteLane, onLaneOrderChange, onTimelineEventsChange, onToggleGhostNotes }
}
