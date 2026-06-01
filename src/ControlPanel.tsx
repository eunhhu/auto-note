import { useEffect } from 'react'

import { keyboardEventToKeyName } from './hotkeys'
import { nsToMs } from './timeline'
import type { Session } from './types'

type Settings = {
  readonly bpm: number
  readonly offset_ms: number
  readonly hotkey: string
}

type Props = {
  readonly bpmError: string | null
  readonly canPlay: boolean
  readonly capturingHotkey: boolean
  readonly cursorNs: number
  readonly exportText: string
  readonly importText: string
  readonly isRecording: boolean
  readonly recordName: string
  readonly selectedSessionId: string | null
  readonly sessions: readonly Session[]
  readonly settings: Settings
  readonly onApplyEditor: () => void
  readonly onCaptureHotkey: (value: string) => void
  readonly onExportJson: () => void
  readonly onImportJson: () => void
  readonly onPlay: () => void
  readonly onRecordNameChange: (value: string) => void
  readonly onSelectSession: (session: Session) => void
  readonly onSetBpm: (value: number) => void
  readonly onSetImportText: (value: string) => void
  readonly onSetOffsetMs: (value: number) => void
  readonly onStartHotkeyCapture: () => void
  readonly onStartRecording: () => void
  readonly onStartRecordingAt: () => void
  readonly onStopPlayback: () => void
  readonly onStopRecording: () => void
}

export function ControlPanel(props: Props) {
  useEffect(() => {
    if (!props.capturingHotkey) {
      return
    }
    function handleKeyDown(event: KeyboardEvent): void {
      event.preventDefault()
      props.onCaptureHotkey(keyboardEventToKeyName(event))
    }
    window.addEventListener('keydown', handleKeyDown, { once: true })
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [props])

  const recordLabel = props.isRecording ? 'Stop Recording' : 'Record'
  const recordAction = props.isRecording ? props.onStopRecording : props.onStartRecording

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
            {recordLabel}
          </button>
          <button type="button" onClick={props.onStartRecordingAt}>
            Punch In
          </button>
        </div>
        <p data-testid="record-cursor">Cursor: {nsToMs(props.cursorNs)} ms</p>
        <div className="button-row">
          <button type="button" onClick={props.onPlay} disabled={!props.canPlay}>
            Play
          </button>
          <button type="button" onClick={props.onStopPlayback}>
            Stop
          </button>
        </div>
      </div>

      <div className="section">
        <h2>Sessions</h2>
        <div className="sessions">
          {props.sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              className={
                session.id === props.selectedSessionId ? 'session active' : 'session'
              }
              onClick={() => props.onSelectSession(session)}
            >
              {session.name}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <label>
          Hotkey
          <button
            type="button"
            className={props.capturingHotkey ? 'capture active' : 'capture'}
            onClick={props.onStartHotkeyCapture}
          >
            {props.capturingHotkey ? 'Press any key' : props.settings.hotkey}
          </button>
        </label>
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
