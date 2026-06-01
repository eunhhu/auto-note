import { useEffect, useMemo, useReducer, useState } from 'react'

import { ControlPanel } from './ControlPanel'
import { NoteCanvas } from './NoteCanvas'
import { ReplayOverlay, setReplayOverlayVisible } from './ReplayOverlay'
import { parseSessionJson } from './sessionSchema'
import { appReducer, createInitialState, persistSettings } from './store'
import { deriveKeys, nsToMs } from './timeline'
import { createTauriClient } from './tauriClient'
import type { Session } from './types'
import './App.css'
import './timeline.css'

function App() {
  const isOverlay = new URLSearchParams(window.location.search).get('view') === 'overlay'
  return isOverlay ? <ReplayOverlay /> : <MainApp />
}

function MainApp() {
  const client = useMemo(() => createTauriClient(), [])
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState)
  const [recordName, setRecordName] = useState('New Session')
  const [cursorNs, setCursorNs] = useState(0)
  const [capturingHotkey, setCapturingHotkey] = useState(false)

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
  const activeKeys = Object.entries(state.status.keys).filter(([, down]) => down)

  useEffect(() => {
    persistSettings(state.settings)
  }, [state.settings])

  useEffect(() => {
    void refreshAll()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshStatus()
    }, 75)
    return () => window.clearInterval(timer)
  }, [client])

  useEffect(() => {
    void setReplayOverlayVisible(state.status.is_playing)
  }, [state.status.is_playing])

  async function refreshStatus(): Promise<void> {
    try {
      dispatch({ type: 'set_status', status: await client.getStatus() })
      dispatch({ type: 'set_error', error: null })
    } catch (error) {
      dispatch({ type: 'set_error', error: String(error) })
    }
  }

  async function refreshAll(): Promise<void> {
    try {
      const [status, ids, platform] = await Promise.all([
        client.getStatus(),
        client.listSessions(),
        client.platformStatus(),
      ])
      const loaded = await Promise.all(ids.map((id) => client.loadSession(id)))
      dispatch({ type: 'set_status', status })
      dispatch({ type: 'set_platform', platform })
      dispatch({ type: 'set_sessions', sessions: loaded })
      if (!state.selectedSessionId && loaded.length > 0) {
        selectLoadedSession(loaded[0])
      }
      dispatch({ type: 'set_error', error: null })
    } catch (error) {
      dispatch({ type: 'set_error', error: String(error) })
    }
  }

  async function onStartRecording(): Promise<void> {
    await client.startRecording()
    await refreshStatus()
  }

  async function onStartRecordingAt(): Promise<void> {
    await client.startRecordingAt(nsToMs(cursorNs))
    await refreshStatus()
  }

  async function onStopRecording(): Promise<void> {
    if (bpmError) {
      dispatch({ type: 'set_error', error: bpmError })
      return
    }
    const session = await client.stopRecording({
      name: recordName,
      bpm: state.settings.bpm,
      offset_ms: state.settings.offset_ms,
    })
    selectLoadedSession(session)
    await refreshAll()
  }

  async function onPlay(): Promise<void> {
    if (!selectedSession) {
      return
    }
    try {
      await client.playSession(selectedSession.id)
      dispatch({ type: 'set_report', report: await client.timingReport() })
      await refreshStatus()
    } catch (error) {
      dispatch({ type: 'set_error', error: String(error) })
    }
  }

  async function onStopPlayback(): Promise<void> {
    await client.stopPlayback()
    dispatch({ type: 'set_report', report: await client.timingReport() })
    await refreshStatus()
  }

  function selectLoadedSession(session: Session): void {
    dispatch({ type: 'select_session', sessionId: session.id })
    dispatch({ type: 'set_timeline_events', events: session.events })
    dispatch({ type: 'set_bpm', value: session.bpm })
    dispatch({ type: 'set_offset_ms', value: session.offset_ms })
  }

  async function onApplyEditor(): Promise<void> {
    if (!selectedSession || bpmError) {
      return
    }
    const nextSession: Session = {
      ...selectedSession,
      bpm: state.settings.bpm,
      offset_ms: state.settings.offset_ms,
      updated_at: new Date().toISOString(),
      keys: [...deriveKeys(state.timelineEvents)],
      events: state.timelineEvents,
    }
    await client.updateSession(nextSession)
    await refreshAll()
  }

  async function onCaptureHotkey(value: string): Promise<void> {
    setCapturingHotkey(false)
    dispatch({ type: 'set_hotkey', value })
    await client.setHotkey(value)
    await refreshStatus()
  }

  async function onImportJson(): Promise<void> {
    try {
      parseSessionJson(state.importText)
      const session = await client.importSessionJson(state.importText)
      selectLoadedSession(session)
      await refreshAll()
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

  return (
    <main className="app">
      <ControlPanel
        bpmError={bpmError}
        canPlay={Boolean(selectedSession)}
        capturingHotkey={capturingHotkey}
        cursorNs={cursorNs}
        exportText={state.exportText}
        importText={state.importText}
        isRecording={state.status.is_recording}
        recordName={recordName}
        selectedSessionId={state.selectedSessionId}
        sessions={state.sessions}
        settings={state.settings}
        onApplyEditor={onApplyEditor}
        onCaptureHotkey={onCaptureHotkey}
        onExportJson={onExportJson}
        onImportJson={onImportJson}
        onPlay={onPlay}
        onRecordNameChange={setRecordName}
        onSelectSession={selectLoadedSession}
        onSetBpm={(value) => dispatch({ type: 'set_bpm', value })}
        onSetImportText={(text) => dispatch({ type: 'set_import', text })}
        onSetOffsetMs={(value) => dispatch({ type: 'set_offset_ms', value })}
        onStartHotkeyCapture={() => setCapturingHotkey(true)}
        onStartRecording={onStartRecording}
        onStartRecordingAt={onStartRecordingAt}
        onStopPlayback={onStopPlayback}
        onStopRecording={onStopRecording}
      />

      <section className="workspace">
        <div className="statusbar">
          <span>Recording: {state.status.is_recording ? 'ON' : 'OFF'}</span>
          <span>Playing: {state.status.is_playing ? 'ON' : 'OFF'}</span>
          <span>Hotkey: {state.status.hotkey}</span>
          {activeKeys.length > 0 ? (
            activeKeys.map(([key]) => (
              <span key={key} className="key on">
                {key}
              </span>
            ))
          ) : (
            <span className="key muted">no keys down</span>
          )}
        </div>

        <div className="summary-strip">
          <span>{state.platform?.os ?? 'loading'}</span>
          <span>{state.platform?.notes.at(0) ?? 'desktop runtime'}</span>
          <span>
            max_drift_ns: {state.report?.max_drift_ns ?? '-'} / emitted_events:{' '}
            {state.report?.emitted_events ?? '-'}
          </span>
          <span>cursor: {nsToMs(cursorNs)} ms</span>
        </div>

        <NoteCanvas
          bpm={state.settings.bpm}
          cursorNs={cursorNs}
          events={state.timelineEvents}
          ghostEvents={ghostEvents}
          offsetMs={state.settings.offset_ms}
          onCursorChange={setCursorNs}
          onEventsChange={(events) => dispatch({ type: 'set_timeline_events', events })}
        />

        {state.error ? <p className="error">{state.error}</p> : null}
      </section>
    </main>
  )
}

export default App
