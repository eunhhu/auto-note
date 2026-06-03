import type { Dispatch } from 'react'

import { deriveKeys, mergeLaneOrder } from '@/lib/timeline'
import type { Session } from '@/lib/types'
import type { Action } from '@/store/appStore'

export function selectWorkspaceSession(dispatch: Dispatch<Action>, session: Session): void {
  dispatch({ type: 'select_session', sessionId: session.id })
  dispatch({ type: 'set_timeline_keys', keys: mergeLaneOrder(session.keys, deriveKeys(session.events)) })
  dispatch({ type: 'set_timeline_events', events: session.events })
  dispatch({ type: 'set_bpm', value: session.bpm })
  dispatch({ type: 'set_offset_ms', value: session.offset_ms })
  dispatch({ type: 'set_timeline_save_status', status: { kind: 'saved' } })
}

export function clearWorkspaceSession(dispatch: Dispatch<Action>): void {
  dispatch({ type: 'select_session', sessionId: null })
  dispatch({ type: 'set_timeline_keys', keys: [] })
  dispatch({ type: 'set_timeline_events', events: [] })
  dispatch({ type: 'set_timeline_save_status', status: { kind: 'saved' } })
}
