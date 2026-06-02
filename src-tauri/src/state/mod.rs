use std::{collections::HashMap, sync::Mutex};

use serde::Serialize;
use tauri::AppHandle;

use crate::{
    adapters::GlobalInputListener,
    error::AppError,
    model::SessionEvent,
    persistence::Persistence,
    platform::{PlatformStatus, detect_platform_status},
    playback::PlaybackReport,
    recording::RecordingReducer,
    timing::now_ns,
};

mod hotkeys;
mod input;
mod playback;
use playback::{
    PlaybackRuntime, harvest_finished_playback, is_playback_paused, playback_cursor_ns,
};

use input::drain_listener;
mod recording;
mod sessions;

#[cfg(test)]
mod tests;

struct RuntimeState {
    recording: RecordingReducer,
    persistence: Persistence,
    listener: GlobalInputListener,
    playback: Option<PlaybackRuntime>,
    last_report: Option<PlaybackReport>,
    play_hotkey: String,
    punch_in_hotkey: String,
    play_toggle_request_id: Option<u64>,
    pause_toggle_request_id: Option<u64>,
    record_toggle_request_id: Option<u64>,
    punch_in_request_id: Option<u64>,
    stop_hotkey: String,
    last_play_session_id: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct RuntimeStatus {
    pub is_recording: bool,
    pub is_recording_paused: bool,
    pub is_playing: bool,
    pub is_playback_paused: bool,
    pub hotkey: String,
    pub play_hotkey: String,
    pub punch_in_hotkey: String,
    pub play_toggle_request_id: Option<u64>,
    pub pause_toggle_request_id: Option<u64>,
    pub record_toggle_request_id: Option<u64>,
    pub punch_in_request_id: Option<u64>,
    pub stop_hotkey: String,
    pub keys: HashMap<String, bool>,
    pub live_events: Vec<SessionEvent>,
    pub playback_cursor_ns: Option<u64>,
}

pub struct AppState {
    _app: AppHandle,
    inner: Mutex<RuntimeState>,
}

impl AppState {
    pub fn new(app: AppHandle) -> Result<Self, AppError> {
        let _ = now_ns();
        let persistence = Persistence::new()?;
        let state = RuntimeState {
            recording: RecordingReducer::new(),
            persistence,
            listener: GlobalInputListener::spawn(),
            playback: None,
            last_report: None,
            play_hotkey: "F9".to_string(),
            punch_in_hotkey: "F7".to_string(),
            play_toggle_request_id: None,
            pause_toggle_request_id: None,
            record_toggle_request_id: None,
            punch_in_request_id: None,
            stop_hotkey: "F8".to_string(),
            last_play_session_id: None,
        };
        Ok(Self {
            _app: app,
            inner: Mutex::new(state),
        })
    }

    pub fn get_status(&self) -> Result<RuntimeStatus, AppError> {
        let mut inner = self.lock_state()?;
        drain_listener(&mut inner)?;
        harvest_finished_playback(&mut inner)?;
        Ok(RuntimeStatus {
            is_recording: inner.recording.is_recording(),
            is_recording_paused: inner.recording.is_paused(),
            is_playing: inner.playback.is_some(),
            is_playback_paused: is_playback_paused(&inner),
            hotkey: inner.recording.hotkey().to_string(),
            play_hotkey: inner.play_hotkey.clone(),
            punch_in_hotkey: inner.punch_in_hotkey.clone(),
            play_toggle_request_id: inner.play_toggle_request_id,
            pause_toggle_request_id: inner.pause_toggle_request_id,
            record_toggle_request_id: inner.record_toggle_request_id,
            punch_in_request_id: inner.punch_in_request_id,
            stop_hotkey: inner.stop_hotkey.clone(),
            keys: inner.recording.key_states(),
            live_events: if inner.recording.is_recording() {
                inner.recording.live_events()
            } else {
                vec![]
            },
            playback_cursor_ns: playback_cursor_ns(&inner),
        })
    }

    pub fn timing_report(&self) -> Result<Option<PlaybackReport>, AppError> {
        let mut inner = self.lock_state()?;
        harvest_finished_playback(&mut inner)?;
        Ok(inner.last_report.clone())
    }

    pub fn platform_status(&self) -> PlatformStatus {
        detect_platform_status()
    }

    fn lock_state(&self) -> Result<std::sync::MutexGuard<'_, RuntimeState>, AppError> {
        self.inner
            .lock()
            .map_err(|_| AppError::State("state mutex poisoned".to_string()))
    }
}
