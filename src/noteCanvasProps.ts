import type { KeyName, SessionEvent } from './types'

export type NoteCanvasControllerProps = {
  readonly bpm: number
  readonly cursorNs: number
  readonly events: readonly SessionEvent[]
  readonly ghostEvents: readonly SessionEvent[]
  readonly isPlaying: boolean
  readonly laneOrder?: readonly KeyName[]
  readonly offsetMs: number
  readonly onCursorChange: (cursorNs: number) => void
  readonly onEventsChange: (events: readonly SessionEvent[]) => void
  readonly onLaneOrderChange: (keys: readonly KeyName[]) => void
  readonly onPlay: () => void
  readonly onStopPlayback: () => void
}
