import { expect, test } from '@playwright/test'

test('renders macro workspace', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Auto Note' })).toBeVisible()
  await expect(page.getByText('max_drift_ns')).toBeVisible()
  await page.screenshot({ path: 'evidence/task-9-ui-desktop.png', fullPage: true })
})

test('mobile viewport remains usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Auto Note' })).toBeVisible()
  await page.screenshot({ path: 'evidence/task-9-ui-mobile.png', fullPage: true })
})

test('timeline uses selection-first interaction', async ({ page }) => {
  await page.goto('/')
  const payload = {
    schema_version: 2,
    id: 'e2e-session',
    name: 'E2E Session',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    keys: ['Q'],
    bpm: 180,
    offset_ms: 0,
    events: [
      { t_ns: 100_000_000, key: 'Q', action: 'press' },
      { t_ns: 900_000_000, key: 'Q', action: 'release' },
    ],
  }
  await page.getByRole('textbox').nth(1).fill(JSON.stringify(payload))
  await page.getByRole('button', { name: 'Import JSON' }).click()
  await expect(page.getByRole('button', { name: 'E2E Session', exact: true })).toBeVisible()
  const canvas = page.getByTestId('note-canvas')
  await canvas.click({ position: { x: 120, y: 20 } })
  await expect(page.getByTestId('record-cursor')).toContainText('100 ms')
  await expect(page.getByTestId('selection-status')).toContainText('1')
  await expect(page.getByLabel('Press ns')).toHaveValue('100000000')
  await page.getByLabel('Release ns').fill('950000000')
  await expect(page.getByTestId('record-cursor')).toContainText('950 ms')
  await canvas.click({ position: { x: 120, y: 20 } })
  await page.keyboard.press('ControlOrMeta+C')
  await page.keyboard.press('Delete')
  await expect(page.getByTestId('selection-status')).toContainText('0')
  await page.keyboard.press('ControlOrMeta+V')
  await expect(page.getByTestId('selection-status')).toContainText('1')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ControlOrMeta+X')
  await expect(page.getByTestId('selection-status')).toContainText('0')
  await page.keyboard.press('ControlOrMeta+V')
  await expect(page.getByTestId('selection-status')).toContainText('1')
  await canvas.click({ position: { x: 120, y: 160 }, modifiers: ['Alt'] })
  const altPressNs = Number(await page.getByLabel('Press ns').inputValue())
  const altReleaseNs = Number(await page.getByLabel('Release ns').inputValue())
  expect(altPressNs).toBeGreaterThan(1_270_000_000)
  expect(altPressNs).toBeLessThan(1_290_000_000)
  expect(altReleaseNs - altPressNs).toBe(120_000_000)
  await page.screenshot({ path: 'evidence/task-11-editor.png', fullPage: true })
})

test('sessions, hotkeys, and lane order are editable', async ({ page }) => {
  await page.goto('/')
  const payload = {
    schema_version: 2,
    id: 'lane-session',
    name: 'Lane Test',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    keys: ['D', 'K'],
    bpm: 180,
    offset_ms: 0,
    events: [
      { t_ns: 100_000_000, key: 'D', action: 'press' },
      { t_ns: 240_000_000, key: 'D', action: 'release' },
      { t_ns: 300_000_000, key: 'K', action: 'press' },
      { t_ns: 420_000_000, key: 'K', action: 'release' },
    ],
  }
  await page.getByRole('textbox').nth(1).fill(JSON.stringify(payload))
  await page.getByRole('button', { name: 'Import JSON' }).click()
  await expect(page.getByRole('button', { name: 'Lane Test', exact: true })).toBeVisible()

  const laneLabels = page.locator('.timeline-key-header .timeline-lane-pill span')
  await expect(laneLabels.first()).toHaveText('D')
  await page.getByRole('button', { name: 'Move D right' }).click()
  await expect(laneLabels.first()).toHaveText('K')
  await expect(laneLabels.nth(1)).toHaveText('D')

  const replayHotkey = page
    .locator('label')
    .filter({ hasText: 'Replay Hotkey' })
    .getByRole('button')
  await replayHotkey.click()
  await page.keyboard.press('F6')
  await expect(replayHotkey).toHaveText('F6')

  await page.getByRole('button', { name: 'Delete Lane Test' }).click()
  await expect(page.getByRole('button', { name: 'Lane Test', exact: true })).toHaveCount(0)
})
