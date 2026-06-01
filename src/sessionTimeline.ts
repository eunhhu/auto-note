import { deriveKeys, mergeLaneOrder } from './timeline'
import type { KeyName, Session, SessionEvent } from './types'

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
