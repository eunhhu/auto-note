import type { Dispatch } from 'react'

import type { HotkeyTarget } from '@/features/hotkeys/hotkeyTargets'
import type { Action } from '@/store/appStore'
import type { TauriApi } from '@/tauri/tauriClient'

type Args = {
  readonly client: TauriApi
  readonly dispatch: Dispatch<Action>
  readonly target: HotkeyTarget
  readonly value: string
}

export async function applyHotkeyTarget(args: Args): Promise<void> {
  switch (args.target) {
    case 'record':
      args.dispatch({ type: 'set_hotkey', value: args.value })
      await args.client.setHotkey(args.value)
      return
    case 'punch_in':
      args.dispatch({ type: 'set_punch_in_hotkey', value: args.value })
      await args.client.setPunchInHotkey(args.value)
      return
    case 'play':
      args.dispatch({ type: 'set_play_hotkey', value: args.value })
      await args.client.setPlayHotkey(args.value)
      return
    case 'pause':
      args.dispatch({ type: 'set_stop_hotkey', value: args.value })
      await args.client.setStopHotkey(args.value)
      return
  }
}
