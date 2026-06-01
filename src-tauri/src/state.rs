use std::{
    collections::HashMap,
    sync::Mutex,
};

use serde::Serialize;
use tauri::AppHandle;

use crate::{
    adapters::GlobalInputListener,
    error::AppError,
    model::{KeyAction, Session, SessionEvent},
    persistence::Persistence,
    platform::{PlatformStatus, detect_platform_status},
    playback::PlaybackReport,
    recording::RecordingReducer,
    timing::{ms_to_ns, now_ns},
};

#[path = "state_playback.rs"]
mod state_playback;
use state_playback::{
    PlaybackRuntime, harvest_finished_playback, playback_cursor_ns, start_playback_inner,
    stop_playback_inner,
};

#[cfg(test)]
#[path = "state_tests.rs"]
mod tests;

struct RuntimeState {
    recording: RecordingReducer,
    persistence: Persistence,
    listener: GlobalInputListener,
    playback: Option<PlaybackRuntime>,
    last_report: Option<PlaybackReport>,
    play_hotkey: String,
    stop_hotkey: String,
    last_play_session_id: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct RuntimeStatus {
    pub is_recording: bool,
    pub is_playing: bool,
    pub hotkey: String,
    pub play_hotkey: String,
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
            stop_hotkey: "F8".to_string(),
            last_play_session_id: None,
        };
        Ok(Self {
            _app: app,
            inner: Mutex::new(state),
        })
    }

    pub fn start_recording(&self) -> Result<(), AppError> {
        let mut inner = self.lock_state()?;
        inner.recording.start(now_ns())
    }

    pub fn start_recording_at(&self, offset_ms: u64) -> Result<(), AppError> {
        let mut inner = self.lock_state()?;
        inner.recording.start_at(now_ns(), ms_to_ns(offset_ms))
    }

    pub fn stop_recording(
        &self,
        name: String,
        bpm: f64,
        offset_ms: i64,
    ) -> Result<Session, AppError> {
        let mut inner = self.lock_state()?;
        stop_recording_inner(&mut inner, name, bpm, offset_ms)
    }

    pub fn play_session(&self, session_id: String) -> Result<(), AppError> {
        let mut inner = self.lock_state()?;
        start_playback_inner(&mut inner, session_id)
    }

    pub fn stop_playback(&self) -> Result<(), AppError> {
        let mut inner = self.lock_state()?;
        stop_playback_inner(&mut inner)
    }

    pub fn get_status(&self) -> Result<RuntimeStatus, AppError> {
        let mut inner = self.lock_state()?;
        drain_listener(&mut inner)?;
        harvest_finished_playback(&mut inner)?;
        Ok(RuntimeStatus {
            is_recording: inner.recording.is_recording(),
            is_playing: inner.playback.is_some(),
            hotkey: inner.recording.hotkey().to_string(),
            play_hotkey: inner.play_hotkey.clone(),
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

    pub fn set_hotkey(&self, hotkey: String) -> Result<(), AppError> {
        let mut inner = self.lock_state()?;
        inner.recording.set_hotkey(hotkey)
    }

    pub fn set_play_hotkey(&self, hotkey: String) -> Result<(), AppError> {
        let mut inner = self.lock_state()?;
        validate_hotkey(&hotkey)?;
        inner.play_hotkey = hotkey;
        Ok(())
    }

    pub fn set_stop_hotkey(&self, hotkey: String) -> Result<(), AppError> {
        let mut inner = self.lock_state()?;
        validate_hotkey(&hotkey)?;
        inner.stop_hotkey = hotkey;
        Ok(())
    }

    pub fn list_sessions(&self) -> Result<Vec<String>, AppError> {
        let inner = self.lock_state()?;
        inner.persistence.list_sessions()
    }

    pub fn load_session(&self, id: String) -> Result<Session, AppError> {
        let inner = self.lock_state()?;
        inner.persistence.load_session(&id)
    }

    pub fn save_session(&self, session: Session) -> Result<(), AppError> {
        let inner = self.lock_state()?;
        inner.persistence.save_session(&session)
    }

    pub fn delete_session(&self, id: String) -> Result<(), AppError> {
        let mut inner = self.lock_state()?;
        if inner.last_play_session_id.as_deref() == Some(id.as_str()) {
            inner.last_play_session_id = None;
        }
        inner.persistence.delete_session(&id)
    }

    pub fn import_session_json(&self, payload: String) -> Result<Session, AppError> {
        let inner = self.lock_state()?;
        inner.persistence.import_session_json(&payload)
    }

    pub fn export_session_json(&self, session_id: String) -> Result<String, AppError> {
        let inner = self.lock_state()?;
        inner.persistence.export_session_json(&session_id)
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

fn drain_listener(inner: &mut RuntimeState) -> Result<(), AppError> {
    let record_hotkey = inner.recording.hotkey().to_string();
    let play_hotkey = inner.play_hotkey.clone();
    let stop_hotkey = inner.stop_hotkey.clone();
    for event in inner.listener.try_recv_all() {
        let key = event.key.as_str();
        let is_press = matches!(event.action, KeyAction::Press);
        if key.eq_ignore_ascii_case(&record_hotkey) {
            if is_press {
                if inner.recording.is_recording() {
                    let events = inner.recording.stop()?;
                    if !events.is_empty() {
                        let session = Session::new("Quick Capture".to_string(), 180.0, 0, events);
                        inner.persistence.save_session(&session)?;
                    }
                } else {
                    inner.recording.start(event.when_ns)?;
                }
            }
            continue;
        }
        if key.eq_ignore_ascii_case(&stop_hotkey) {
            if is_press {
                stop_playback_inner(inner)?;
            }
            continue;
        }
        if key.eq_ignore_ascii_case(&play_hotkey) {
            if is_press
                && inner.playback.is_none()
                && let Some(session_id) = inner.last_play_session_id.clone()
            {
                start_playback_inner(inner, session_id)?;
            }
            continue;
        }
        inner
            .recording
            .on_key_event(event.when_ns, event.key, event.action);
    }
    Ok(())
}

fn stop_recording_inner(
    inner: &mut RuntimeState,
    name: String,
    bpm: f64,
    offset_ms: i64,
) -> Result<Session, AppError> {
    drain_listener(inner)?;
    let events = inner.recording.stop()?;
    let session = Session::new(name, bpm, offset_ms, events);
    session.validate()?;
    inner.persistence.save_session(&session)?;
    Ok(session)
}

fn validate_hotkey(hotkey: &str) -> Result<(), AppError> {
    if hotkey.trim().is_empty() {
        return Err(AppError::Validation("hotkey cannot be empty".to_string()));
    }
    Ok(())
}
