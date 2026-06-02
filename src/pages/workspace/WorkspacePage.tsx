import { useEffect } from 'react'

import { ControlPanel } from '@/components/control-panel/ControlPanel'
import { WorkspaceStatusBars } from '@/components/status/WorkspaceStatusBars'
import { setReplayOverlayVisible } from '@/features/overlay/ReplayOverlay'
import { shouldShowOverlay } from '@/features/overlay/overlayVisibility'
import { NoteCanvas } from '@/features/timeline-editor/NoteCanvas'
import {
  useWorkspaceControllerContext,
  WorkspaceControllerProvider,
} from '@/pages/workspace/context/WorkspaceControllerContext'

export function WorkspacePage() {
  return (
    <WorkspaceControllerProvider>
      <WorkspaceContent />
    </WorkspaceControllerProvider>
  )
}

function WorkspaceContent() {
  const app = useWorkspaceControllerContext()
  const overlayVisible = shouldShowOverlay(app.state.status)

  useEffect(() => {
    void setReplayOverlayVisible(overlayVisible)
  }, [overlayVisible])

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
        isPlaybackPaused={app.state.status.is_playback_paused}
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
        onPausePlayback={app.actions.onPausePlayback}
        onPlay={app.actions.onPlay}
        onRecordNameChange={app.actions.onRecordNameChange}
        onResumePlayback={app.actions.onResumePlayback}
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
          ghostEventCount={app.ghostEvents.length}
          ghostEvents={app.showGhostNotes ? app.ghostEvents : []}
          isPlaybackPaused={app.state.status.is_playback_paused}
          isPlaying={app.state.status.is_playing}
          laneOrder={app.state.timelineKeys}
          offsetMs={app.state.settings.offset_ms}
          showGhostNotes={app.showGhostNotes}
          onCursorChange={app.actions.setCursorNs}
          onDeleteLane={app.actions.onDeleteLane}
          onEventsChange={app.actions.onTimelineEventsChange}
          onLaneOrderChange={app.actions.onLaneOrderChange}
          onPausePlayback={app.actions.onPausePlayback}
          onPlay={app.actions.onPlay}
          onResumePlayback={app.actions.onResumePlayback}
          onStopPlayback={app.actions.onStopPlayback}
          onToggleGhostNotes={app.actions.onToggleGhostNotes}
        />

        {app.state.error ? <p className="error">{app.state.error}</p> : null}
      </section>
    </main>
  )
}
