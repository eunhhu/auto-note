import type { Dispatch } from 'react'

import { errorMessage } from '@/lib/errorMessage'
import type { Session } from '@/lib/types'
import type { RuntimeRefresh } from '@/pages/workspace/runtime/runtimeRefresh'
import type { Action } from '@/store/appStore'
import type { TauriApi } from '@/tauri/tauriClient'

type PlaybackActionArgs = {
  readonly client: TauriApi
  readonly dispatch: Dispatch<Action>
  readonly runtime: RuntimeRefresh
  readonly saveTimeline: () => Promise<Session | null>
}

export function createPlaybackActions(args: PlaybackActionArgs) {
  async function onPausePlayback(): Promise<void> {
    try {
      await args.client.pausePlayback()
      await args.runtime.refreshStatus()
    } catch (error) {
      args.dispatch({ type: 'set_error', error: errorMessage(error) })
    }
  }

  async function onResumePlayback(): Promise<void> {
    try {
      await args.client.resumePlayback()
      await args.runtime.refreshStatus()
    } catch (error) {
      args.dispatch({ type: 'set_error', error: errorMessage(error) })
    }
  }

  async function onPlay(): Promise<void> {
    try {
      const session = await args.saveTimeline()
      if (!session) {
        return
      }
      await args.client.playSession(session.id)
      args.dispatch({ type: 'set_report', report: await args.client.timingReport() })
      await args.runtime.refreshStatus()
    } catch (error) {
      args.dispatch({ type: 'set_error', error: errorMessage(error) })
    }
  }

  async function onStopPlayback(): Promise<void> {
    try {
      await args.client.stopPlayback()
      args.dispatch({ type: 'set_report', report: await args.client.timingReport() })
      await args.runtime.refreshStatus()
    } catch (error) {
      args.dispatch({ type: 'set_error', error: errorMessage(error) })
    }
  }

  return { onPausePlayback, onPlay, onResumePlayback, onStopPlayback }
}
