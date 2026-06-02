import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import App from '@/app/App'

afterEach(() => {
  cleanup()
})

describe('App UI', () => {
  it('shows bpm validation error', async () => {
    render(<App />)
    const bpmInput = await screen.findByLabelText('BPM')
    fireEvent.change(bpmInput, { target: { value: '0' } })
    expect(await screen.findByText('BPM must be greater than 0')).toBeTruthy()
  })

  it('shows empty playback error for a session without events', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /^Record$/ }))
    expect((screen.getByRole('button', { name: 'Pause' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(await screen.findByRole('button', { name: 'Stop Recording' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New Session' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(await screen.findByText('No recorded events to play')).toBeTruthy()
  })
})
