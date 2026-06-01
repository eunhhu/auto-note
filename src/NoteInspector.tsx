import { nsToMs, type NoteEdge, type NoteSpan } from './timeline'

type Props = {
  readonly selectedNotes: readonly NoteSpan[]
  readonly onResizeNote: (noteId: string, edge: NoteEdge, targetNs: number) => void
}

export function NoteInspector(props: Props) {
  if (props.selectedNotes.length === 0) {
    return (
      <aside className="note-inspector" data-testid="note-inspector">
        <strong>Note</strong>
        <span className="note-inspector-muted">No note selected</span>
      </aside>
    )
  }
  if (props.selectedNotes.length > 1) {
    return (
      <aside className="note-inspector" data-testid="note-inspector">
        <strong>Note</strong>
        <span className="note-inspector-muted">{props.selectedNotes.length} notes selected</span>
      </aside>
    )
  }
  const note = props.selectedNotes[0]
  if (!note) {
    return null
  }
  const durationNs = note.end_ns - note.start_ns

  function update(edge: NoteEdge, value: string): void {
    const targetNs = Number(value)
    if (!Number.isFinite(targetNs) || !note) {
      return
    }
    props.onResizeNote(note.id, edge, Math.round(targetNs))
  }

  return (
    <aside className="note-inspector" data-testid="note-inspector">
      <strong>{note.key}</strong>
      <label>
        Press ns
        <input
          aria-label="Press ns"
          type="number"
          step={1}
          value={note.start_ns}
          onChange={(event) => update('start', event.currentTarget.value)}
        />
      </label>
      <label>
        Release ns
        <input
          aria-label="Release ns"
          type="number"
          step={1}
          value={note.end_ns}
          onChange={(event) => update('end', event.currentTarget.value)}
        />
      </label>
      <span className="note-inspector-muted">{durationNs} ns</span>
      <span className="note-inspector-muted">{nsToMs(durationNs)} ms</span>
    </aside>
  )
}
