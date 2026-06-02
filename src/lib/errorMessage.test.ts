import { describe, expect, it } from 'vitest'

import { errorMessage } from '@/lib/errorMessage'

describe('errorMessage', () => {
  it('uses Tauri command error messages', () => {
    expect(errorMessage({ code: 'playback_error', message: 'playback error: denied' })).toBe(
      'playback error: denied',
    )
  })
})
