import { invoke } from '@tauri-apps/api/core'

import { parseSessionJson } from './sessionSchema'
import { deriveKeys } from './timeline'
import type { PlatformStatus, PlaybackReport, RuntimeStatus, Session } from './types'

type StopRecordingPayload = { name: string; bpm: number; offset_ms: number }

type TauriApi = {
  startRecording: () => Promise<void>
  startRecordingAt: (offsetMs: number) => Promise<void>
  stopRecording: (payload: StopRecordingPayload) => Promise<Session>
  playSession: (sessionId: string) => Promise<void>
  stopPlayback: () => Promise<void>
  getStatus: () => Promise<RuntimeStatus>
  setHotkey: (hotkey: string) => Promise<void>
  updateSession: (session: Session) => Promise<void>
  listSessions: () => Promise<string[]>
  loadSession: (sessionId: string) => Promise<Session>
  saveSession: (session: Session) => Promise<void>
  importSessionJson: (payload: string) => Promise<Session>
  exportSessionJson: (sessionId: string) => Promise<string>
  timingReport: () => Promise<PlaybackReport | null>
  platformStatus: () => Promise<PlatformStatus>
}

function defaultStatus(): RuntimeStatus {
  return {
    is_recording: false,
    is_playing: false,
    hotkey: 'F10',
    keys: {},
  }
}

function makeMockClient(): TauriApi {
  const sessions = new Map<string, Session>()
  let status = defaultStatus()
  let report: PlaybackReport | null = null
  const platform: PlatformStatus = {
    os: 'browser',
    can_record_globally: false,
    can_play_globally: false,
    notes: ['Mock backend mode'],
  }

  return {
    async startRecording() {
      status = { ...status, is_recording: true }
    },
    async startRecordingAt() {
      status = { ...status, is_recording: true }
    },
    async stopRecording(payload) {
      status = { ...status, is_recording: false }
      const session: Session = {
        schema_version: 2,
        id: crypto.randomUUID(),
        name: payload.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        keys: [],
        bpm: payload.bpm,
        offset_ms: payload.offset_ms,
        events: [],
      }
      sessions.set(session.id, session)
      return session
    },
    async playSession(sessionId) {
      const session = sessions.get(sessionId)
      if (!session) {
        throw new Error(`session ${sessionId} not found`)
      }
      if (session.events.length === 0) {
        throw new Error('No recorded events to play')
      }
      status = { ...status, is_playing: true }
      report = { max_drift_ns: 0, emitted_events: 0, cancelled: false }
      status = { ...status, is_playing: false }
    },
    async stopPlayback() {
      status = { ...status, is_playing: false }
      report = { max_drift_ns: 0, emitted_events: 0, cancelled: true }
    },
    async getStatus() {
      return status
    },
    async setHotkey(hotkey) {
      status = { ...status, hotkey }
    },
    async updateSession(session) {
      sessions.set(session.id, { ...session, keys: deriveKeys(session.events) })
    },
    async listSessions() {
      return [...sessions.keys()]
    },
    async loadSession(sessionId) {
      const session = sessions.get(sessionId)
      if (!session) {
        throw new Error(`session ${sessionId} not found`)
      }
      return session
    },
    async saveSession(session) {
      sessions.set(session.id, session)
    },
    async importSessionJson(payload) {
      const parsed = parseSessionJson(payload)
      sessions.set(parsed.id, parsed)
      return parsed
    },
    async exportSessionJson(sessionId) {
      const session = sessions.get(sessionId)
      if (!session) {
        throw new Error(`session ${sessionId} not found`)
      }
      return JSON.stringify(session, null, 2)
    },
    async timingReport() {
      return report
    },
    async platformStatus() {
      return platform
    },
  }
}

const isTauriRuntime = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export function createTauriClient(): TauriApi {
  if (!isTauriRuntime) {
    return makeMockClient()
  }
  return {
    startRecording: () => invoke<void>('start_recording'),
    startRecordingAt: (offsetMs) =>
      invoke<void>('start_recording_at', { offsetMs }),
    stopRecording: (payload) =>
      invoke<Session>('stop_recording', {
        name: payload.name,
        bpm: payload.bpm,
        offsetMs: payload.offset_ms,
      }),
    playSession: (sessionId) => invoke<void>('play_session', { sessionId }),
    stopPlayback: () => invoke<void>('stop_playback'),
    getStatus: () => invoke<RuntimeStatus>('get_status'),
    setHotkey: (hotkey) => invoke<void>('set_hotkey', { hotkey }),
    updateSession: (session) => invoke<void>('update_session', { session }),
    listSessions: () => invoke<string[]>('list_sessions'),
    loadSession: (sessionId) => invoke<Session>('load_session', { sessionId }),
    saveSession: (session) => invoke<void>('save_session', { session }),
    importSessionJson: (payload) =>
      invoke<Session>('import_session_json', { payload }),
    exportSessionJson: (sessionId) =>
      invoke<string>('export_session_json', { sessionId }),
    timingReport: () => invoke<PlaybackReport | null>('timing_report'),
    platformStatus: () => invoke<PlatformStatus>('platform_status'),
  }
}
