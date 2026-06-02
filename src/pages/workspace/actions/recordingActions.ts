import type { Dispatch, MutableRefObject, SetStateAction } from 'react'

import {
  recordingEndNs,
  resolveStoppedRecordingSession,
  type RecordingTarget,
} from '@/features/recording/recordingSession'
import type { KeyName, Session, SessionEvent } from '@/lib/types'
import { nsToMs } from '@/lib/timeline'
import type { RuntimeRefresh } from '@/pages/workspace/runtime/runtimeRefresh'
import type { Action, Settings } from '@/store/appStore'
import type { TauriApi } from '@/tauri/tauriClient'

type RecordingActionArgs = {
  readonly bpmError: string | null
  readonly client: TauriApi
  readonly cursorNs: number
  readonly dispatch: Dispatch<Action>
  readonly recordName: string
  readonly recordingBaseEventsRef: MutableRefObject<readonly SessionEvent[]>
  readonly recordingTargetRef: MutableRefObject<RecordingTarget>
  readonly runtime: RuntimeRefresh
  readonly selectLoadedSession: (session: Session) => void
  readonly setCursorNs: Dispatch<SetStateAction<number>>
  readonly settings: Settings
  readonly timelineKeys: readonly KeyName[]
}

export function createRecordingActions(args: RecordingActionArgs) {
  async function onStartRecording(): Promise<void> {
    args.recordingBaseEventsRef.current = []
    args.recordingTargetRef.current = { kind: 'new' }
    await args.client.startRecording()
    await args.runtime.refreshStatus()
  }

  async function onStartRecordingAt(): Promise<void> {
    args.recordingBaseEventsRef.current = []
    args.recordingTargetRef.current = { kind: 'new' }
    await args.client.startRecordingAt(nsToMs(args.cursorNs))
    await args.runtime.refreshStatus()
  }

  async function onStopRecording(): Promise<void> {
    if (args.bpmError) {
      args.dispatch({ type: 'set_error', error: args.bpmError })
      return
    }
    const recorded = await args.client.stopRecording({
      name: args.recordName,
      bpm: args.settings.bpm,
      offset_ms: args.settings.offset_ms,
    })
    const result = resolveStoppedRecordingSession({
      baseEvents: args.recordingBaseEventsRef.current,
      laneOrder: args.timelineKeys,
      recorded,
      target: args.recordingTargetRef.current,
    })
    await args.client.updateSession(result.session)
    if (result.deleteSessionId) {
      await args.client.deleteSession(result.deleteSessionId)
    }
    args.selectLoadedSession(result.session)
    args.setCursorNs(recordingEndNs(result.session.events))
    await args.runtime.refreshAll(result.session.id)
  }

  return { onStartRecording, onStartRecordingAt, onStopRecording }
}
