import { sessionWithTimeline } from '@/lib/session/sessionTimeline'
import { mergeRecordingPreview } from '@/lib/timeline'
import type { KeyName, Session, SessionEvent } from '@/lib/types'

export type RecordingTarget =
  | { readonly kind: 'new' }
  | { readonly kind: 'update'; readonly session: Session }

export type StoppedRecordingResolution = {
  readonly deleteSessionId: string | null
  readonly session: Session
}

export function resolveStoppedRecordingSession(args: {
  readonly baseEvents: readonly SessionEvent[]
  readonly laneOrder: readonly KeyName[]
  readonly recorded: Session
  readonly target: RecordingTarget
}): StoppedRecordingResolution {
  const events = mergeRecordingPreview(args.baseEvents, args.recorded.events)
  if (args.target.kind === 'new') {
    return {
      deleteSessionId: null,
      session: sessionWithTimeline(args.recorded, events, args.recorded.keys),
    }
  }
  return {
    deleteSessionId: args.recorded.id === args.target.session.id ? null : args.recorded.id,
    session: sessionWithTimeline(
      {
        ...args.target.session,
        bpm: args.recorded.bpm,
        offset_ms: args.recorded.offset_ms,
        updated_at: new Date().toISOString(),
      },
      events,
      args.laneOrder,
    ),
  }
}

export function recordingEndNs(events: readonly SessionEvent[]): number {
  let maxNs = 0
  for (const event of events) {
    maxNs = Math.max(maxNs, event.t_ns)
  }
  return maxNs
}
