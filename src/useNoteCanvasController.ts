import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

import {
  hitTest,
  laneAtX,
  TIME_RULER_WIDTH,
  timelineMetrics,
  yToTimeNs,
  type TimelineMetrics,
} from './noteCanvasModel'
import {
  handleClipboardKey,
  laneDeltaFromPoint,
  marqueeRect,
  mergeMarqueeSelection,
  noteSelectionAfterPointer,
  selectNotesInMarquee,
  type CanvasPoint,
  type DragState,
  type MarqueeRect,
} from './noteCanvasInteraction'
import { remapSelection } from './noteSelection'
import {
  ARROW_MOVE_NS,
  createNoteSpan,
  deleteNotes,
  eventsToNotes,
  moveNotes,
  moveNotesAcrossLanes,
  notesToEvents,
  pasteNotes,
  resizeNote,
  type NoteEdge,
  type NoteSpan,
} from './timeline'
import type { NoteCanvasControllerProps } from './noteCanvasProps'
import { useNoteCanvasPainter } from './useNoteCanvasPainter'

export function useNoteCanvasController(props: NoteCanvasControllerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [clipboard, setClipboard] = useState<readonly NoteSpan[]>([])
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null)
  const [zoom, setZoom] = useState(1)
  const notes = useMemo(() => eventsToNotes(props.events), [props.events])
  const ghostNotes = useMemo(() => eventsToNotes(props.ghostEvents), [props.ghostEvents])
  const selectedNotes = useMemo(
    () => notes.filter((note) => selected.has(note.id)),
    [notes, selected],
  )
  const metrics = useMemo(
    () => timelineMetrics(props.events, props.ghostEvents, zoom, props.laneOrder),
    [props.events, props.ghostEvents, props.laneOrder, zoom],
  )

  useNoteCanvasPainter({ canvasRef, ghostNotes, marquee, metrics, notes, props, selected })

  function point(event: PointerEvent<HTMLCanvasElement>): CanvasPoint {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (metrics.width / rect.width),
      y: (event.clientY - rect.top) * (metrics.height / rect.height),
    }
  }

  function commitNotes(next: readonly NoteSpan[]): void {
    props.onEventsChange(notesToEvents(next))
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>): void {
    const target = point(event)
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture(event.pointerId)
    if (target.x < TIME_RULER_WIDTH) {
      props.onCursorChange(yToTimeNs(target.y, metrics))
      dragRef.current = { kind: 'cursor' }
      return
    }
    const hit = hitTest(target.x, target.y, metrics, notes)
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
      const newNote = createNoteSpan(lane, timeNs, notes.length)
      const next = [...notes, newNote]
      commitNotes(next)
      setSelected(remapSelection(next, [newNote]))
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
    const target = point(event)
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
    const resized = resizeNote(drag.originNotes, drag.noteId, drag.edge, yToTimeNs(target.y, metrics))
    const targetNotes = resized.filter((note) => note.id === drag.noteId)
    commitNotes(resized)
    setSelected(remapSelection(resized, targetNotes))
    const resizedNote = targetNotes[0]
    if (resizedNote) {
      props.onCursorChange(drag.edge === 'start' ? resizedNote.start_ns : resizedNote.end_ns)
    }
  }

  function moveDraggedNotes(drag: Extract<DragState, { readonly kind: 'move' }>, target: CanvasPoint): void {
    const originNote = drag.originNotes.find((note) => note.id === drag.targetNoteId)
    const deltaNs = yToTimeNs(target.y, metrics) - yToTimeNs(drag.origin.y, metrics)
    const laneDelta = originNote ? laneDeltaFromPoint(originNote, target.x, metrics) : 0
    commitMovedSelection(
      moveNotesAcrossLanes(drag.originNotes, drag.originSelection, deltaNs, laneDelta, metrics.lanes),
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
    const pasted = pasteNotes(clipboard, props.cursorNs)
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
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      commitMovedSelection(moveNotes(notes, selected, event.key === 'ArrowUp' ? -ARROW_MOVE_NS : ARROW_MOVE_NS))
      return
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      commitMovedSelection(moveNotesAcrossLanes(notes, selected, 0, event.key === 'ArrowLeft' ? -1 : 1, metrics.lanes))
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
