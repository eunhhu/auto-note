import { useEffect, useMemo, useState } from 'react'

import { createTauriClient } from './tauriClient'

export function ReplayOverlay() {
  const client = useMemo(() => createTauriClient(), [])
  const [isPlaying, setIsPlaying] = useState(false)
  const [keys, setKeys] = useState<readonly string[]>([])
  const [drift, setDrift] = useState<number | null>(null)

  useEffect(() => {
    void prepareOverlayWindow()
    const timer = window.setInterval(async () => {
      try {
        const [status, report] = await Promise.all([client.getStatus(), client.timingReport()])
        setIsPlaying(status.is_playing)
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
        setIsPlaying(false)
        setKeys([])
      }
    }, 75)
    return () => window.clearInterval(timer)
  }, [client])

  return (
    <main className="overlay-root">
      <div className="overlay-rail">
        <div>
          <span className={isPlaying ? 'overlay-led on' : 'overlay-led'} />
          <strong>{isPlaying ? 'PLAYBACK' : 'IDLE'}</strong>
        </div>
        <div className="overlay-keys">
          {keys.length > 0 ? keys.map((key) => <span key={key}>{key}</span>) : <span>-</span>}
        </div>
        <div>max_drift_ns {drift ?? '-'}</div>
      </div>
    </main>
  )
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
