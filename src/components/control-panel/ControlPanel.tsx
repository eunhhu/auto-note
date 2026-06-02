import { ControlPanelTransport } from '@/components/control-panel/ControlPanelTransport'
import { HotkeySettingsPanel } from '@/components/control-panel/HotkeySettingsPanel'
import { ImportExportPanel } from '@/components/control-panel/ImportExportPanel'
import { SessionList } from '@/components/control-panel/SessionList'
import type { HotkeyTarget } from '@/features/hotkeys/hotkeyTargets'
import type { Settings } from '@/store/appStore'
import type { Session } from '@/lib/types'
import { useHotkeyCapture } from '@/features/hotkeys/useHotkeyCapture'

type Props = {
  readonly bpmError: string | null
  readonly canPlay: boolean
  readonly capturingHotkey: HotkeyTarget | null
  readonly cursorNs: number
  readonly exportText: string
  readonly importText: string
  readonly isPlaying: boolean
  readonly isPlaybackPaused: boolean
  readonly isRecording: boolean
  readonly recordName: string
  readonly selectedSessionId: string | null
  readonly sessions: readonly Session[]
  readonly settings: Settings
  readonly onApplyEditor: () => void
  readonly onCaptureHotkey: (target: HotkeyTarget, value: string) => void
  readonly onDeleteSession: (sessionId: string) => void
  readonly onExportJson: () => void
  readonly onImportJson: () => void
  readonly onPausePlayback: () => void
  readonly onPlay: () => void
  readonly onRecordNameChange: (value: string) => void
  readonly onSelectSession: (session: Session) => void
  readonly onSetBpm: (value: number) => void
  readonly onSetImportText: (value: string) => void
  readonly onSetOffsetMs: (value: number) => void
  readonly onStartHotkeyCapture: (target: HotkeyTarget) => void
  readonly onStartRecording: () => void
  readonly onStartRecordingAt: () => void
  readonly onResumePlayback: () => void
  readonly onStopPlayback: () => void
  readonly onStopRecording: () => void
}

export function ControlPanel(props: Props) {
  useHotkeyCapture(props.capturingHotkey, props.onCaptureHotkey)

  return (
    <aside className="panel">
      <h1>Auto Note</h1>
      <ControlPanelTransport
        canPlay={props.canPlay}
        cursorNs={props.cursorNs}
        isPlaybackPaused={props.isPlaybackPaused}
        isPlaying={props.isPlaying}
        isRecording={props.isRecording}
        recordName={props.recordName}
        onPausePlayback={props.onPausePlayback}
        onPlay={props.onPlay}
        onRecordNameChange={props.onRecordNameChange}
        onResumePlayback={props.onResumePlayback}
        onStartRecording={props.onStartRecording}
        onStartRecordingAt={props.onStartRecordingAt}
        onStopPlayback={props.onStopPlayback}
        onStopRecording={props.onStopRecording}
      />
      <SessionList
        selectedSessionId={props.selectedSessionId}
        sessions={props.sessions}
        onDeleteSession={props.onDeleteSession}
        onSelectSession={props.onSelectSession}
      />
      <HotkeySettingsPanel
        bpmError={props.bpmError}
        canPlay={props.canPlay}
        capturingHotkey={props.capturingHotkey}
        settings={props.settings}
        onApplyEditor={props.onApplyEditor}
        onSetBpm={props.onSetBpm}
        onSetOffsetMs={props.onSetOffsetMs}
        onStartHotkeyCapture={props.onStartHotkeyCapture}
      />
      <ImportExportPanel
        canPlay={props.canPlay}
        exportText={props.exportText}
        importText={props.importText}
        onExportJson={props.onExportJson}
        onImportJson={props.onImportJson}
        onSetImportText={props.onSetImportText}
      />
    </aside>
  )
}
