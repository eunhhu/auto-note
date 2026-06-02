import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

import {
  buildNoteHitIndex,
  hitTestIndexed,
  laneAtX,
  TIME_RULER_WIDTH,
  timelineMetrics,
  yToTimeNs,
  type TimelineMetrics,
} from '@/features/timeline-editor/noteCanvasModel'
import { snapTimeToGrid } from '@/features/timeline-editor/noteCanvasGrid'
import {
  canvasPointFromPointer,
  handleClipboardKey,
  marqueeRect,
  mergeMarqueeSelection,
  movedNotesAfterArrowKey,
  noteSelectionAfterPointer,
  selectNotesInMarquee,
  type CanvasPoint,
  type DragState,
  type MarqueeRect,
} from '@/features/timeline-editor/noteCanvasInteraction'
import {
  moveDraggedNotesResult,
  resizeDraggedNoteResult,
} from '@/features/timeline-editor/noteCanvasMutation'
import { remapSelection } from '@/features/timeline-editor/noteSelection'
import {
  createNoteSpan,
  deleteNotes,
  eventsToNotes,
  notesToEvents,
  pasteNotes,
  resizeNote,
  type NoteEdge,
  type NoteSpan,
} from '@/lib/timeline'
import type {
  NoteCanvasControllerOptions,
  NoteCanvasControllerProps,
} from '@/features/timeline-editor/noteCanvasProps'
import { useNoteCanvasPainter } from '@/features/timeline-editor/useNoteCanvasPainter'

