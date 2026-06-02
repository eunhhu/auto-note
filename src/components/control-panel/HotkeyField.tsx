import { hotkeyTargetLabel, type HotkeyTarget } from '@/features/hotkeys/hotkeyTargets'

type Props = {
  readonly capturingHotkey: HotkeyTarget | null
  readonly target: HotkeyTarget
  readonly value: string
  readonly onStartHotkeyCapture: (target: HotkeyTarget) => void
}

export function HotkeyField(props: Props) {
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
