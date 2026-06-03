import type { TimelineSaveStatus } from '@/store/appStore'

export function timelineSaveStatusText(status: TimelineSaveStatus): string {
  switch (status.kind) {
    case 'saved':
      return 'Saved'
    case 'dirty':
      return 'Unsaved changes'
    case 'saving':
      return 'Saving...'
    case 'error':
      return `Save failed: ${status.message}`
    default:
      return status satisfies never
  }
}
