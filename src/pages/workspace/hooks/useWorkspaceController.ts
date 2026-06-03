import { useEffect, useMemo, useReducer, useRef, useState } from 'react'

import type { HotkeyTarget } from '@/features/hotkeys/hotkeyTargets'
import { useTimelineHotkeys } from '@/features/hotkeys/useTimelineHotkeys'
import type { RecordingTarget } from '@/features/recording/recordingSession'
import type { Session, SessionEvent } from '@/lib/types'
import { createPlaybackActions } from '@/pages/workspace/actions/playbackActions'
import { createRecordingActions } from '@/pages/workspace/actions/recordingActions'
import { createSessionActions } from '@/pages/workspace/actions/sessionActions'
import { createTimelineActions } from '@/pages/workspace/actions/timelineActions'
import {
  activeKeyEntries,
  bpmValidationError,
  displayedTimelineEvents,
  findSelectedSession,
  otherSessionEvents,
} from '@/pages/workspace/model/mainAppDerivedState'
import { selectWorkspaceSession } from '@/pages/workspace/model/workspaceSelection'
import { createRuntimeRefresh } from '@/pages/workspace/runtime/runtimeRefresh'
import { appReducer, createInitialState, persistSettings } from '@/store/appStore'
import { createTauriClient } from '@/tauri/tauriClient'

export function useWorkspaceController() {
  const client = useMemo(() => createTauriClient(), [])
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState)
  const [recordName, setRecordName] = useState('New Session')
  const [cursorNs, setCursorNs] = useState(0)
  const [capturingHotkey, setCapturingHotkey] = useState<HotkeyTarget | null>(null)
  const [showGhostNotes, setShowGhostNotes] = useState(true)
  const recordingBaseEventsRef = useRef<readonly SessionEvent[]>([])
  const recordingTargetRef = useRef<RecordingTarget>({ kind: 'new' })

  const selectedSession = findSelectedSession(state.sessions, state.selectedSessionId) ?? null
  const bpmError = bpmValidationError(state.settings.bpm)
  const ghostEvents = useMemo(
    () => otherSessionEvents(state.sessions, state.selectedSessionId),
    [state.sessions, state.selectedSessionId],
  )
  const timelineEvents = useMemo(
    () =>
      displayedTimelineEvents({
        baseEvents: recordingBaseEventsRef.current,
        isRecording: state.status.is_recording,
        liveEvents: state.status.live_events,
        timelineEvents: state.timelineEvents,
      }),
    [state.status.is_recording, state.status.live_events, state.timelineEvents],
  )
  const activeKeys = activeKeyEntries(state.status.keys)
  const selectLoadedSession = (session: Session): void => selectWorkspaceSession(dispatch, session)
  const runtime = createRuntimeRefresh({
    client,
    dispatch,
    selectedSessionId: state.selectedSessionId,
    selectLoadedSession,
    setCursorNs,
    settings: state.settings,
  })
  const sessionActions = createSessionActions({
    bpmError,
    client,
    dispatch,
    runtime,
    selectedSession,
    selectLoadedSession,
    setCapturingHotkey,
    state,
  })
  const playbackActions = createPlaybackActions({
    client,
    dispatch,
    runtime,
    saveTimeline: sessionActions.saveTimeline,
  })
  const recordingActions = createRecordingActions({
    bpmError,
    client,
    cursorNs,
    dispatch,
    recordName,
    recordingBaseEventsRef,
    recordingTargetRef,
    runtime,
    selectLoadedSession,
    setCursorNs,
    settings: state.settings,
    timelineKeys: state.timelineKeys,
  })
  const timelineActions = createTimelineActions({ dispatch, setShowGhostNotes, state })

  useEffect(() => {
    persistSettings(state.settings)
  }, [state.settings])

  useEffect(() => {
    void runtime.syncConfiguredHotkeys()
    void runtime.refreshAll()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void runtime.refreshStatus()
    }, 75)
    return () => window.clearInterval(timer)
  }, [client])

  useTimelineHotkeys({
    capturingHotkey,
    status: state.status,
    onPausePlayback: playbackActions.onPausePlayback,
    onPlay: playbackActions.onPlay,
    onResumePlayback: playbackActions.onResumePlayback,
    onStartRecording: recordingActions.onStartRecording,
    onStartRecordingAt: recordingActions.onStartRecordingAt,
    onStopPlayback: playbackActions.onStopPlayback,
    onStopRecording: recordingActions.onStopRecording,
  })

  return {
    activeKeys,
    bpmError,
    capturingHotkey,
    cursorNs,
    ghostEvents,
    recordName,
    selectedSession,
    showGhostNotes,
    state,
    timelineEvents,
    actions: {
      ...playbackActions,
      ...recordingActions,
      ...sessionActions,
      ...timelineActions,
      onRecordNameChange: setRecordName,
      onSelectSession: selectLoadedSession,
      onSetBpm: (value: number) => dispatch({ type: 'set_bpm', value }),
      onSetImportText: (text: string) => dispatch({ type: 'set_import', text }),
      onSetOffsetMs: (value: number) => dispatch({ type: 'set_offset_ms', value }),
      onStartHotkeyCapture: setCapturingHotkey,
      setCursorNs,
    },
  }
}

export type WorkspaceController = ReturnType<typeof useWorkspaceController>
