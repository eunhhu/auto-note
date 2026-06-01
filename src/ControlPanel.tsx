import { useEffect } from 'react'
import { Circle, Play, Square, Trash2 } from 'lucide-react'

import { hotkeyTargetLabel, type HotkeyTarget } from './hotkeyTargets'
import { keyboardEventToKeyName } from './hotkeys'
import type { Settings } from './store'
import { nsToMs } from './timeline'
import type { Session } from './types'

type Props = {
  readonly bpmError: string | null
  readonly canPlay: boolean
  readonly capturingHotkey: HotkeyTarget | null
  readonly cursorNs: number
  readonly exportText: string
  readonly importText: string
  readonly isPlaying: boolean
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
  readonly onPlay: () => void
  readonly onRecordNameChange: (value: string) => void
  readonly onSelectSession: (session: Session) => void
  readonly onSetBpm: (value: number) => void
  readonly onSetImportText: (value: string) => void
  readonly onSetOffsetMs: (value: number) => void
  readonly onStartHotkeyCapture: (target: HotkeyTarget) => void
  readonly onStartRecording: () => void
  readonly onStartRecordingAt: () => void
  readonly onStopPlayback: () => void
  readonly onStopRecording: () => void
}

export function ControlPanel(props: Props) {
  useEffect(() => {
    const target = props.capturingHotkey
    if (target === null) {
      return
    }
    const capturedTarget: HotkeyTarget = target
    function handleKeyDown(event: KeyboardEvent): void {
      event.preventDefault()
      props.onCaptureHotkey(capturedTarget, keyboardEventToKeyName(event))
    }
    window.addEventListener('keydown', handleKeyDown, { once: true })
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [props.capturingHotkey, props.onCaptureHotkey])

  const recordLabel = props.isRecording ? 'Stop Recording' : 'Record'
  const recordAction = props.isRecording ? props.onStopRecording : props.onStartRecording
  const playLabel = props.isPlaying ? 'Playing' : 'Play'

  return (
    <aside className="panel">
      <h1>Auto Note</h1>
      <div className="section">
        <label>
          Session
          <input
            value={props.recordName}
            onChange={(event) => props.onRecordNameChange(event.target.value)}
          />
        </label>
        <div className="button-row">
          <button type="button" className="primary" onClick={recordAction}>
            {props.isRecording ? <Square size={14} /> : <Circle size={14} />}
            {recordLabel}
          </button>
          <button type="button" onClick={props.onStartRecordingAt}>
            Punch In
          </button>
        </div>
        <p data-testid="record-cursor">Cursor: {nsToMs(props.cursorNs)} ms</p>
        <div className="button-row">
          <button type="button" onClick={props.onPlay} disabled={!props.canPlay}>
            <Play size={14} />
            {playLabel}
          </button>
          <button type="button" onClick={props.onStopPlayback}>
            <Square size={14} />
            Stop
          </button>
        </div>
      </div>

      <div className="section">
        <h2>Sessions</h2>
        <div className="sessions">
          {props.sessions.map((session) => (
            <div key={session.id} className="session-row">
              <button
                type="button"
                className={
                  session.id === props.selectedSessionId ? 'session active' : 'session'
                }
                onClick={() => props.onSelectSession(session)}
              >
                {session.name}
              </button>
              <button
                type="button"
                aria-label={`Delete ${session.name}`}
                className="session-delete"
                onClick={() => props.onDeleteSession(session.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <HotkeyField
          capturingHotkey={props.capturingHotkey}
          target="record"
          value={props.settings.hotkey}
          onStartHotkeyCapture={props.onStartHotkeyCapture}
        />
        <HotkeyField
          capturingHotkey={props.capturingHotkey}
          target="play"
          value={props.settings.play_hotkey}
          onStartHotkeyCapture={props.onStartHotkeyCapture}
        />
        <HotkeyField
          capturingHotkey={props.capturingHotkey}
          target="stop"
          value={props.settings.stop_hotkey}
          onStartHotkeyCapture={props.onStartHotkeyCapture}
        />
        <label>
          BPM
          <input
            type="number"
            value={props.settings.bpm}
            onChange={(event) => props.onSetBpm(Number(event.target.value))}
          />
        </label>
        <label>
          Grid Offset (ms)
          <input
            type="number"
            value={props.settings.offset_ms}
            onChange={(event) => props.onSetOffsetMs(Math.round(Number(event.target.value)))}
          />
        </label>
        {props.bpmError ? <p className="error">{props.bpmError}</p> : null}
        <button
          type="button"
          disabled={!props.canPlay || Boolean(props.bpmError)}
          onClick={props.onApplyEditor}
        >
          Apply Timeline
        </button>
      </div>

      <div className="section">
        <h2>Import / Export</h2>
        <textarea
          rows={4}
          value={props.importText}
          onChange={(event) => props.onSetImportText(event.target.value)}
        />
        <button type="button" onClick={props.onImportJson}>
          Import JSON
        </button>
        <button type="button" disabled={!props.canPlay} onClick={props.onExportJson}>
          Export Selected
        </button>
        <textarea readOnly rows={4} value={props.exportText} />
      </div>
    </aside>
  )
}

type HotkeyFieldProps = {
  readonly capturingHotkey: HotkeyTarget | null
  readonly target: HotkeyTarget
  readonly value: string
  readonly onStartHotkeyCapture: (target: HotkeyTarget) => void
}

function HotkeyField(props: HotkeyFieldProps) {
  const isCapturing = props.capturingHotkey === props.target
  return (
    <label>
      {hotkeyTargetLabel(props.target)} Hotkey
      <button
        type="button"
        className={isCapturing ? 'capture active' : 'capture'}
        onClick={() => props.onStartHotkeyCapture(props.target)}
      >
        {isCapturing ? 'Press any key' : props.value}
      </button>
    </label>
  )
}
