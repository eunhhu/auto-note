import { nsToMs } from './timeline'
import type { AppState } from './store'

type Props = {
  readonly activeKeys: readonly [string, boolean][]
  readonly cursorNs: number
  readonly state: AppState
}

export function WorkspaceStatusBars(props: Props) {
  return (
    <>
      <div className="statusbar">
        <span>Recording: {props.state.status.is_recording ? 'ON' : 'OFF'}</span>
        <span>Playing: {props.state.status.is_playing ? 'ON' : 'OFF'}</span>
        <span>Record: {props.state.status.hotkey}</span>
        <span>Replay: {props.state.status.play_hotkey}</span>
        <span>Stop: {props.state.status.stop_hotkey}</span>
        {props.activeKeys.length > 0 ? (
          props.activeKeys.map(([key]) => (
            <span key={key} className="key on">
              {key}
            </span>
          ))
        ) : (
          <span className="key muted">no keys down</span>
        )}
      </div>

      <div className="summary-strip">
        <span>{props.state.platform?.os ?? 'loading'}</span>
        <span>{props.state.platform?.notes.at(0) ?? 'desktop runtime'}</span>
        <span>
          max_drift_ns: {props.state.report?.max_drift_ns ?? '-'} / emitted_events:{' '}
          {props.state.report?.emitted_events ?? '-'}
        </span>
        <span>cursor: {nsToMs(props.cursorNs)} ms</span>
      </div>
    </>
  )
}
