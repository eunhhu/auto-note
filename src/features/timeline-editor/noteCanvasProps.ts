import type { KeyName, SessionEvent } from '@/lib/types'

export type NoteCanvasControllerProps = {
  readonly bpm: number
  readonly cursorNs: number
  readonly events: readonly SessionEvent[]
  readonly ghostEventCount: number
  readonly ghostEvents: readonly SessionEvent[]
  readonly showGhostNotes: boolean
  readonly isPlaying: boolean
  readonly isPlaybackPaused: boolean
  readonly laneOrder?: readonly KeyName[]
  readonly offsetMs: number
  readonly onCursorChange: (cursorNs: number) => void
  readonly onEventsChange: (events: readonly SessionEvent[]) => void
  readonly onDeleteLane: (key: KeyName) => void
  readonly onLaneOrderChange: (keys: readonly KeyName[]) => void
  readonly onPausePlayback: () => void
  readonly onPlay: () => void
  readonly onResumePlayback: () => void
  readonly onStopPlayback: () => void
  readonly onToggleGhostNotes: () => void
}

export type NoteCanvasControllerOptions = {
  readonly gridSnapEnabled: boolean
}
