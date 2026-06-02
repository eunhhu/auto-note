import {
  Clipboard,
  Copy,
  Grid3X3,
  Eye,
  EyeOff,
  LocateFixed,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Square,
  Trash2,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import { nsToMs } from '@/lib/timeline'

type Props = {
  readonly clipboardCount: number
  readonly cursorNs: number
  readonly ghostCount: number
  readonly followPlayback: boolean
  readonly isPlaying: boolean
  readonly isPlaybackPaused: boolean
  readonly selectedCount: number
  readonly showGhostNotes: boolean
  readonly zoom: number
  readonly onCopy: () => void
  readonly onCut: () => void
  readonly onDelete: () => void
  readonly onPaste: () => void
  readonly onPausePlayback: () => void
  readonly onPlay: () => void
  readonly onResumePlayback: () => void
  readonly onResetCursor: () => void
  readonly onStopPlayback: () => void
  readonly onToggleFollowPlayback: () => void
  readonly onToggleGhostNotes: () => void
  readonly onZoomIn: () => void
  readonly onZoomOut: () => void
}

export function NoteCanvasToolbar(props: Props) {
  const canEditSelection = props.selectedCount > 0
  const playbackButtonLabel = props.isPlaying ? 'Stop' : 'Play'
  const playbackAriaLabel = props.isPlaying ? 'Canvas stop replay' : 'Canvas play session'
  const playbackAction = props.isPlaying ? props.onStopPlayback : props.onPlay
  const pauseButtonLabel = props.isPlaybackPaused ? 'Resume' : 'Pause'
  const pauseAriaLabel = props.isPlaybackPaused ? 'Canvas resume replay' : 'Canvas pause replay'
  const pauseAction = props.isPlaybackPaused ? props.onResumePlayback : props.onPausePlayback
  const ghostState = props.showGhostNotes
    ? props.ghostCount > 0
      ? 'ON'
      : 'none'
    : 'hidden'
  return (
    <div className="canvas-editor-chrome">
      <div className="canvas-primary-toolbar">
        <div className="canvas-toolbar-group">
          <button type="button" className="icon-button" onClick={props.onResetCursor} title="Reset cursor">
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>
          <button
            type="button"
            aria-label={playbackAriaLabel}
            className={props.isPlaying ? 'icon-button danger active' : 'icon-button play'}
            onClick={playbackAction}
            title={playbackAriaLabel}
          >
            {props.isPlaying ? <Square size={15} /> : <Play size={15} />}
            <span>{playbackButtonLabel}</span>
          </button>
          <button
            type="button"
            aria-label={pauseAriaLabel}
            className={props.isPlaybackPaused ? 'icon-button active' : 'icon-button'}
            disabled={!props.isPlaying}
            onClick={pauseAction}
            title={pauseAriaLabel}
          >
            {props.isPlaybackPaused ? <Play size={15} /> : <Pause size={15} />}
            <span>{pauseButtonLabel}</span>
          </button>
          <span className="canvas-readout">{nsToMs(props.cursorNs)}ms</span>
        </div>

        <div className="canvas-toolbar-group center">
          <span className="canvas-mode-badge">
            <Grid3X3 size={14} />
            Grid visual only
          </span>
          <span className="canvas-mode-badge raw">Raw ns edit</span>
        </div>

        <div className="canvas-toolbar-group">
          <button type="button" className="icon-button" disabled={!canEditSelection} onClick={props.onCopy} title="Copy">
            <Copy size={14} />
            <span>Copy</span>
          </button>
          <button type="button" className="icon-button" disabled={!canEditSelection} onClick={props.onCut} title="Cut">
            <Scissors size={14} />
            <span>Cut</span>
          </button>
          <button type="button" className="icon-button" disabled={props.clipboardCount === 0} onClick={props.onPaste} title="Paste">
            <Clipboard size={14} />
            <span>Paste</span>
          </button>
          <button type="button" className="icon-button delete" disabled={!canEditSelection} onClick={props.onDelete} title="Delete">
            <Trash2 size={14} />
            <span>Del</span>
          </button>
        </div>
      </div>

      <div className="canvas-sub-toolbar">
        <div className="canvas-sub-left">
          <span className="canvas-title">
            <Zap size={15} />
            수직 타임라인 편집기
          </span>
          <span data-testid="selection-status">선택: {props.selectedCount}</span>
          <span data-testid="clipboard-status">클립보드: {props.clipboardCount}</span>
          <span>Diff: {ghostState}</span>
        </div>
        <div className="zoom-cluster">
          <button
            type="button"
            aria-label={props.followPlayback ? 'Disable playback follow' : 'Enable playback follow'}
            className={props.followPlayback ? 'icon-button compact active' : 'icon-button compact'}
            onClick={props.onToggleFollowPlayback}
            title={props.followPlayback ? 'Disable playback follow' : 'Enable playback follow'}
          >
            <LocateFixed size={14} />
          </button>
          <button
            type="button"
            aria-label={props.showGhostNotes ? 'Hide ghost notes' : 'Show ghost notes'}
            className="icon-button compact"
            onClick={props.onToggleGhostNotes}
            title={props.showGhostNotes ? 'Hide ghost notes' : 'Show ghost notes'}
          >
            {props.showGhostNotes ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button type="button" className="icon-button compact" onClick={props.onZoomOut} title="Zoom out">
            <ZoomOut size={14} />
          </button>
          <span>{Math.round(props.zoom * 100)}%</span>
          <button type="button" className="icon-button compact" onClick={props.onZoomIn} title="Zoom in">
            <ZoomIn size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
