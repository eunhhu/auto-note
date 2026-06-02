import { describe, expect, it } from 'vitest'

import { parseSessionJson } from '@/lib/session/sessionSchema'

const validPayload = JSON.stringify({
  schema_version: 2,
  id: 'id-1',
  name: 'session',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  keys: ['Q', 'Space'],
  bpm: 180,
  offset_ms: 0,
  events: [{ t_ns: 10_000, key: 'Q', action: 'press' }],
})

describe('session parser', () => {
  it('accepts valid schema', () => {
    const parsed = parseSessionJson(validPayload)
    expect(parsed.schema_version).toBe(2)
    expect(parsed.events[0].t_ns).toBe(10_000)
  })

  it('rejects malformed schema', () => {
    const malformed = JSON.stringify({ schema_version: 1 })
    expect(() => parseSessionJson(malformed)).toThrow()
  })
})
