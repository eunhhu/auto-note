import { useEffect, useMemo, useRef, useState } from 'react'

import {
  KEY_LANE_WIDTH,
  TIME_RULER_WIDTH,
  canvasBitmapSize,
  hitTest,
  timelineMetrics,
  yToTimeNs,
} from './noteCanvasModel'
import { drawTimeline } from './noteCanvasPaint'
import { remapSelection } from './noteSelection'
import { NoteInspector } from './NoteInspector'
import {
  ARROW_MOVE_NS,
  deleteNotes,
  eventsToNotes,
  moveNotes,
  notesToEvents,
  pasteNotes,
  resizeNote,
  type NoteEdge,
  type NoteSpan,
} from './timeline'
import type { SessionEvent } from './types'

type DragState =
  | {
      readonly kind: 'move'
      readonly originY: number
      readonly originNotes: readonly NoteSpan[]
      readonly originSelection: ReadonlySet<string>
    }
  | {
      readonly edge: NoteEdge
      readonly kind: 'resize'
      readonly noteId: string
      readonly originNotes: readonly NoteSpan[]
    }

type Props = {
  readonly bpm: number
  readonly cursorNs: number
  readonly events: readonly SessionEvent[]
  readonly ghostEvents: readonly SessionEvent[]
  readonly offsetMs: number
  readonly onCursorChange: (cursorNs: number) => void
  readonly onEventsChange: (events: readonly SessionEvent[]) => void
}

