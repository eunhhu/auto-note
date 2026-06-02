import type { Dispatch, SetStateAction } from 'react'

import type { Action, Settings } from '@/store/appStore'
import type { TauriApi } from '@/tauri/tauriClient'
import type { Session } from '@/lib/types'
import { errorMessage } from '@/lib/errorMessage'
import { clearWorkspaceSession } from '@/pages/workspace/model/workspaceSelection'

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
        args.client.setPunchInHotkey(args.settings.punch_in_hotkey),
        args.client.setStopHotkey(args.settings.stop_hotkey),
      ])
    } catch (error) {
      args.dispatch({ type: 'set_error', error: errorMessage(error) })
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
      args.dispatch({ type: 'set_error', error: errorMessage(error) })
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
      args.dispatch({ type: 'set_error', error: errorMessage(error) })
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
    clearWorkspaceSession(args.dispatch)
  }

  return { refreshAll, refreshStatus, syncConfiguredHotkeys }
}

export type RuntimeRefresh = ReturnType<typeof createRuntimeRefresh>
