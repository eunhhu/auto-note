export type KeyAction = 'press' | 'release'

export type KeyName = string

export type SessionEvent = {
  t_ns: number
  key: KeyName
  action: KeyAction
}

export type Session = {
  schema_version: 2
  id: string
  name: string
  created_at: string
  updated_at: string
  keys: readonly KeyName[]
  bpm: number
  offset_ms: number
  events: readonly SessionEvent[]
}

export type RuntimeStatus = {
  is_recording: boolean
  is_recording_paused: boolean
  is_playing: boolean
  is_playback_paused: boolean
  hotkey: string
  play_hotkey: string
  punch_in_hotkey: string
  play_toggle_request_id: number | null
  pause_toggle_request_id: number | null
  record_toggle_request_id: number | null
  punch_in_request_id: number | null
  stop_hotkey: string
  playback_cursor_ns: number | null
  live_events: readonly SessionEvent[]
  keys: Record<KeyName, boolean>
}

export type PlaybackReport = {
  max_drift_ns: number
  emitted_events: number
  cancelled: boolean
}

export type PlatformStatus = {
  os: string
  can_record_globally: boolean
  can_play_globally: boolean
  notes: string[]
}
