import { describe, expect, it } from 'vitest'

import { recordingEndNs, resolveStoppedRecordingSession } from '@/features/recording/recordingSession'
import type { Session, SessionEvent } from '@/lib/types'

function session(id: string, events: readonly SessionEvent[] = []): Session {
  return {
    schema_version: 2,
    id,
    name: id,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    keys: [],
    bpm: 180,
    offset_ms: 0,
    events,
  }
}

describe('recording session resolution', () => {
  it('keeps a new recording as the newly-created session', () => {
    const recorded = session('recorded', [
      { t_ns: 10, key: 'D', action: 'press' },
      { t_ns: 20, key: 'D', action: 'release' },
    ])
    const recordedWithKeys = { ...recorded, keys: ['D'] }

    const result = resolveStoppedRecordingSession({
      baseEvents: [],
      laneOrder: ['Old'],
      recorded: recordedWithKeys,
      target: { kind: 'new' },
    })

    expect(result.session.id).toBe('recorded')
    expect(result.deleteSessionId).toBeNull()
    expect(result.session.keys).toEqual(['D'])
    expect(result.session.events).toHaveLength(2)
  })

  it('updates the selected session after punch-in and deletes the backend temp session', () => {
    const selected = session('selected', [
      { t_ns: 100, key: 'K', action: 'press' },
      { t_ns: 200, key: 'K', action: 'release' },
    ])
    const recorded = session('temp', [
      { t_ns: 150, key: 'D', action: 'press' },
      { t_ns: 175, key: 'D', action: 'release' },
    ])

    const result = resolveStoppedRecordingSession({
      baseEvents: selected.events,
      laneOrder: ['K'],
      recorded,
      target: { kind: 'update', session: selected },
    })

    expect(result.session.id).toBe('selected')
    expect(result.deleteSessionId).toBe('temp')
    expect(result.session.keys).toEqual(['K', 'D'])
    expect(result.session.events.map((event) => event.t_ns)).toEqual([100, 150, 175, 200])
  })

  it('returns the last recorded cursor point when recording stops', () => {
    const events: readonly SessionEvent[] = [
      { t_ns: 200, key: 'D', action: 'release' },
      { t_ns: 100, key: 'D', action: 'press' },
      { t_ns: 350, key: 'K', action: 'release' },
    ]

    expect(recordingEndNs(events)).toBe(350)
  })
})
