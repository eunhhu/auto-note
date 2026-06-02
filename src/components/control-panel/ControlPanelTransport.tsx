import { Circle, Pause, Play, Square } from 'lucide-react'

import { nsToMs } from '@/lib/timeline'

type Props = {
  readonly canPlay: boolean
  readonly cursorNs: number
  readonly isPlaybackPaused: boolean
  readonly isPlaying: boolean
  readonly isRecording: boolean
  readonly recordName: string
  readonly onPausePlayback: () => void
  readonly onPlay: () => void
  readonly onRecordNameChange: (value: string) => void
  readonly onResumePlayback: () => void
  readonly onStartRecording: () => void
  readonly onStartRecordingAt: () => void
  readonly onStopPlayback: () => void
  readonly onStopRecording: () => void
}

export function ControlPanelTransport(props: Props) {
  const recordLabel = props.isRecording ? 'Stop Recording' : 'Record'
  const recordAction = props.isRecording ? props.onStopRecording : props.onStartRecording
  const punchLabel = props.isRecording ? 'Stop Punch' : 'Punch In'
  const punchAction = props.isRecording ? props.onStopRecording : props.onStartRecordingAt
  const playLabel = props.isPlaying ? 'Stop Replay' : 'Play'
  const playAction = props.isPlaying ? props.onStopPlayback : props.onPlay
  const pauseLabel = props.isPlaybackPaused ? 'Resume' : 'Pause'
  const pauseAction = props.isPlaybackPaused ? props.onResumePlayback : props.onPausePlayback

  return (
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
        <button type="button" onClick={punchAction}>
          {punchLabel}
        </button>
      </div>
      <p data-testid="record-cursor">Cursor: {nsToMs(props.cursorNs)} ms</p>
      <div className="button-row">
        <button type="button" onClick={playAction} disabled={!props.canPlay}>
          {props.isPlaying ? <Square size={14} /> : <Play size={14} />}
          {playLabel}
        </button>
        <button type="button" disabled={!props.isPlaying} onClick={pauseAction}>
          {props.isPlaybackPaused ? <Play size={14} /> : <Pause size={14} />}
          {pauseLabel}
        </button>
      </div>
    </div>
  )
}
