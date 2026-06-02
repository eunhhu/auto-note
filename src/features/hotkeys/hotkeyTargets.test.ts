import { describe, expect, it } from 'vitest'

import { hotkeyTargetLabel } from '@/features/hotkeys/hotkeyTargets'

describe('hotkey target labels', () => {
  it('labels the dedicated punch-in shortcut', () => {
    expect(hotkeyTargetLabel('punch_in')).toBe('Punch In')
  })

  it('labels the former stop shortcut as pause resume', () => {
    expect(hotkeyTargetLabel('pause')).toBe('Pause / Resume')
  })
})
