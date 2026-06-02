import { useEffect, useMemo, useState } from 'react'

import { createTauriClient } from '@/tauri/tauriClient'

type OverlayMode = 'idle' | 'playing' | 'recording' | 'paused'

export function ReplayOverlay() {
  const client = useMemo(() => createTauriClient(), [])
  const [mode, setMode] = useState<OverlayMode>('idle')
  const [keys, setKeys] = useState<readonly string[]>([])
  const [drift, setDrift] = useState<number | null>(null)

  useEffect(() => {
    void prepareOverlayWindow()
    const timer = window.setInterval(async () => {
      try {
        const [status, report] = await Promise.all([client.getStatus(), client.timingReport()])
        setMode(overlayMode(status.is_playing, status.is_playback_paused, status.is_recording))
        setKeys(
          Object.entries(status.keys)
            .filter(([, down]) => down)
            .map(([key]) => key),
        )
        setDrift(report?.max_drift_ns ?? null)
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error
        }
        setMode('idle')
        setKeys([])
      }
    }, 75)
    return () => window.clearInterval(timer)
  }, [client])

  return (
    <main className="overlay-root">
      <div className="overlay-rail">
        <div>
          <span className={mode === 'idle' ? 'overlay-led' : 'overlay-led on'} />
          <strong>{overlayLabel(mode)}</strong>
        </div>
        <div className="overlay-keys">
          {keys.length > 0 ? keys.map((key) => <span key={key}>{key}</span>) : <span>-</span>}
        </div>
        <div>max_drift_ns {drift ?? '-'}</div>
      </div>
    </main>
  )
}

function overlayMode(
  isPlaying: boolean,
  isPlaybackPaused: boolean,
  isRecording: boolean,
): OverlayMode {
  if (isPlaybackPaused) {
    return 'paused'
  }
  if (isRecording) {
    return 'recording'
  }
  if (isPlaying) {
    return 'playing'
  }
  return 'idle'
}

function overlayLabel(mode: OverlayMode): string {
  switch (mode) {
    case 'idle':
      return 'IDLE'
    case 'playing':
      return 'PLAYBACK'
    case 'recording':
      return 'RECORDING'
    case 'paused':
      return 'REPLAY PAUSED'
  }
}

export async function setReplayOverlayVisible(visible: boolean): Promise<void> {
  if (!isTauriRuntime()) {
    return
  }
  const { Window } = await import('@tauri-apps/api/window')
  const overlay = await Window.getByLabel('replay-overlay')
  if (!overlay) {
    return
  }
  await overlay.setAlwaysOnTop(true)
  await overlay.setIgnoreCursorEvents(true)
  if (visible) {
    await overlay.show()
  } else {
    await overlay.hide()
  }
}

function isTauriRuntime(): boolean {
  return '__TAURI_INTERNALS__' in window
}

async function prepareOverlayWindow(): Promise<void> {
  if (!isTauriRuntime()) {
    return
  }
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const current = getCurrentWindow()
  await current.setAlwaysOnTop(true)
  await current.setIgnoreCursorEvents(true)
}
