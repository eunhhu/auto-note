import { useEffect, useMemo, useReducer, useRef, useState } from 'react'

import type { HotkeyTarget } from './hotkeyTargets'
import { createRuntimeRefresh } from './runtimeRefresh'
import { parseSessionJson } from './sessionSchema'
import { sessionWithTimeline } from './sessionTimeline'
import { appReducer, createInitialState, persistSettings } from './store'
import { deriveKeys, mergeLaneOrder, mergeRecordingPreview, nsToMs } from './timeline'
import { createTauriClient } from './tauriClient'
import type { KeyName, Session, SessionEvent } from './types'

export function useMainAppController() {
  const client = useMemo(() => createTauriClient(), [])
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState)
  const [recordName, setRecordName] = useState('New Session')
  const [cursorNs, setCursorNs] = useState(0)
  const [capturingHotkey, setCapturingHotkey] = useState<HotkeyTarget | null>(null)
  const recordingBaseEventsRef = useRef<readonly SessionEvent[]>([])

  const selectedSession = state.sessions.find(
    (session) => session.id === state.selectedSessionId,
  )
  const bpmError =
    !Number.isFinite(state.settings.bpm) || state.settings.bpm <= 0
      ? 'BPM must be greater than 0'
      : null
  const ghostEvents = useMemo(
    () =>
      state.sessions
        .filter((session) => session.id !== state.selectedSessionId)
        .flatMap((session) => session.events),
    [state.sessions, state.selectedSessionId],
  )
  const timelineEvents = useMemo(
    () =>
      state.status.is_recording
        ? mergeRecordingPreview(recordingBaseEventsRef.current, state.status.live_events)
        : state.timelineEvents,
    [state.status.is_recording, state.status.live_events, state.timelineEvents],
  )
  const activeKeys = Object.entries(state.status.keys).filter(([, down]) => down)
  const runtime = createRuntimeRefresh({
    client,
    dispatch,
    selectedSessionId: state.selectedSessionId,
    selectLoadedSession,
    setCursorNs,
    settings: state.settings,
  })

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

  async function onStartRecording(): Promise<void> {
    recordingBaseEventsRef.current = state.timelineEvents
    await client.startRecording()
    await runtime.refreshStatus()
  }

  async function onStartRecordingAt(): Promise<void> {
    recordingBaseEventsRef.current = state.timelineEvents
    await client.startRecordingAt(nsToMs(cursorNs))
    await runtime.refreshStatus()
  }

  async function onStopRecording(): Promise<void> {
    if (bpmError) {
      dispatch({ type: 'set_error', error: bpmError })
      return
    }
    const recorded = await client.stopRecording({
      name: recordName,
      bpm: state.settings.bpm,
      offset_ms: state.settings.offset_ms,
    })
    const mergedEvents = mergeRecordingPreview(recordingBaseEventsRef.current, recorded.events)
    const nextSession = sessionWithTimeline(recorded, mergedEvents, state.timelineKeys)
    await client.updateSession(nextSession)
    selectLoadedSession(nextSession)
    await runtime.refreshAll(nextSession.id)
  }

  async function onPlay(): Promise<void> {
    if (!selectedSession) {
      return
    }
    try {
      await client.playSession(selectedSession.id)
      dispatch({ type: 'set_report', report: await client.timingReport() })
      await runtime.refreshStatus()
    } catch (error) {
      dispatch({ type: 'set_error', error: String(error) })
    }
  }

  async function onStopPlayback(): Promise<void> {
    await client.stopPlayback()
    dispatch({ type: 'set_report', report: await client.timingReport() })
    await runtime.refreshStatus()
  }

  function selectLoadedSession(session: Session): void {
    dispatch({ type: 'select_session', sessionId: session.id })
    dispatch({ type: 'set_timeline_keys', keys: mergeLaneOrder(session.keys, deriveKeys(session.events)) })
    dispatch({ type: 'set_timeline_events', events: session.events })
    dispatch({ type: 'set_bpm', value: session.bpm })
    dispatch({ type: 'set_offset_ms', value: session.offset_ms })
  }

  async function onApplyEditor(): Promise<void> {
    if (!selectedSession || bpmError) {
      return
    }
    const nextSession = sessionWithTimeline(
      {
        ...selectedSession,
        bpm: state.settings.bpm,
        offset_ms: state.settings.offset_ms,
        updated_at: new Date().toISOString(),
      },
      state.timelineEvents,
      state.timelineKeys,
    )
    await client.updateSession(nextSession)
    await runtime.refreshAll(nextSession.id)
  }

  async function onCaptureHotkey(target: HotkeyTarget, value: string): Promise<void> {
    setCapturingHotkey(null)
    if (target === 'record') {
      dispatch({ type: 'set_hotkey', value })
      await client.setHotkey(value)
    } else if (target === 'play') {
      dispatch({ type: 'set_play_hotkey', value })
      await client.setPlayHotkey(value)
    } else {
      dispatch({ type: 'set_stop_hotkey', value })
      await client.setStopHotkey(value)
    }
    await runtime.refreshStatus()
  }

  async function onDeleteSession(sessionId: string): Promise<void> {
    await client.deleteSession(sessionId)
    await runtime.refreshAll(state.selectedSessionId === sessionId ? null : state.selectedSessionId)
  }

  async function onImportJson(): Promise<void> {
    try {
      parseSessionJson(state.importText)
      const session = await client.importSessionJson(state.importText)
      selectLoadedSession(session)
      await runtime.refreshAll(session.id)
      dispatch({ type: 'set_error', error: null })
    } catch (error) {
      dispatch({ type: 'set_error', error: String(error) })
    }
  }

  async function onExportJson(): Promise<void> {
    if (!selectedSession) {
      return
    }
    dispatch({
      type: 'set_export',
      text: await client.exportSessionJson(selectedSession.id),
    })
  }

  function onTimelineEventsChange(events: readonly SessionEvent[]): void {
    dispatch({ type: 'set_timeline_events', events })
  }

  function onLaneOrderChange(keys: readonly KeyName[]): void {
    dispatch({ type: 'set_timeline_keys', keys })
  }

  return {
    activeKeys,
    bpmError,
    capturingHotkey,
    cursorNs,
    ghostEvents,
    recordName,
    selectedSession,
    state,
    timelineEvents,
    actions: {
      onApplyEditor,
      onCaptureHotkey,
      onDeleteSession,
      onExportJson,
      onImportJson,
      onLaneOrderChange,
      onPlay,
      onRecordNameChange: setRecordName,
      onSelectSession: selectLoadedSession,
      onSetBpm: (value: number) => dispatch({ type: 'set_bpm', value }),
      onSetImportText: (text: string) => dispatch({ type: 'set_import', text }),
      onSetOffsetMs: (value: number) => dispatch({ type: 'set_offset_ms', value }),
      onStartHotkeyCapture: setCapturingHotkey,
      onStartRecording,
      onStartRecordingAt,
      onStopPlayback,
      onStopRecording,
      onTimelineEventsChange,
      setCursorNs,
    },
  }
}
