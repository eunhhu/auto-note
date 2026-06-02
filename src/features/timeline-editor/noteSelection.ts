import { eventsToNotes, notesToEvents, type NoteSpan } from '@/lib/timeline'

export function remapSelection(
  allNotes: readonly NoteSpan[],
  targetNotes: readonly NoteSpan[],
): Set<string> {
  const signatures = new Set(targetNotes.map(noteSignature))
  return new Set(
    eventsToNotes(notesToEvents(allNotes))
      .filter((note) => signatures.has(noteSignature(note)))
      .map((note) => note.id),
  )
}

function noteSignature(note: NoteSpan): string {
  return `${note.key}:${note.start_ns}:${note.end_ns}`
}
