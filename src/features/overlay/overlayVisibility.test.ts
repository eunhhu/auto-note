import { describe, expect, it } from 'vitest'

import { shouldShowOverlay } from '@/features/overlay/overlayVisibility'
import type { RuntimeStatus } from '@/lib/types'

function status(
  overrides: Partial<RuntimeStatus> = {},
): RuntimeStatus {
  return {
    hotkey: 'F10',
    is_playing: false,
    is_playback_paused: false,
    is_recording: false,
    is_recording_paused: false,
    keys: {},
    live_events: [],
    pause_toggle_request_id: null,
    playback_cursor_ns: null,
    play_hotkey: 'F9',
    play_toggle_request_id: null,
    punch_in_hotkey: 'F7',
    punch_in_request_id: null,
    record_toggle_request_id: null,
    stop_hotkey: 'F8',
    ...overrides,
  }
}

describe('overlay visibility', () => {
  it('shows the overlay while recording or replaying', () => {
    expect(shouldShowOverlay(status())).toBe(false)
    expect(shouldShowOverlay(status({ is_recording: true }))).toBe(true)
    expect(shouldShowOverlay(status({ is_playing: true }))).toBe(true)
  })
})
