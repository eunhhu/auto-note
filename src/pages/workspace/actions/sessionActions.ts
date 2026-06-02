import type { Dispatch, SetStateAction } from 'react'

import { applyHotkeyTarget } from '@/features/hotkeys/applyHotkeyTarget'
import type { HotkeyTarget } from '@/features/hotkeys/hotkeyTargets'
import { errorMessage } from '@/lib/errorMessage'
import { parseSessionJson } from '@/lib/session/sessionSchema'
import { sessionWithTimeline } from '@/lib/session/sessionTimeline'
import type { Session } from '@/lib/types'
import type { RuntimeRefresh } from '@/pages/workspace/runtime/runtimeRefresh'
import type { Action, AppState } from '@/store/appStore'
import type { TauriApi } from '@/tauri/tauriClient'

type SessionActionArgs = {
  readonly bpmError: string | null
  readonly client: TauriApi
  readonly dispatch: Dispatch<Action>
  readonly runtime: RuntimeRefresh
  readonly selectedSession: Session | null
  readonly selectLoadedSession: (session: Session) => void
  readonly setCapturingHotkey: Dispatch<SetStateAction<HotkeyTarget | null>>
  readonly state: AppState
}

export function createSessionActions(args: SessionActionArgs) {
  async function onApplyEditor(): Promise<void> {
    if (!args.selectedSession || args.bpmError) {
      return
    }
    const nextSession = sessionWithTimeline(
      {
        ...args.selectedSession,
        bpm: args.state.settings.bpm,
        offset_ms: args.state.settings.offset_ms,
        updated_at: new Date().toISOString(),
      },
      args.state.timelineEvents,
      args.state.timelineKeys,
    )
    await args.client.updateSession(nextSession)
    await args.runtime.refreshAll(nextSession.id)
  }

  async function onCaptureHotkey(target: HotkeyTarget, value: string): Promise<void> {
    args.setCapturingHotkey(null)
    await applyHotkeyTarget({
      client: args.client,
      dispatch: args.dispatch,
      target,
      value,
    })
    await args.runtime.refreshStatus()
  }

  async function onDeleteSession(sessionId: string): Promise<void> {
    await args.client.deleteSession(sessionId)
    await args.runtime.refreshAll(
      args.state.selectedSessionId === sessionId ? null : args.state.selectedSessionId,
    )
  }

  async function onImportJson(): Promise<void> {
    try {
      parseSessionJson(args.state.importText)
      const session = await args.client.importSessionJson(args.state.importText)
      args.selectLoadedSession(session)
      await args.runtime.refreshAll(session.id)
      args.dispatch({ type: 'set_error', error: null })
    } catch (error) {
      args.dispatch({ type: 'set_error', error: errorMessage(error) })
    }
  }

  async function onExportJson(): Promise<void> {
    if (!args.selectedSession) {
      return
    }
    args.dispatch({
      type: 'set_export',
      text: await args.client.exportSessionJson(args.selectedSession.id),
    })
  }

  return { onApplyEditor, onCaptureHotkey, onDeleteSession, onExportJson, onImportJson }
}
