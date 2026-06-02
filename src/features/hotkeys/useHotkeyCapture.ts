import { useEffect } from 'react'

import type { HotkeyTarget } from '@/features/hotkeys/hotkeyTargets'
import { keyboardEventToKeyName } from '@/features/hotkeys/hotkeys'

export function useHotkeyCapture(
  capturingHotkey: HotkeyTarget | null,
  onCaptureHotkey: (target: HotkeyTarget, value: string) => void,
): void {
  useEffect(() => {
    if (capturingHotkey === null) {
      return
    }
    const capturedTarget = capturingHotkey
    function handleKeyDown(event: KeyboardEvent): void {
      event.preventDefault()
      onCaptureHotkey(capturedTarget, keyboardEventToKeyName(event))
    }
    window.addEventListener('keydown', handleKeyDown, { once: true })
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [capturingHotkey, onCaptureHotkey])
}
