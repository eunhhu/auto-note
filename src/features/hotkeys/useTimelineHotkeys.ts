import { useEffect, useRef } from 'react'

import type { HotkeyTarget } from '@/features/hotkeys/hotkeyTargets'
import { keyboardEventToKeyName } from '@/features/hotkeys/hotkeys'
import type { RuntimeStatus } from '@/lib/types'

type Args = {
  readonly capturingHotkey: HotkeyTarget | null
  readonly status: RuntimeStatus
  readonly onPausePlayback: () => void
  readonly onPlay: () => void
  readonly onResumePlayback: () => void
  readonly onStartRecording: () => void
  readonly onStartRecordingAt: () => void
  readonly onStopPlayback: () => void
  readonly onStopRecording: () => void
}

type RequestTracker = {
  pause: number | null
  play: number | null
  punch: number | null
  record: number | null
}

export function useTimelineHotkeys(args: Args): void {
  const seenRequestRef = useRef<RequestTracker>({
    pause: null,
    play: null,
    punch: null,
    record: null,
  })

  useEffect(() => {
    runRequest(seenRequestRef.current, 'record', args.status.record_toggle_request_id, () =>
      toggleRecord(args),
    )
    runRequest(seenRequestRef.current, 'punch', args.status.punch_in_request_id, () =>
      togglePunch(args),
    )
    runRequest(seenRequestRef.current, 'play', args.status.play_toggle_request_id, () =>
      togglePlay(args),
    )
    runRequest(seenRequestRef.current, 'pause', args.status.pause_toggle_request_id, () =>
      togglePause(args),
    )
  }, [
    args,
    args.status.pause_toggle_request_id,
    args.status.play_toggle_request_id,
    args.status.punch_in_request_id,
    args.status.record_toggle_request_id,
  ])

  useEffect(() => {
    if (isTauriRuntime()) {
      return
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (args.capturingHotkey !== null || isEditableTarget(event.target)) {
        return
      }
      const keyName = keyboardEventToKeyName(event)
      if (isSameKey(keyName, args.status.hotkey)) {
        event.preventDefault()
        toggleRecord(args)
        return
      }
      if (isSameKey(keyName, args.status.punch_in_hotkey)) {
        event.preventDefault()
        togglePunch(args)
        return
      }
      if (isSameKey(keyName, args.status.play_hotkey)) {
        event.preventDefault()
        togglePlay(args)
        return
      }
      if (isSameKey(keyName, args.status.stop_hotkey)) {
        event.preventDefault()
        togglePause(args)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [args])
}

function runRequest(
  tracker: RequestTracker,
  key: keyof RequestTracker,
  requestId: number | null,
  action: () => void,
): void {
  if (requestId === null || tracker[key] === requestId) {
    return
  }
  tracker[key] = requestId
  action()
}

function toggleRecord(args: Args): void {
  if (args.status.is_recording) {
    args.onStopRecording()
    return
  }
  args.onStartRecording()
}

function togglePunch(args: Args): void {
  if (args.status.is_recording) {
    args.onStopRecording()
    return
  }
  args.onStartRecordingAt()
}

function togglePlay(args: Args): void {
  if (args.status.is_playing) {
    args.onStopPlayback()
    return
  }
  args.onPlay()
}

function togglePause(args: Args): void {
  if (!args.status.is_playing) {
    return
  }
  if (args.status.is_playback_paused) {
    args.onResumePlayback()
    return
  }
  args.onPausePlayback()
}

function isSameKey(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase()
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  )
}

function isTauriRuntime(): boolean {
  return '__TAURI_INTERNALS__' in window
}
