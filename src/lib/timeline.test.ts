import { describe, expect, it } from 'vitest'

import {
  deriveKeys,
  eventsToNotes,
  createNoteSpan,
  mergeLaneOrder,
  mergeRecordingPreview,
  removeLaneEvents,
  moveNotesAcrossLanes,
  moveNotes,
  notesToEvents,
  pasteNotes,
  reorderLane,
  resizeNote,
  type NoteSpan,
} from '@/lib/timeline'
import type { SessionEvent } from '@/lib/types'

describe('timeline mapping', () => {
  it('keeps raw nanosecond timing instead of snapping to a BPM grid', () => {
    const events: SessionEvent[] = [
      { t_ns: 123_456_789, key: 'Q', action: 'press' },
      { t_ns: 223_456_789, key: 'Q', action: 'release' },
    ]

    const notes = eventsToNotes(events)
    const rebuilt = notesToEvents(notes)

    expect(notes[0].start_ns).toBe(123_456_789)
    expect(notes[0].end_ns).toBe(223_456_789)
    expect(rebuilt).toEqual(events)
  })

  it('moves selected notes by raw deltas without quantizing', () => {
    const notes: NoteSpan[] = [
      { id: 'a', key: 'Space', start_ns: 10, end_ns: 99 },
      { id: 'b', key: 'Q', start_ns: 500, end_ns: 900 },
    ]

    const moved = moveNotes(notes, new Set(['a']), 7)

    expect(moved[0].start_ns).toBe(17)
    expect(moved[0].end_ns).toBe(106)
    expect(moved[1]).toBe(notes[1])
  })

  it('pastes relative timing at the current cursor', () => {
    const clipboard: NoteSpan[] = [
      { id: 'a', key: 'J', start_ns: 2_000, end_ns: 3_000 },
      { id: 'b', key: 'K', start_ns: 2_500, end_ns: 4_000 },
    ]

    const pasted = pasteNotes(clipboard, 10_000)

    expect(pasted.map((note) => [note.key, note.start_ns, note.end_ns])).toEqual([
      ['J', 10_000, 11_000],
      ['K', 10_500, 12_000],
    ])
  })

  it('derives timeline lanes only from recorded keys in first-seen order', () => {
    const events: SessionEvent[] = [
      { t_ns: 10, key: 'Space', action: 'press' },
      { t_ns: 20, key: 'Q', action: 'press' },
      { t_ns: 30, key: 'Space', action: 'release' },
      { t_ns: 40, key: 'A', action: 'press' },
    ]

    const keys = deriveKeys(events)

    expect(keys).toEqual(['Space', 'Q', 'A'])
  })

  it('keeps preferred lane order and appends newly recorded lanes', () => {
    const merged = mergeLaneOrder(['D', 'S'], ['S', 'K', 'D', 'L'])
    expect(merged).toEqual(['D', 'S', 'K', 'L'])
  })

  it('moves a lane left or right and clamps at the edges', () => {
    expect(reorderLane(['S', 'D', 'F'], 'S', 'left')).toEqual(['S', 'D', 'F'])
    expect(reorderLane(['S', 'D', 'F'], 'F', 'right')).toEqual(['S', 'D', 'F'])
    expect(reorderLane(['S', 'D', 'F'], 'D', 'left')).toEqual(['D', 'S', 'F'])
    expect(reorderLane(['S', 'D', 'F'], 'D', 'right')).toEqual(['S', 'F', 'D'])
  })

  it('merges live recording preview with base events in raw timeline order', () => {
    const merged = mergeRecordingPreview(
      [{ t_ns: 120, key: 'K', action: 'release' }],
      [
        { t_ns: 100, key: 'D', action: 'press' },
        { t_ns: 120, key: 'K', action: 'press' },
      ],
    )
    expect(merged).toEqual([
      { t_ns: 100, key: 'D', action: 'press' },
      { t_ns: 120, key: 'K', action: 'press' },
      { t_ns: 120, key: 'K', action: 'release' },
    ])
  })

  it('resizes note press and release timing without snapping', () => {
    const notes: NoteSpan[] = [
      { id: 'a', key: 'Q', start_ns: 1_000_000_003, end_ns: 1_500_000_007 },
    ]

    const resizedStart = resizeNote(notes, 'a', 'start', 1_000_000_011)
    const resizedEnd = resizeNote(resizedStart, 'a', 'end', 1_700_000_013)

    expect(resizedEnd[0].start_ns).toBe(1_000_000_011)
    expect(resizedEnd[0].end_ns).toBe(1_700_000_013)
  })

  it('moves selected notes across recorded lanes without quantizing time', () => {
    const notes: NoteSpan[] = [
      { id: 'a', key: 'S', start_ns: 123_456_789, end_ns: 223_456_789 },
      { id: 'b', key: 'K', start_ns: 500_000_000, end_ns: 650_000_000 },
    ]

    const moved = moveNotesAcrossLanes(notes, new Set(['a']), 7, 1, ['S', 'D', 'K'])

    expect(moved[0]).toEqual({
      id: 'a',
      key: 'D',
      start_ns: 123_456_796,
      end_ns: 223_456_796,
    })
    expect(moved[1]).toBe(notes[1])
  })

  it('creates an alt-click note with raw nanosecond duration', () => {
    const note = createNoteSpan('Q', 999_999_999, 2, 120_000_000)

    expect(note).toEqual({
      id: 'Q:999999999:1119999999:2',
      key: 'Q',
      start_ns: 999_999_999,
      end_ns: 1_119_999_999,
    })
  })

  it('removes a recorded key lane and its note events', () => {
    const events = [
      { t_ns: 10, key: 'D', action: 'press' as const },
      { t_ns: 20, key: 'D', action: 'release' as const },
      { t_ns: 30, key: 'K', action: 'press' as const },
      { t_ns: 40, key: 'K', action: 'release' as const },
    ]

    const next = removeLaneEvents(events, 'D')

    expect(next).toEqual([
      { t_ns: 30, key: 'K', action: 'press' },
      { t_ns: 40, key: 'K', action: 'release' },
    ])
  })
})
