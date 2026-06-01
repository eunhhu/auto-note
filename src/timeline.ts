import type { KeyName, SessionEvent } from './types'

export const NS_PER_MS = 1_000_000
export const NS_PER_SECOND = 1_000_000_000
export const MIN_NOTE_NS = 1_000_000
export const ARROW_MOVE_NS = 1_000_000

export type NoteEdge = 'start' | 'end'

export type NoteSpan = {
  readonly id: string
  readonly key: KeyName
  readonly start_ns: number
  readonly end_ns: number
}

export function msToNs(value: number): number {
  return Math.max(0, Math.round(value * NS_PER_MS))
}

export function nsToMs(value: number): number {
  return Math.round(value / NS_PER_MS)
}

export function eventsToNotes(events: readonly SessionEvent[]): readonly NoteSpan[] {
  const holds = new Map<KeyName, number>()
  const notes: NoteSpan[] = []
  for (const [index, event] of events.entries()) {
    if (event.action === 'press') {
      holds.set(event.key, event.t_ns)
      continue
    }
    const startedAt = holds.get(event.key)
    if (startedAt === undefined) {
      continue
    }
    holds.delete(event.key)
    const start = Math.min(startedAt, event.t_ns)
    const end = Math.max(start + MIN_NOTE_NS, event.t_ns)
    notes.push({
      id: noteId(event.key, start, end, index),
      key: event.key,
      start_ns: start,
      end_ns: end,
    })
  }
  return notes.sort((a, b) => a.start_ns - b.start_ns || a.key.localeCompare(b.key))
}

export function notesToEvents(notes: readonly NoteSpan[]): readonly SessionEvent[] {
  const events = notes.flatMap((note): readonly SessionEvent[] => [
    { t_ns: note.start_ns, key: note.key, action: 'press' },
    { t_ns: note.end_ns, key: note.key, action: 'release' },
  ])
  return events.sort((a, b) => a.t_ns - b.t_ns || actionOrder(a) - actionOrder(b))
}

export function deriveKeys(events: readonly SessionEvent[]): readonly KeyName[] {
  const keys: KeyName[] = []
  const seen = new Set<KeyName>()
  for (const event of events) {
    if (seen.has(event.key)) {
      continue
    }
    seen.add(event.key)
    keys.push(event.key)
  }
  return keys
}

export function timelineDurationNs(events: readonly SessionEvent[]): number {
  const maxEvent = Math.max(0, ...events.map((event) => event.t_ns))
  return Math.max(NS_PER_SECOND * 8, maxEvent + NS_PER_SECOND)
}

export function moveNotes(
  notes: readonly NoteSpan[],
  selectedIds: ReadonlySet<string>,
  deltaNs: number,
): readonly NoteSpan[] {
  return notes.map((note) => {
    if (!selectedIds.has(note.id)) {
      return note
    }
    const duration = note.end_ns - note.start_ns
    const start = Math.max(0, note.start_ns + deltaNs)
    const end = start + duration
    return { ...note, start_ns: start, end_ns: end }
  })
}

export function resizeNote(
  notes: readonly NoteSpan[],
  noteIdValue: string,
  edge: NoteEdge,
  targetNs: number,
): readonly NoteSpan[] {
  return notes.map((note) => {
    if (note.id !== noteIdValue) {
      return note
    }
    if (edge === 'start') {
      const start = Math.max(0, Math.min(Math.round(targetNs), note.end_ns - MIN_NOTE_NS))
      return { ...note, start_ns: start }
    }
    const end = Math.max(note.start_ns + MIN_NOTE_NS, Math.round(targetNs))
    return { ...note, end_ns: end }
  })
}

export function deleteNotes(
  notes: readonly NoteSpan[],
  selectedIds: ReadonlySet<string>,
): readonly NoteSpan[] {
  return notes.filter((note) => !selectedIds.has(note.id))
}

export function pasteNotes(
  clipboard: readonly NoteSpan[],
  targetNs: number,
): readonly NoteSpan[] {
  if (clipboard.length === 0) {
    return []
  }
  const origin = Math.min(...clipboard.map((note) => note.start_ns))
  return clipboard.map((note, index) => {
    const start = Math.max(0, targetNs + note.start_ns - origin)
    const end = start + note.end_ns - note.start_ns
    return { ...note, id: noteId(note.key, start, end, index), start_ns: start, end_ns: end }
  })
}

export function noteId(key: KeyName, startNs: number, endNs: number, salt: number): string {
  return `${key}:${startNs}:${endNs}:${salt}`
}

function actionOrder(event: SessionEvent): number {
  return event.action === 'release' ? 1 : 0
}
