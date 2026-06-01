import type { PlatformStatus, PlaybackReport, RuntimeStatus, SessionEvent, Session } from './types'

type Settings = {
  bpm: number
  offset_ms: number
  hotkey: string
}

export type AppState = {
  status: RuntimeStatus
  platform: PlatformStatus | null
  sessions: Session[]
  selectedSessionId: string | null
  settings: Settings
  timelineEvents: readonly SessionEvent[]
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
  | { type: 'set_timeline_events'; events: readonly SessionEvent[] }
  | { type: 'set_import'; text: string }
  | { type: 'set_export'; text: string }
  | { type: 'set_error'; error: string | null }
  | { type: 'set_report'; report: PlaybackReport | null }

const SETTINGS_KEY = 'auto-note:settings:v1'

const defaultSettings: Settings = {
  bpm: 180,
  offset_ms: 0,
  hotkey: 'F10',
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
      hotkey:
        typeof parsed.hotkey === 'string' && parsed.hotkey.length > 0
          ? parsed.hotkey
          : defaultSettings.hotkey,
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
      is_playing: false,
      hotkey: defaultSettings.hotkey,
      keys: {},
    },
    platform: null,
    sessions: [],
    selectedSessionId: null,
    settings: loadSettings(),
    timelineEvents: [],
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
      }
    case 'set_offset_ms':
      return {
        ...state,
        settings: {
          ...state.settings,
          offset_ms: action.value,
        },
      }
    case 'set_hotkey':
      return {
        ...state,
        settings: {
          ...state.settings,
          hotkey: action.value,
        },
      }
    case 'set_timeline_events':
      return { ...state, timelineEvents: action.events }
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
