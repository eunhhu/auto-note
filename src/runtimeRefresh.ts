import type { Dispatch, SetStateAction } from 'react'

import type { Action, Settings } from './store'
import type { TauriApi } from './tauriClient'
import type { Session } from './types'

type Args = {
  readonly client: TauriApi
  readonly dispatch: Dispatch<Action>
  readonly selectedSessionId: string | null
  readonly selectLoadedSession: (session: Session) => void
  readonly setCursorNs: Dispatch<SetStateAction<number>>
  readonly settings: Settings
}

export function createRuntimeRefresh(args: Args) {
  async function syncConfiguredHotkeys(): Promise<void> {
    try {
      await Promise.all([
        args.client.setHotkey(args.settings.hotkey),
        args.client.setPlayHotkey(args.settings.play_hotkey),
        args.client.setStopHotkey(args.settings.stop_hotkey),
      ])
    } catch (error) {
      args.dispatch({ type: 'set_error', error: String(error) })
    }
  }

  async function refreshStatus(): Promise<void> {
    try {
      const nextStatus = await args.client.getStatus()
      args.dispatch({ type: 'set_status', status: nextStatus })
      if (nextStatus.playback_cursor_ns !== null) {
        args.setCursorNs(nextStatus.playback_cursor_ns)
      }
      args.dispatch({ type: 'set_error', error: null })
    } catch (error) {
      args.dispatch({ type: 'set_error', error: String(error) })
    }
  }

  async function refreshAll(preferredSessionId?: string | null): Promise<void> {
    try {
      const [status, ids, platform] = await Promise.all([
        args.client.getStatus(),
        args.client.listSessions(),
        args.client.platformStatus(),
      ])
      const loaded = await Promise.all(ids.map((id) => args.client.loadSession(id)))
      args.dispatch({ type: 'set_status', status })
      args.dispatch({ type: 'set_platform', platform })
      args.dispatch({ type: 'set_sessions', sessions: loaded })
      selectBestLoadedSession(loaded, preferredSessionId)
      args.dispatch({ type: 'set_error', error: null })
    } catch (error) {
      args.dispatch({ type: 'set_error', error: String(error) })
    }
  }

  function selectBestLoadedSession(
    loaded: readonly Session[],
    preferredSessionId?: string | null,
  ): void {
    const requestedId =
      preferredSessionId === undefined ? args.selectedSessionId : preferredSessionId
    const nextSession =
      loaded.find((session) => session.id === requestedId) ?? loaded[0] ?? null
    if (nextSession) {
      args.selectLoadedSession(nextSession)
      return
    }
    args.dispatch({ type: 'select_session', sessionId: null })
    args.dispatch({ type: 'set_timeline_keys', keys: [] })
    args.dispatch({ type: 'set_timeline_events', events: [] })
  }

  return { refreshAll, refreshStatus, syncConfiguredHotkeys }
}
