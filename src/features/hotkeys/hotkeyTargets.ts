export type HotkeyTarget = 'record' | 'punch_in' | 'play' | 'pause'

export function hotkeyTargetLabel(target: HotkeyTarget): string {
  switch (target) {
    case 'record':
      return 'Record'
    case 'punch_in':
      return 'Punch In'
    case 'play':
      return 'Replay'
    case 'pause':
      return 'Pause / Resume'
  }
}
