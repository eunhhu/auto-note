import type { DragState, CanvasPoint } from '@/features/timeline-editor/noteCanvasInteraction'
import {
  laneDeltaFromPoint,
  snappedMoveDeltaNs,
} from '@/features/timeline-editor/noteCanvasInteraction'
import type { TimelineMetrics } from '@/features/timeline-editor/noteCanvasModel'
import { moveNotesAcrossLanes, resizeNote, type NoteSpan } from '@/lib/timeline'

type SnapConfig = {
  readonly bpm: number
  readonly enabled: boolean
  readonly offsetMs: number
}

type ResizeDragResult = {
  readonly cursorNs: number | null
  readonly notes: readonly NoteSpan[]
  readonly targetNotes: readonly NoteSpan[]
}

export function resizeDraggedNoteResult(
  drag: Extract<DragState, { readonly kind: 'resize' }>,
  targetNs: number,
): ResizeDragResult {
  const notes = resizeNote(drag.originNotes, drag.noteId, drag.edge, targetNs)
  const targetNotes = notes.filter((note) => note.id === drag.noteId)
  const resizedNote = targetNotes[0]
  const cursorNs = resizedNote
    ? drag.edge === 'start'
      ? resizedNote.start_ns
      : resizedNote.end_ns
    : null
  return { cursorNs, notes, targetNotes }
}

export function moveDraggedNotesResult(
  drag: Extract<DragState, { readonly kind: 'move' }>,
  target: CanvasPoint,
  rawDeltaNs: number,
  metrics: TimelineMetrics,
  snap: SnapConfig,
): readonly NoteSpan[] {
  const originNote = drag.originNotes.find((note) => note.id === drag.targetNoteId)
  const deltaNs =
    snap.enabled && originNote
      ? snappedMoveDeltaNs({
          bpm: snap.bpm,
          offsetMs: snap.offsetMs,
          originStartNs: originNote.start_ns,
          rawDeltaNs,
        })
      : rawDeltaNs
  const laneDelta = originNote ? laneDeltaFromPoint(originNote, target.x, metrics) : 0
  return moveNotesAcrossLanes(drag.originNotes, drag.originSelection, deltaNs, laneDelta, metrics.lanes)
}
