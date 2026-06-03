import { deriveKeys, mergeLaneOrder } from '@/lib/timeline'
import type { KeyName, PlatformStatus, PlaybackReport, RuntimeStatus, SessionEvent, Session } from '@/lib/types'

export type Settings = {
  readonly bpm: number
  readonly offset_ms: number
  readonly hotkey: string
  readonly play_hotkey: string
  readonly punch_in_hotkey: string
  readonly stop_hotkey: string
}

export type TimelineSaveStatus =
  | { readonly kind: 'saved' }
  | { readonly kind: 'dirty' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'error'; readonly message: string }

export type AppState = {
  status: RuntimeStatus
  platform: PlatformStatus | null
  sessions: Session[]
  selectedSessionId: string | null
  settings: Settings
  timelineSaveStatus: TimelineSaveStatus
  timelineEvents: readonly SessionEvent[]
  timelineKeys: readonly KeyName[]
  importText: string
  exportText: string
  error: string | null
  report: PlaybackReport | null
}

export type Action =
  | { type: 'set_status'; status: RuntimeStatus }
  | { type: 'set_platform'; platform: PlatformStatus }
  | { type: 'set_sessions'; sessions: Session[] }
  | { type: 'select_session'; sessionId: string | null }
  | { type: 'set_bpm'; value: number }
  | { type: 'set_offset_ms'; value: number }
  | { type: 'set_hotkey'; value: string }
  | { type: 'set_play_hotkey'; value: string }
  | { type: 'set_punch_in_hotkey'; value: string }
  | { type: 'set_stop_hotkey'; value: string }
  | { type: 'set_timeline_events'; events: readonly SessionEvent[] }
  | { type: 'set_timeline_keys'; keys: readonly KeyName[] }
  | { type: 'edit_timeline_events'; events: readonly SessionEvent[] }
  | { type: 'edit_timeline_keys'; keys: readonly KeyName[] }
  | { type: 'set_timeline_save_status'; status: TimelineSaveStatus }
  | { type: 'set_import'; text: string }
  | { type: 'set_export'; text: string }
  | { type: 'set_error'; error: string | null }
  | { type: 'set_report'; report: PlaybackReport | null }

const SETTINGS_KEY = 'auto-note:settings:v1'
const DIRTY_TIMELINE_STATUS: TimelineSaveStatus = { kind: 'dirty' }
const SAVED_TIMELINE_STATUS: TimelineSaveStatus = { kind: 'saved' }

const defaultSettings: Settings = {
  bpm: 180,
  offset_ms: 0,
  hotkey: 'F10',
  play_hotkey: 'F9',
  punch_in_hotkey: 'F7',
  stop_hotkey: 'F8',
}

export function loadSettings(): Settings {
  if (typeof localStorage === 'undefined') {
    return defaultSettings
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) {
      return defaultSettings
    }
    const parsed: unknown = JSON.parse(raw)
    if (!isSettingsCandidate(parsed)) {
      return defaultSettings
    }
    return {
      bpm: Number(parsed.bpm) > 0 ? Number(parsed.bpm) : defaultSettings.bpm,
      offset_ms: Number.isInteger(parsed.offset_ms)
        ? Number(parsed.offset_ms)
        : defaultSettings.offset_ms,
      hotkey: parseHotkey(parsed.hotkey, defaultSettings.hotkey),
      play_hotkey: parseHotkey(parsed.play_hotkey, defaultSettings.play_hotkey),
      punch_in_hotkey: parseHotkey(
        parsed.punch_in_hotkey,
        defaultSettings.punch_in_hotkey,
      ),
      stop_hotkey: parseHotkey(parsed.stop_hotkey, defaultSettings.stop_hotkey),
    }
  } catch {
    return defaultSettings
  }
}

function isSettingsCandidate(value: unknown): value is Partial<Settings> {
  return value !== null && typeof value === 'object'
}

export function persistSettings(settings: Settings): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function createInitialState(): AppState {
  return {
    status: {
      is_recording: false,
      is_recording_paused: false,
      is_playing: false,
      is_playback_paused: false,
      hotkey: defaultSettings.hotkey,
      play_hotkey: defaultSettings.play_hotkey,
      punch_in_hotkey: defaultSettings.punch_in_hotkey,
      play_toggle_request_id: null,
      pause_toggle_request_id: null,
      record_toggle_request_id: null,
      punch_in_request_id: null,
      stop_hotkey: defaultSettings.stop_hotkey,
      playback_cursor_ns: null,
      live_events: [],
      keys: {},
    },
    platform: null,
    sessions: [],
    selectedSessionId: null,
    settings: loadSettings(),
    timelineSaveStatus: SAVED_TIMELINE_STATUS,
    timelineEvents: [],
    timelineKeys: [],
    importText: '',
    exportText: '',
    error: null,
    report: null,
  }
}

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'set_status':
      return { ...state, status: action.status }
    case 'set_platform':
      return { ...state, platform: action.platform }
    case 'set_sessions':
      return { ...state, sessions: action.sessions }
    case 'select_session':
      return { ...state, selectedSessionId: action.sessionId }
    case 'set_bpm':
      return {
        ...state,
        settings: {
          ...state.settings,
          bpm: action.value,
        },
        timelineSaveStatus: dirtyTimelineStatus(state),
      }
    case 'set_offset_ms':
      return {
        ...state,
        settings: {
          ...state.settings,
          offset_ms: action.value,
        },
        timelineSaveStatus: dirtyTimelineStatus(state),
      }
    case 'set_hotkey':
      return {
        ...state,
        settings: {
          ...state.settings,
          hotkey: action.value,
        },
      }
    case 'set_play_hotkey':
      return {
        ...state,
        settings: {
          ...state.settings,
          play_hotkey: action.value,
        },
      }
    case 'set_punch_in_hotkey':
      return {
        ...state,
        settings: {
          ...state.settings,
          punch_in_hotkey: action.value,
        },
      }
    case 'set_stop_hotkey':
      return {
        ...state,
        settings: {
          ...state.settings,
          stop_hotkey: action.value,
        },
      }
    case 'set_timeline_events':
      return {
        ...state,
        timelineEvents: action.events,
        timelineKeys: mergeLaneOrder(state.timelineKeys, deriveKeys(action.events)),
      }
    case 'set_timeline_keys':
      return { ...state, timelineKeys: action.keys }
    case 'edit_timeline_events':
      return {
        ...state,
        timelineEvents: action.events,
        timelineKeys: mergeLaneOrder(state.timelineKeys, deriveKeys(action.events)),
        timelineSaveStatus: dirtyTimelineStatus(state),
      }
    case 'edit_timeline_keys':
      return {
        ...state,
        timelineKeys: action.keys,
        timelineSaveStatus: dirtyTimelineStatus(state),
      }
    case 'set_timeline_save_status':
      return { ...state, timelineSaveStatus: action.status }
    case 'set_import':
      return { ...state, importText: action.text }
    case 'set_export':
      return { ...state, exportText: action.text }
    case 'set_error':
      return { ...state, error: action.error }
    case 'set_report':
      return { ...state, report: action.report }
    default:
      return state
  }
}

function dirtyTimelineStatus(state: AppState): TimelineSaveStatus {
  return state.selectedSessionId ? DIRTY_TIMELINE_STATUS : state.timelineSaveStatus
}

function parseHotkey(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}
