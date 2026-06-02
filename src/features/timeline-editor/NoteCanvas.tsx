import { useRef, useState } from 'react'

import { NoteLaneHeader } from '@/features/timeline-editor/NoteLaneHeader'
import { NoteCanvasToolbar } from '@/features/timeline-editor/NoteCanvasToolbar'
import { NoteInspector } from '@/features/timeline-editor/NoteInspector'
import { KEY_LANE_WIDTH, TIME_RULER_WIDTH } from '@/features/timeline-editor/noteCanvasModel'
import type { NoteCanvasControllerProps } from '@/features/timeline-editor/noteCanvasProps'
import { reorderLane } from '@/lib/timeline'
import { useNoteCanvasController } from '@/features/timeline-editor/useNoteCanvasController'
import { usePlaybackTimelineScroll } from '@/features/timeline-editor/usePlaybackTimelineScroll'
import type { KeyName } from '@/lib/types'

type Props = NoteCanvasControllerProps

export function NoteCanvas(props: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [followPlayback, setFollowPlayback] = useState(true)
  const [gridSnapEnabled, setGridSnapEnabled] = useState(false)
  const controller = useNoteCanvasController(props, { gridSnapEnabled })
  const recordedLaneSet = new Set(props.events.map((event) => event.key))
  usePlaybackTimelineScroll({
    cursorNs: props.cursorNs,
    followPlayback,
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
        followPlayback={followPlayback}
        ghostCount={props.ghostEventCount}
        gridSnapEnabled={gridSnapEnabled}
        showGhostNotes={props.showGhostNotes}
        isPlaying={props.isPlaying}
        isPlaybackPaused={props.isPlaybackPaused}
        selectedCount={controller.selectedCount}
        zoom={controller.zoom}
        onCopy={controller.toolbarActions.copy}
        onCut={controller.toolbarActions.cut}
        onDelete={controller.toolbarActions.delete}
        onPaste={controller.toolbarActions.paste}
        onPausePlayback={props.onPausePlayback}
        onPlay={props.onPlay}
        onResetCursor={controller.toolbarActions.resetCursor}
        onStopPlayback={props.onStopPlayback}
        onToggleFollowPlayback={() => setFollowPlayback((value) => !value)}
        onToggleGridSnap={() => setGridSnapEnabled((value) => !value)}
        onResumePlayback={props.onResumePlayback}
        onToggleGhostNotes={props.onToggleGhostNotes}
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
                canDelete={recordedLaneSet.has(lane)}
                lane={lane}
                lanes={controller.metrics.lanes}
                onDeleteLane={props.onDeleteLane}
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
