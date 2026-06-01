import { useRef } from 'react'

import { NoteLaneHeader } from './NoteLaneHeader'
import { NoteCanvasToolbar } from './NoteCanvasToolbar'
import { NoteInspector } from './NoteInspector'
import { KEY_LANE_WIDTH, TIME_RULER_WIDTH } from './noteCanvasModel'
import type { NoteCanvasControllerProps } from './noteCanvasProps'
import { reorderLane } from './timeline'
import { useNoteCanvasController } from './useNoteCanvasController'
import { usePlaybackTimelineScroll } from './usePlaybackTimelineScroll'
import type { KeyName } from './types'

type Props = NoteCanvasControllerProps

export function NoteCanvas(props: Props) {
  const controller = useNoteCanvasController(props)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  usePlaybackTimelineScroll({
    cursorNs: props.cursorNs,
    isPlaying: props.isPlaying,
    metrics: controller.metrics,
    scrollRef,
  })

  function moveLane(lane: KeyName, direction: 'left' | 'right'): void {
    props.onLaneOrderChange(reorderLane(controller.metrics.lanes, lane, direction))
  }

  return (
    <div className="timeline-shell">
      <NoteCanvasToolbar
        clipboardCount={controller.clipboardCount}
        cursorNs={props.cursorNs}
        ghostCount={controller.ghostNotes.length}
        isPlaying={props.isPlaying}
        selectedCount={controller.selectedCount}
        zoom={controller.zoom}
        onCopy={controller.toolbarActions.copy}
        onCut={controller.toolbarActions.cut}
        onDelete={controller.toolbarActions.delete}
        onPaste={controller.toolbarActions.paste}
        onPlay={props.onPlay}
        onResetCursor={controller.toolbarActions.resetCursor}
        onStopPlayback={props.onStopPlayback}
        onZoomIn={controller.toolbarActions.zoomIn}
        onZoomOut={controller.toolbarActions.zoomOut}
      />
      <NoteInspector
        selectedNotes={controller.selectedNotes}
        onResizeNote={controller.handleResizeNote}
      />
      <div ref={scrollRef} className="timeline-scroll">
        <div className="timeline-column-header" style={{ width: controller.metrics.width }}>
          <div className="timeline-time-header" style={{ width: TIME_RULER_WIDTH }}>
            Timeline
          </div>
          {controller.metrics.lanes.map((lane) => (
            <div key={lane} className="timeline-key-header" style={{ width: KEY_LANE_WIDTH }}>
              <NoteLaneHeader
                lane={lane}
                lanes={controller.metrics.lanes}
                onMoveLane={moveLane}
              />
            </div>
          ))}
        </div>
        <canvas
          ref={controller.canvasRef}
          aria-label="note timing canvas"
          data-testid="note-canvas"
          tabIndex={0}
          onKeyDown={controller.handleKeyDown}
          onPointerCancel={controller.handlePointerEnd}
          onPointerDown={controller.handlePointerDown}
          onPointerMove={controller.handlePointerMove}
          onPointerUp={controller.handlePointerEnd}
        />
      </div>
    </div>
  )
}
