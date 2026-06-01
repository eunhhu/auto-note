import {
  Clipboard,
  Copy,
  Grid3X3,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Trash2,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import { nsToMs } from './timeline'

type Props = {
  readonly clipboardCount: number
  readonly cursorNs: number
  readonly ghostCount: number
  readonly isPlaying: boolean
  readonly selectedCount: number
  readonly zoom: number
  readonly onCopy: () => void
  readonly onCut: () => void
  readonly onDelete: () => void
  readonly onPaste: () => void
  readonly onPlay: () => void
  readonly onResetCursor: () => void
  readonly onStopPlayback: () => void
  readonly onZoomIn: () => void
  readonly onZoomOut: () => void
}

export function NoteCanvasToolbar(props: Props) {
  const canEditSelection = props.selectedCount > 0
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
            aria-label={props.isPlaying ? 'Canvas stop playback' : 'Canvas play session'}
            className={props.isPlaying ? 'icon-button danger active' : 'icon-button play'}
            onClick={props.isPlaying ? props.onStopPlayback : props.onPlay}
            title={props.isPlaying ? 'Stop playback' : 'Play selected session'}
          >
            {props.isPlaying ? <Pause size={15} /> : <Play size={15} />}
            <span>{props.isPlaying ? 'Stop' : 'Play'}</span>
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
          <span>Diff: {props.ghostCount > 0 ? 'ON' : 'none'}</span>
          <span className="canvas-hint">노트 추가: Alt+클릭</span>
        </div>
        <div className="zoom-cluster">
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
