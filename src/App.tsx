import { ControlPanel } from './ControlPanel'
import { NoteCanvas } from './NoteCanvas'
import { ReplayOverlay, setReplayOverlayVisible } from './ReplayOverlay'
import { WorkspaceStatusBars } from './WorkspaceStatusBars'
import { useMainAppController } from './useMainAppController'
import './App.css'
import './timeline.css'
import { useEffect } from 'react'

function App() {
  const isOverlay = new URLSearchParams(window.location.search).get('view') === 'overlay'
  return isOverlay ? <ReplayOverlay /> : <MainApp />
}

function MainApp() {
  const app = useMainAppController()

  useEffect(() => {
    void setReplayOverlayVisible(app.state.status.is_playing)
  }, [app.state.status.is_playing])

  return (
    <main className="app">
      <ControlPanel
        bpmError={app.bpmError}
        canPlay={Boolean(app.selectedSession)}
        capturingHotkey={app.capturingHotkey}
        cursorNs={app.cursorNs}
        exportText={app.state.exportText}
        importText={app.state.importText}
        isPlaying={app.state.status.is_playing}
        isRecording={app.state.status.is_recording}
        recordName={app.recordName}
        selectedSessionId={app.state.selectedSessionId}
        sessions={app.state.sessions}
        settings={app.state.settings}
        onApplyEditor={app.actions.onApplyEditor}
        onCaptureHotkey={app.actions.onCaptureHotkey}
        onDeleteSession={app.actions.onDeleteSession}
        onExportJson={app.actions.onExportJson}
        onImportJson={app.actions.onImportJson}
        onPlay={app.actions.onPlay}
        onRecordNameChange={app.actions.onRecordNameChange}
        onSelectSession={app.actions.onSelectSession}
        onSetBpm={app.actions.onSetBpm}
        onSetImportText={app.actions.onSetImportText}
        onSetOffsetMs={app.actions.onSetOffsetMs}
        onStartHotkeyCapture={app.actions.onStartHotkeyCapture}
        onStartRecording={app.actions.onStartRecording}
        onStartRecordingAt={app.actions.onStartRecordingAt}
        onStopPlayback={app.actions.onStopPlayback}
        onStopRecording={app.actions.onStopRecording}
      />

      <section className="workspace">
        <WorkspaceStatusBars
          activeKeys={app.activeKeys}
          cursorNs={app.cursorNs}
          state={app.state}
        />

        <NoteCanvas
          bpm={app.state.settings.bpm}
          cursorNs={app.cursorNs}
          events={app.timelineEvents}
          ghostEvents={app.ghostEvents}
          isPlaying={app.state.status.is_playing}
          laneOrder={app.state.timelineKeys}
          offsetMs={app.state.settings.offset_ms}
          onCursorChange={app.actions.setCursorNs}
          onEventsChange={app.actions.onTimelineEventsChange}
          onLaneOrderChange={app.actions.onLaneOrderChange}
          onPlay={app.actions.onPlay}
          onStopPlayback={app.actions.onStopPlayback}
        />

        {app.state.error ? <p className="error">{app.state.error}</p> : null}
      </section>
    </main>
  )
}

export default App
