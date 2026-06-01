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
  await expect(page.getByRole('button', { name: 'E2E Session' })).toBeVisible()
  const canvas = page.getByTestId('note-canvas')
  await canvas.click({ position: { x: 168, y: 70 } })
  await expect(page.getByTestId('record-cursor')).toContainText('100 ms')
  await expect(page.getByTestId('selection-status')).toContainText('1')
  await expect(page.getByLabel('Press ns')).toHaveValue('100000000')
  await page.getByLabel('Release ns').fill('950000000')
  await expect(page.getByTestId('record-cursor')).toContainText('950 ms')
  await canvas.click({ position: { x: 168, y: 70 } })
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
  await page.screenshot({ path: 'evidence/task-11-editor.png', fullPage: true })
})
