import { deriveKeys, mergeLaneOrder } from '@/lib/timeline'
import type { KeyName, Session, SessionEvent } from '@/lib/types'

export function sessionWithTimeline(
  session: Session,
  events: readonly SessionEvent[],
  laneOrder: readonly KeyName[],
): Session {
  return {
    ...session,
    keys: mergeLaneOrder(laneOrder, deriveKeys(events)),
    events,
  }
}
