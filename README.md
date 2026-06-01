# Auto Note

Tauri v2 + React + Rust macro app for rhythm-game timing capture and replay.

## Features

- Global key recording reducer for `S/D/J/K` with configurable record hotkey (`F10` default)
- Playback scheduler core with deterministic timing report
- JSON session save/load/import/export and corrupt JSON quarantine
- Local settings persistence (`bpm`, `offset_ms`, `hotkey`)
- Canvas BPM grid editor with hold-cell fill, multi-select, delete, move, copy, paste, and cut
- Record-from-cursor support for starting a new take from the middle of a timing map
- Multi-session overlay cells for visual diff comparison
- Cross-platform status guidance for macOS/Windows/Linux

## Commands

- `bun install`
- `bun run dev`
- `bun run build`
- `bun run preview`
- `bun run typecheck`
- `bun run test:unit -- --run`
- `bun run test:e2e -- --project=chromium`
- `bun run tauri -- build --debug`

## Rust checks

- `rtk cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- `rtk cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
- `rtk cargo test --manifest-path src-tauri/Cargo.toml`

## Data location

- `AUTO_NOTE_DATA_DIR` overrides the backend session data directory.
- Default session path: `<platform data dir>/auto-note/sessions`
