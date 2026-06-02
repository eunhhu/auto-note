import type { RuntimeStatus } from '@/lib/types'

export function shouldShowOverlay(status: RuntimeStatus): boolean {
  return status.is_playing || status.is_recording
}
