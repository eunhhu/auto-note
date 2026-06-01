export type HotkeyTarget = 'record' | 'play' | 'stop'

export function hotkeyTargetLabel(target: HotkeyTarget): string {
  switch (target) {
    case 'record':
      return 'Record'
    case 'play':
      return 'Replay'
    case 'stop':
      return 'Stop'
  }
}
