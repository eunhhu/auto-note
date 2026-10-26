# Auto Note

A Tauri 2 desktop macro for rhythm games: record your own key press/release timings with a global hotkey, edit them on a BPM-grid note canvas, and replay them with synthetic input.

**Status:** Prototype / unfinished — recording, playback, session persistence, and the canvas editor exist and are tested, but the PRD goals (sub-millisecond replay accuracy, polished multi-session diff view, reliable global capture on every platform) are not fully met; macOS needs Accessibility permission and Wayland may block global hooks entirely.

## Features

- Global key recording for the `S / D / J / K` lanes, started and stopped with a configurable hotkey (`F10` by default); separate play, punch-in, and stop hotkeys
- Record-from-cursor: start a new take from the middle of an existing timing map
- Playback scheduler that replays a session through `enigo` and produces a timing report
- JSON session save / load / import / export with quarantine of corrupt files
- Local settings persistence (`bpm`, `offset_ms`, hotkeys)
- Canvas note editor on a BPM grid: hold-cell painting, multi-select, move, delete, copy, paste, cut, grid-snap toggle, zoom
- Overlay of several sessions as colored cells for visual diffing
- Platform status panel with OS-specific guidance (macOS Accessibility, Windows, Linux X11/Wayland)

## How it works

- `src-tauri/` is the Rust backend. `recording.rs` captures global key events via `keytap`, `playback.rs` schedules replays through `enigo`, `timing.rs` provides the clock, `persistence.rs` stores sessions as JSON, and `state/` holds the runtime state machines (`recording`, `playback`, `hotkeys`, `input`, `sessions`). `commands.rs` exposes everything as Tauri commands (`start_recording`, `play_session`, `set_hotkey`, `save_session`, `timing_report`, `platform_status`, …).
- `src/tauri/tauriClient.ts` wraps those commands; `src/store/appStore.ts` is the React state; `src/pages/workspace/` holds the workspace controller and action modules; `src/features/timeline-editor/` implements the note canvas (model, painter, interaction, selection); `src/features/overlay/` and `src/features/recording/` cover overlay rendering and recording sessions.
- Session schemas are validated with Zod (`src/lib/session/sessionSchema.ts`).

## Tech stack

- Backend: Rust 2024, Tauri 2.9 (`macos-private-api`), `keytap` (global key capture), `enigo` (synthetic input), `serde`/`serde_json`, `chrono`, `uuid`, `dirs`
- Frontend: React 19, TypeScript 6, Vite 8, Zod 4, lucide-react
- Testing: `cargo test` (unit tests next to each module), Vitest + Testing Library, Playwright (`tests/e2e/ui.spec.ts`)
- CI: GitHub Actions release workflow builds Windows and macOS (universal) bundles on `v*` tags

## Getting started

### Requirements

- Bun 1.3+
- Rust toolchain and the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS
- macOS: grant Accessibility permission to the app (and to your terminal during development)
- Linux: X11 session recommended; Wayland compositors may block global capture or synthetic input

### Install

```bash
bun install
```

### Run

```bash
bun run tauri dev                    # desktop app with hot reload
bun run dev                          # frontend only (no native commands)
bun run build                        # tsc -b && vite build
bun run tauri build                  # production bundle (add --debug for a debug bundle)
bun run typecheck
bun run test:unit -- --run
bun run test:e2e -- --project=chromium
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

`scripts/qa/run_checks.sh` runs the unit and e2e suites and writes evidence files (it expects the `rtk` wrapper on `PATH`).

Pre-built Windows and macOS bundles are attached to [GitHub Releases](https://github.com/eunhhu/auto-note/releases).

## Project structure

```text
src-tauri/src/
  lib.rs, main.rs       Tauri setup and command registration
  commands.rs           Tauri command surface
  recording.rs          global key capture (keytap)
  playback.rs           replay scheduler (enigo) and timing report
  timing.rs, model.rs   clock and session/event types
  persistence.rs        JSON session storage and quarantine
  keymap/               key code mapping for keytap / enigo / macOS
  state/                recording, playback, hotkey, input, session state
  platform.rs           per-OS capability guidance
src/
  app/                  App root
  pages/workspace/      workspace page, controller hook, actions
  features/             timeline-editor, recording, overlay, hotkeys
  components/           control panel, status bars
  lib/                  timeline math, session schema, error helpers
  store/appStore.ts     client state
  tauri/tauriClient.ts  command wrapper
tests/                  Playwright e2e + packaging test
fixtures/               sample session JSON
PRD.md                  original product requirements (Korean)
.github/workflows/release.yml  tag-triggered desktop builds
```

## Configuration

- `AUTO_NOTE_DATA_DIR` — overrides the backend session directory. Default: `<platform data dir>/auto-note/sessions`.
- Hotkeys, BPM, and offset are set in the app and persisted in the webview's `localStorage` (`src/store/appStore.ts`).

## License

[MIT](LICENSE).
