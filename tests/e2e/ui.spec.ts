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
  const bodyOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
  expect(bodyOverflow).toBe(false)
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
  const initialInspectorHeight = await page
    .getByTestId('note-inspector')
    .evaluate((element) => element.getBoundingClientRect().height)
  const canvas = page.getByTestId('note-canvas')
  await canvas.click({ position: { x: 120, y: 20 } })
  await expect(page.getByTestId('record-cursor')).toContainText('100 ms')
  await expect(page.getByTestId('selection-status')).toContainText('1')
  const selectedInspectorHeight = await page
    .getByTestId('note-inspector')
    .evaluate((element) => element.getBoundingClientRect().height)
  expect(selectedInspectorHeight).toBe(initialInspectorHeight)
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

test('replay saves manual timeline edits before playing', async ({ page }) => {
  await page.goto('/')
  const payload = {
    schema_version: 2,
    id: 'manual-save-session',
    name: 'Manual Save',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    keys: ['M'],
    bpm: 180,
    offset_ms: 0,
    events: [
      { t_ns: 100_000_000, key: 'M', action: 'press' },
      { t_ns: 900_000_000, key: 'M', action: 'release' },
    ],
  }
  await page.getByRole('textbox').nth(1).fill(JSON.stringify(payload))
  await page.getByRole('button', { name: 'Import JSON' }).click()
  await expect(page.getByTestId('timeline-save-status')).toContainText('Timeline: Saved')

  await page.getByTestId('note-canvas').click({ position: { x: 120, y: 20 } })
  await page.getByLabel('Release ns').fill('950000000')
  await expect(page.getByTestId('timeline-save-status')).toContainText('Unsaved changes')

  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByText('Playing: ON')).toBeVisible()
  await expect(page.getByTestId('timeline-save-status')).toContainText('Timeline: Saved')
  await page.getByRole('button', { name: 'Stop Replay', exact: true }).click()

  await page.getByRole('button', { name: 'Export Selected' }).click()
  await expect(page.getByRole('textbox').nth(2)).toContainText('"t_ns": 950000000')
})

test('replay can pause, resume, and stop without stale UI', async ({ page }) => {
  await page.goto('/')
  const payload = {
    schema_version: 2,
    id: 'replay-session',
    name: 'Replay Pause',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    keys: ['R'],
    bpm: 180,
    offset_ms: 0,
    events: [
      { t_ns: 100_000_000, key: 'R', action: 'press' },
      { t_ns: 300_000_000, key: 'R', action: 'release' },
    ],
  }
  await page.getByRole('textbox').nth(1).fill(JSON.stringify(payload))
  await page.getByRole('button', { name: 'Import JSON' }).click()

  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByText('Playing: ON')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Stop Replay', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.getByText('Playing: PAUSED')).toBeVisible()
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await expect(page.getByText('Playing: ON')).toBeVisible()
  await page.getByRole('button', { name: 'Stop Replay', exact: true }).click()
  await expect(page.getByText('Playing: OFF')).toBeVisible()
})

test('timeline grid snap toggle quantizes alt-click note creation', async ({ page }) => {
  await page.goto('/')
  const payload = {
    schema_version: 2,
    id: 'snap-session',
    name: 'Snap Session',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    keys: ['Q'],
    bpm: 180,
    offset_ms: 0,
    events: [
      { t_ns: 100_000_000, key: 'Q', action: 'press' },
      { t_ns: 300_000_000, key: 'Q', action: 'release' },
    ],
  }
  await page.getByRole('textbox').nth(1).fill(JSON.stringify(payload))
  await page.getByRole('button', { name: 'Import JSON' }).click()
  await page.getByRole('button', { name: 'Enable grid snap' }).click()
  await expect(page.getByRole('button', { name: 'Disable grid snap' })).toBeVisible()

  await page.getByTestId('note-canvas').click({ position: { x: 120, y: 160 }, modifiers: ['Alt'] })

  await expect(page.getByLabel('Press ns')).toHaveValue('1249999995')
  await expect(page.getByLabel('Release ns')).toHaveValue('1369999995')
})

test('timeline paints the bottom edge after scrolling long canvases', async ({ page }) => {
  await page.goto('/')
  const payload = {
    schema_version: 2,
    id: 'bottom-paint-session',
    name: 'Bottom Paint',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    keys: ['B'],
    bpm: 180,
    offset_ms: 0,
    events: [
      { t_ns: 59_700_000_000, key: 'B', action: 'press' },
      { t_ns: 60_000_000_000, key: 'B', action: 'release' },
    ],
  }
  await page.getByRole('textbox').nth(1).fill(JSON.stringify(payload))
  await page.getByRole('button', { name: 'Import JSON' }).click()
  await page.waitForFunction(() => {
    const scroller = document.querySelector<HTMLElement>('.timeline-scroll')
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="note-canvas"]')
    return Boolean(scroller && canvas && canvas.offsetHeight > scroller.clientHeight * 2)
  })
  await page.locator('.timeline-scroll').evaluate((element) => {
    element.scrollTop = element.scrollHeight
    element.dispatchEvent(new Event('scroll'))
  })

  await page.waitForFunction(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="note-canvas"]')
    const context = canvas?.getContext('2d')
    if (!canvas || !context) {
      return false
    }
    const pixel = context.getImageData(Math.floor(canvas.width * 0.75), canvas.height - 2, 1, 1).data
    return (pixel[3] ?? 0) > 0
  })
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

  const pauseHotkey = page
    .locator('label')
    .filter({ hasText: 'Pause / Resume Hotkey' })
    .getByRole('button')
  await pauseHotkey.click()
  await page.keyboard.press('F4')
  await expect(pauseHotkey).toHaveText('F4')

  const punchHotkey = page
    .locator('label')
    .filter({ hasText: 'Punch In Hotkey' })
    .getByRole('button')
  await punchHotkey.click()
  await page.keyboard.press('F5')
  await expect(punchHotkey).toHaveText('F5')

  await page.keyboard.press('F5')
  await expect(page.getByText('Recording: ON')).toBeVisible()
  await page.keyboard.press('F5')
  await expect(page.getByText('Recording: OFF')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lane Test', exact: true })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'New Session', exact: true })).toHaveCount(1)

  await expect(page.getByText('Diff: ON')).toBeVisible()
  await page.getByRole('button', { name: 'Hide ghost notes' }).click()
  await expect(page.getByText('Diff: hidden')).toBeVisible()

  await page.getByRole('button', { name: 'Lane Test', exact: true }).click()
  await page.getByRole('button', { name: 'Delete lane D' }).click()
  await expect(laneLabels.filter({ hasText: 'D' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Delete Lane Test' }).click()
  await expect(page.getByRole('button', { name: 'Lane Test', exact: true })).toHaveCount(0)
})