export function NoteCanvas(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [clipboard, setClipboard] = useState<readonly NoteSpan[]>([])
  const [zoom, setZoom] = useState(1)
  const notes = useMemo(() => eventsToNotes(props.events), [props.events])
  const ghostNotes = useMemo(() => eventsToNotes(props.ghostEvents), [props.ghostEvents])
  const selectedNotes = useMemo(
    () => notes.filter((note) => selected.has(note.id)),
    [notes, selected],
  )
  const metrics = useMemo(
    () => timelineMetrics(props.events, props.ghostEvents, zoom),
    [props.events, props.ghostEvents, zoom],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const size = canvasBitmapSize(metrics, window.devicePixelRatio || 1)
    if (canvas.width !== size.bitmapWidth) {
      canvas.width = size.bitmapWidth
    }
    if (canvas.height !== size.bitmapHeight) {
      canvas.height = size.bitmapHeight
    }
    canvas.style.width = `${size.cssWidth}px`
    canvas.style.height = `${size.cssHeight}px`
    const context = canvas.getContext('2d')
    if (!context) {
      return
    }
    context.setTransform(size.ratio, 0, 0, size.ratio, 0, 0)
    drawTimeline(context, { ...props, metrics, notes, ghostNotes, selected })
  }, [props, metrics, notes, ghostNotes, selected])

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (metrics.width / rect.width),
      y: (event.clientY - rect.top) * (metrics.height / rect.height),
    }
  }

  function commitNotes(next: readonly NoteSpan[]): void {
    props.onEventsChange(notesToEvents(next))
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>): void {
    const targetPoint = point(event)
    const hit = hitTest(targetPoint.x, targetPoint.y, metrics, notes)
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture(event.pointerId)
    if (!hit) {
      return
    }
    const cursorNs =
      hit.kind === 'empty' ? hit.timeNs : hit.kind === 'resize-end' ? hit.note.end_ns : hit.note.start_ns
    props.onCursorChange(cursorNs)
    if (hit.kind === 'empty') {
      setSelected(new Set())
      return
    }
    const nextSelection = new Set(selected)
    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      if (nextSelection.has(hit.note.id)) {
        nextSelection.delete(hit.note.id)
      } else {
        nextSelection.add(hit.note.id)
      }
    } else if (!nextSelection.has(hit.note.id)) {
      nextSelection.clear()
      nextSelection.add(hit.note.id)
    }
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
      originY: targetPoint.y,
      originNotes: notes,
      originSelection: nextSelection,
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>): void {
    const drag = dragRef.current
    if (!drag) {
      return
    }
    const targetPoint = point(event)
    if (drag.kind === 'resize') {
      const targetNs = yToTimeNs(targetPoint.y, metrics)
      const resized = resizeNote(drag.originNotes, drag.noteId, drag.edge, targetNs)
      const targetNotes = resized.filter((note) => note.id === drag.noteId)
      const resizedNote = targetNotes[0]
      commitNotes(resized)
      setSelected(remapSelection(resized, targetNotes))
      if (resizedNote) {
        props.onCursorChange(drag.edge === 'start' ? resizedNote.start_ns : resizedNote.end_ns)
      }
      return
    }
    const deltaNs =
      yToTimeNs(targetPoint.y, metrics) - yToTimeNs(drag.originY, metrics)
    const moved = moveNotes(drag.originNotes, drag.originSelection, deltaNs)
    const targetNotes = moved.filter((note) => drag.originSelection.has(note.id))
    commitNotes(moved)
    setSelected(remapSelection(moved, targetNotes))
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>): void {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      commitNotes(deleteNotes(notes, selected))
      setSelected(new Set())
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
      event.preventDefault()
      setClipboard(notes.filter((note) => selected.has(note.id)))
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'x') {
      event.preventDefault()
      setClipboard(notes.filter((note) => selected.has(note.id)))
      commitNotes(deleteNotes(notes, selected))
      setSelected(new Set())
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v') {
      event.preventDefault()
      const pasted = pasteNotes(clipboard, props.cursorNs)
      const next = [...notes, ...pasted]
      commitNotes(next)
      setSelected(remapSelection(next, pasted))
      return
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const delta = event.key === 'ArrowLeft' ? -ARROW_MOVE_NS : ARROW_MOVE_NS
      const moved = moveNotes(notes, selected, delta)
      const targetNotes = moved.filter((note) => selected.has(note.id))
      commitNotes(moved)
      setSelected(remapSelection(moved, targetNotes))
    }
  }

  function handleResizeNote(noteIdValue: string, edge: NoteEdge, targetNs: number): void {
    const resized = resizeNote(notes, noteIdValue, edge, targetNs)
    const targetNotes = resized.filter((note) => note.id === noteIdValue)
    const resizedNote = targetNotes[0]
    commitNotes(resized)
    setSelected(remapSelection(resized, targetNotes))
    if (resizedNote) {
      props.onCursorChange(edge === 'start' ? resizedNote.start_ns : resizedNote.end_ns)
    }
  }

  return (
    <div className="timeline-shell">
      <div className="timeline-toolbar">
        <span data-testid="selection-status">Selected notes: {selected.size}</span>
        <span data-testid="clipboard-status">Clipboard notes: {clipboard.length}</span>
        <span>Diff overlays: {ghostNotes.length > 0 ? 'ON' : 'none'}</span>
        <button type="button" onClick={() => setZoom((value) => Math.max(0.5, value / 1.25))}>
          Zoom -
        </button>
        <button type="button" onClick={() => setZoom((value) => Math.min(8, value * 1.25))}>
          Zoom +
        </button>
      </div>
      <NoteInspector selectedNotes={selectedNotes} onResizeNote={handleResizeNote} />
      <div className="timeline-scroll">
        <div className="timeline-column-header" style={{ width: metrics.width }}>
          <div className="timeline-time-header" style={{ width: TIME_RULER_WIDTH }}>
            Timeline
          </div>
          {metrics.lanes.map((lane) => (
            <div key={lane} className="timeline-key-header" style={{ width: KEY_LANE_WIDTH }}>
              <span>{lane}</span>
            </div>
          ))}
        </div>
        <canvas
          ref={canvasRef}
          aria-label="note timing canvas"
          data-testid="note-canvas"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => {
            dragRef.current = null
          }}
        />
      </div>
    </div>
  )
}
