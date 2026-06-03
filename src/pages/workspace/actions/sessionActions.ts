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
  async function saveTimeline(): Promise<Session | null> {
    if (!args.selectedSession) {
      return null
    }
    if (args.bpmError) {
      args.dispatch({
        type: 'set_timeline_save_status',
        status: { kind: 'error', message: args.bpmError },
      })
      args.dispatch({ type: 'set_error', error: args.bpmError })
      return null
    }
    if (args.state.timelineSaveStatus.kind === 'saved') {
      return args.selectedSession
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
    args.dispatch({ type: 'set_timeline_save_status', status: { kind: 'saving' } })
    try {
      await args.client.updateSession(nextSession)
      args.selectLoadedSession(nextSession)
      args.dispatch({ type: 'set_error', error: null })
      await args.runtime.refreshAll(nextSession.id)
      return nextSession
    } catch (error) {
      const message = errorMessage(error)
      args.dispatch({
        type: 'set_timeline_save_status',
        status: { kind: 'error', message },
      })
      args.dispatch({ type: 'set_error', error: message })
      return null
    }
  }

  async function onApplyEditor(): Promise<void> {
    await saveTimeline()
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
    const session = await saveTimeline()
    if (!session) {
      return
    }
    args.dispatch({
      type: 'set_export',
      text: await args.client.exportSessionJson(session.id),
    })
  }

  return {
    onApplyEditor,
    onCaptureHotkey,
    onDeleteSession,
    onExportJson,
    onImportJson,
    saveTimeline,
  }
}
