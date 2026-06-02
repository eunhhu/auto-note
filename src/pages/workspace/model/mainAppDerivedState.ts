import { mergeRecordingPreview } from '@/lib/timeline'
import type { KeyName, Session, SessionEvent } from '@/lib/types'

export function findSelectedSession(
  sessions: readonly Session[],
  selectedSessionId: string | null,
): Session | undefined {
  return sessions.find((session) => session.id === selectedSessionId)
}

export function bpmValidationError(bpm: number): string | null {
  return Number.isFinite(bpm) && bpm > 0 ? null : 'BPM must be greater than 0'
}

export function otherSessionEvents(
  sessions: readonly Session[],
  selectedSessionId: string | null,
): readonly SessionEvent[] {
  return sessions
    .filter((session) => session.id !== selectedSessionId)
    .flatMap((session) => session.events)
}

export function displayedTimelineEvents(args: {
  readonly baseEvents: readonly SessionEvent[]
  readonly isRecording: boolean
  readonly liveEvents: readonly SessionEvent[]
  readonly timelineEvents: readonly SessionEvent[]
}): readonly SessionEvent[] {
  return args.isRecording
    ? mergeRecordingPreview(args.baseEvents, args.liveEvents)
    : args.timelineEvents
}

export function activeKeyEntries(
  keys: Record<KeyName, boolean>,
): readonly [KeyName, boolean][] {
  return Object.entries(keys).filter(([, down]) => down)
}
