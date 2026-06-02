import type { KeyboardEvent, PointerEvent } from 'react'

import {
  laneAtX,
  noteRect,
  type TimelineMetrics,
} from '@/features/timeline-editor/noteCanvasModel'
import { snapTimeToGrid } from '@/features/timeline-editor/noteCanvasGrid'
import { ARROW_MOVE_NS, moveNotes, moveNotesAcrossLanes, type NoteEdge, type NoteSpan } from '@/lib/timeline'
import type { KeyName } from '@/lib/types'

export type CanvasPoint = {
  readonly x: number
  readonly y: number
}

export type MarqueeRect = {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

export type DragState =
  | {
      readonly kind: 'cursor'
    }
  | {
      readonly edge: NoteEdge
      readonly kind: 'resize'
      readonly noteId: string
      readonly originNotes: readonly NoteSpan[]
    }
  | {
      readonly kind: 'move'
      readonly origin: CanvasPoint
      readonly originNotes: readonly NoteSpan[]
      readonly originSelection: ReadonlySet<string>
      readonly targetNoteId: string
    }
  | {
      readonly additive: boolean
      readonly current: CanvasPoint
      readonly kind: 'marquee'
      readonly origin: CanvasPoint
      readonly originSelection: ReadonlySet<string>
    }

export type SnapMoveArgs = {
  readonly bpm: number
  readonly offsetMs: number
  readonly originStartNs: number
  readonly rawDeltaNs: number
}

export function snappedMoveDeltaNs(args: SnapMoveArgs): number {
  return snapTimeToGrid(args.originStartNs + args.rawDeltaNs, args.bpm, args.offsetMs) - args.originStartNs
}

export function canvasPointFromPointer(
  event: PointerEvent<HTMLCanvasElement>,
  metrics: TimelineMetrics,
): CanvasPoint {
  const rect = event.currentTarget.getBoundingClientRect()
  return {
    x: (event.clientX - rect.left) * (metrics.width / rect.width),
    y: (event.clientY - rect.top) * (metrics.height / rect.height),
  }
}

export function marqueeRect(origin: CanvasPoint, current: CanvasPoint): MarqueeRect {
  const x = Math.min(origin.x, current.x)
  const y = Math.min(origin.y, current.y)
  return {
    height: Math.abs(current.y - origin.y),
    width: Math.abs(current.x - origin.x),
    x,
    y,
  }
}

export function selectNotesInMarquee(
  notes: readonly NoteSpan[],
  metrics: TimelineMetrics,
  rect: MarqueeRect,
): Set<string> {
  const ids = new Set<string>()
  for (const note of notes) {
    const noteBounds = noteRect(note, metrics)
    if (!noteBounds) {
      continue
    }
    const horizontal = noteBounds.x + noteBounds.width >= rect.x && noteBounds.x <= rect.x + rect.width
    const vertical =
      noteBounds.y + noteBounds.height >= rect.y && noteBounds.y <= rect.y + rect.height
    if (horizontal && vertical) {
      ids.add(note.id)
    }
  }
  return ids
}

export function laneDeltaFromPoint(
  originNote: NoteSpan,
  targetX: number,
  metrics: TimelineMetrics,
): number {
  const targetLane = laneAtX(targetX, metrics)
  if (!targetLane) {
    return 0
  }
  const originIndex = metrics.lanes.indexOf(originNote.key)
  const targetIndex = metrics.lanes.indexOf(targetLane)
  if (originIndex < 0 || targetIndex < 0) {
    return 0
  }
  return targetIndex - originIndex
}

export function mergeMarqueeSelection(
  baseSelection: ReadonlySet<string>,
  marqueeSelection: ReadonlySet<string>,
  additive: boolean,
): Set<string> {
  if (!additive) {
    return new Set(marqueeSelection)
  }
  const merged = new Set(baseSelection)
  for (const id of marqueeSelection) {
    merged.add(id)
  }
  return merged
}

export function noteSelectionAfterPointer(
  event: PointerEvent<HTMLCanvasElement>,
  selected: ReadonlySet<string>,
  noteId: string,
): Set<string> {
  const nextSelection = new Set(selected)
  if (event.metaKey || event.ctrlKey || event.shiftKey) {
    if (nextSelection.has(noteId)) {
      nextSelection.delete(noteId)
    } else {
      nextSelection.add(noteId)
    }
    return nextSelection
  }
  if (!nextSelection.has(noteId)) {
    nextSelection.clear()
    nextSelection.add(noteId)
  }
  return nextSelection
}

export function handleClipboardKey(
  event: KeyboardEvent<HTMLCanvasElement>,
  notes: readonly NoteSpan[],
  selected: ReadonlySet<string>,
  clipboard: readonly NoteSpan[],
  setClipboard: (notes: readonly NoteSpan[]) => void,
  deleteSelected: () => void,
  pasteClipboard: () => void,
): boolean {
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    deleteSelected()
    return true
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
    event.preventDefault()
    setClipboard(notes.filter((note) => selected.has(note.id)))
    return true
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'x') {
    event.preventDefault()
    setClipboard(notes.filter((note) => selected.has(note.id)))
    deleteSelected()
    return true
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v') {
    event.preventDefault()
    if (clipboard.length > 0) {
      pasteClipboard()
    }
    return true
  }
  return false
}

export function movedNotesAfterArrowKey(
  event: KeyboardEvent<HTMLCanvasElement>,
  notes: readonly NoteSpan[],
  selected: ReadonlySet<string>,
  lanes: readonly KeyName[],
): readonly NoteSpan[] | null {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault()
    return moveNotes(notes, selected, event.key === 'ArrowUp' ? -ARROW_MOVE_NS : ARROW_MOVE_NS)
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    return moveNotesAcrossLanes(notes, selected, 0, event.key === 'ArrowLeft' ? -1 : 1, lanes)
  }
  return null
}
