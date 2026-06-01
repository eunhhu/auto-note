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
  is_playing: boolean
  hotkey: string
  play_hotkey: string
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