export function useNoteCanvasController(
  props: NoteCanvasControllerProps,
  options: NoteCanvasControllerOptions,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [clipboard, setClipboard] = useState<readonly NoteSpan[]>([])
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null)
  const [zoom, setZoom] = useState(1)
  const notes = useMemo(() => eventsToNotes(props.events), [props.events])
  const ghostNotes = useMemo(() => eventsToNotes(props.ghostEvents), [props.ghostEvents])
  const noteHitIndex = useMemo(() => buildNoteHitIndex(notes), [notes])
  const selectedNotes = useMemo(
    () => notes.filter((note) => selected.has(note.id)),
    [notes, selected],
  )
  const metrics = useMemo(
    () => timelineMetrics(props.events, props.ghostEvents, zoom, props.laneOrder),
    [props.events, props.ghostEvents, props.laneOrder, zoom],
  )

  useNoteCanvasPainter({ canvasRef, ghostNotes, marquee, metrics, notes, props, selected })

  function commitNotes(next: readonly NoteSpan[]): void {
    props.onEventsChange(notesToEvents(next))
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>): void {
    const target = canvasPointFromPointer(event, metrics)
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture(event.pointerId)
    if (target.x < TIME_RULER_WIDTH) {
      props.onCursorChange(yToTimeNs(target.y, metrics))
      dragRef.current = { kind: 'cursor' }
      return
    }
    const hit = hitTestIndexed(target.x, target.y, metrics, noteHitIndex)
    if (!hit) {
      return
    }
    props.onCursorChange(hit.kind === 'empty' ? hit.timeNs : hit.note.start_ns)
    if (hit.kind === 'empty') {
      startEmptyDrag(event, target, hit.timeNs, metrics)
      return
    }
    const nextSelection = noteSelectionAfterPointer(event, selected, hit.note.id)
    setSelected(nextSelection)
    if (hit.kind === 'resize-start' || hit.kind === 'resize-end') {
      dragRef.current = {
        edge: hit.kind === 'resize-start' ? 'start' : 'end',
        kind: 'resize',
        noteId: hit.note.id,
        originNotes: notes,
      }
      return
    }
    dragRef.current = {
      kind: 'move',
      origin: target,
      originNotes: notes,
      originSelection: nextSelection,
      targetNoteId: hit.note.id,
    }
  }

  function startEmptyDrag(
    event: PointerEvent<HTMLCanvasElement>,
    target: CanvasPoint,
    timeNs: number,
    currentMetrics: TimelineMetrics,
  ): void {
    const lane = laneAtX(target.x, currentMetrics)
    if (event.altKey && lane) {
      const startNs = options.gridSnapEnabled
        ? snapTimeToGrid(timeNs, props.bpm, props.offsetMs)
        : timeNs
      const newNote = createNoteSpan(lane, startNs, notes.length)
      const next = [...notes, newNote]
      commitNotes(next)
      setSelected(remapSelection(next, [newNote]))
      props.onCursorChange(newNote.start_ns)
      dragRef.current = { edge: 'end', kind: 'resize', noteId: newNote.id, originNotes: next }
      return
    }
    const additive = event.metaKey || event.ctrlKey || event.shiftKey
    dragRef.current = {
      additive,
      current: target,
      kind: 'marquee',
      origin: target,
      originSelection: selected,
    }
    if (!additive) {
      setSelected(new Set())
    }
    setMarquee(marqueeRect(target, target))
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>): void {
    const drag = dragRef.current
    if (!drag) {
      return
    }
    const target = canvasPointFromPointer(event, metrics)
    if (drag.kind === 'cursor') {
      props.onCursorChange(yToTimeNs(target.y, metrics))
      return
    }
    if (drag.kind === 'marquee') {
      const rect = marqueeRect(drag.origin, target)
      const marqueeSelection = selectNotesInMarquee(notes, metrics, rect)
      setMarquee(rect)
      setSelected(mergeMarqueeSelection(drag.originSelection, marqueeSelection, drag.additive))
      return
    }
    if (drag.kind === 'resize') {
      resizeDraggedNote(drag, target)
      return
    }
    moveDraggedNotes(drag, target)
  }

  function resizeDraggedNote(drag: Extract<DragState, { readonly kind: 'resize' }>, target: CanvasPoint): void {
    const result = resizeDraggedNoteResult(drag, yToTimeNs(target.y, metrics))
    commitNotes(result.notes)
    setSelected(remapSelection(result.notes, result.targetNotes))
    if (result.cursorNs !== null) {
      props.onCursorChange(result.cursorNs)
    }
  }

  function moveDraggedNotes(drag: Extract<DragState, { readonly kind: 'move' }>, target: CanvasPoint): void {
    const rawDeltaNs = yToTimeNs(target.y, metrics) - yToTimeNs(drag.origin.y, metrics)
    commitMovedSelection(
      moveDraggedNotesResult(drag, target, rawDeltaNs, metrics, {
        bpm: props.bpm,
        enabled: options.gridSnapEnabled,
        offsetMs: props.offsetMs,
      }),
    )
  }

  function handlePointerEnd(event: PointerEvent<HTMLCanvasElement>): void {
    event.currentTarget.releasePointerCapture(event.pointerId)
    dragRef.current = null
    setMarquee(null)
  }

  function deleteSelected(): void {
    commitNotes(deleteNotes(notes, selected))
    setSelected(new Set())
  }

  function pasteClipboard(): void {
    const targetNs = options.gridSnapEnabled
      ? snapTimeToGrid(props.cursorNs, props.bpm, props.offsetMs)
      : props.cursorNs
    const pasted = pasteNotes(clipboard, targetNs)
    const next = [...notes, ...pasted]
    commitNotes(next)
    setSelected(remapSelection(next, pasted))
  }

  function handleResizeNote(noteIdValue: string, edge: NoteEdge, targetNs: number): void {
    const resized = resizeNote(notes, noteIdValue, edge, targetNs)
    const targetNotes = resized.filter((note) => note.id === noteIdValue)
    commitNotes(resized)
    setSelected(remapSelection(resized, targetNotes))
    const resizedNote = targetNotes[0]
    if (resizedNote) {
      props.onCursorChange(edge === 'start' ? resizedNote.start_ns : resizedNote.end_ns)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLCanvasElement>): void {
    if (handleClipboardKey(event, notes, selected, clipboard, setClipboard, deleteSelected, pasteClipboard)) {
      return
    }
    const moved = movedNotesAfterArrowKey(event, notes, selected, metrics.lanes)
    if (moved) {
      commitMovedSelection(moved)
    }
  }

  function commitMovedSelection(moved: readonly NoteSpan[]): void {
    const targetNotes = moved.filter((note) => selected.has(note.id))
    commitNotes(moved)
    setSelected(remapSelection(moved, targetNotes))
  }

  return {
    canvasRef,
    clipboardCount: clipboard.length,
    ghostNotes,
    handleKeyDown,
    handlePointerDown,
    handlePointerEnd,
    handlePointerMove,
    handleResizeNote,
    metrics,
    selectedCount: selected.size,
    selectedNotes,
    toolbarActions: {
      copy: () => setClipboard(selectedNotes),
      cut: () => {
        setClipboard(selectedNotes)
        deleteSelected()
      },
      delete: deleteSelected,
      paste: pasteClipboard,
      resetCursor: () => props.onCursorChange(0),
      zoomIn: () => setZoom((value) => Math.min(8, value * 1.25)),
      zoomOut: () => setZoom((value) => Math.max(0.5, value / 1.25)),
    },
    zoom,
  }
}
