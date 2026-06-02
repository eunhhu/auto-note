/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('Windows packaging', () => {
  it('does not open a console window in installed release builds', () => {
    const main = readFileSync(resolve('src-tauri/src/main.rs'), 'utf8')
    expect(main).toContain('windows_subsystem = "windows"')
    expect(main).toContain('not(debug_assertions)')
  })
})
