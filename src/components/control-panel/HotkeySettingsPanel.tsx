import { HotkeyField } from '@/components/control-panel/HotkeyField'
import { timelineSaveStatusText } from '@/components/status/timelineSaveStatusText'
import type { HotkeyTarget } from '@/features/hotkeys/hotkeyTargets'
import type { Settings, TimelineSaveStatus } from '@/store/appStore'

type Props = {
  readonly bpmError: string | null
  readonly canPlay: boolean
  readonly capturingHotkey: HotkeyTarget | null
  readonly settings: Settings
  readonly timelineSaveStatus: TimelineSaveStatus
  readonly onApplyEditor: () => void
  readonly onSetBpm: (value: number) => void
  readonly onSetOffsetMs: (value: number) => void
  readonly onStartHotkeyCapture: (target: HotkeyTarget) => void
}

export function HotkeySettingsPanel(props: Props) {
  const saveDisabled =
    !props.canPlay || Boolean(props.bpmError) || props.timelineSaveStatus.kind === 'saving'
  const saveLabel = props.timelineSaveStatus.kind === 'saving' ? 'Saving...' : 'Save Timeline'

  return (
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
        target="punch_in"
        value={props.settings.punch_in_hotkey}
        onStartHotkeyCapture={props.onStartHotkeyCapture}
      />
      <HotkeyField
        capturingHotkey={props.capturingHotkey}
        target="pause"
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
      <p
        className={`timeline-save-state ${props.timelineSaveStatus.kind}`}
        data-testid="timeline-save-status"
      >
        Timeline: {timelineSaveStatusText(props.timelineSaveStatus)}
      </p>
      <button
        type="button"
        disabled={saveDisabled}
        onClick={props.onApplyEditor}
      >
        {saveLabel}
      </button>
    </div>
  )
}
