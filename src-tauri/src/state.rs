use std::{
    collections::HashMap,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
    thread::JoinHandle,
};

use serde::Serialize;
use tauri::AppHandle;

use crate::{
    adapters::{EnigoPlaybackSink, GlobalInputListener},
    error::AppError,
    model::{KeyAction, Session},
    persistence::Persistence,
    platform::{PlatformStatus, detect_platform_status},
    playback::{PlaybackClock, PlaybackReport, play_session},
    recording::RecordingReducer,
    timing::{ms_to_ns, now_ns},
};

#[cfg(test)]
#[path = "state_tests.rs"]
mod tests;

struct SystemClock;

impl PlaybackClock for SystemClock {
    fn now_ns(&self) -> u64 {
        now_ns()
    }

    fn sleep_until_ns(&mut self, target_ns: u64) {
        loop {
            let current = now_ns();
            if current >= target_ns {
                break;
            }
            let wait_ns = target_ns - current;
            if wait_ns > 2_000_000 {
                std::thread::sleep(std::time::Duration::from_millis(1));
            } else if wait_ns > 150_000 {
                std::thread::sleep(std::time::Duration::from_micros(50));
            } else {
                std::hint::spin_loop();
            }
        }
    }
}

struct PlaybackRuntime {
    cancel: Arc<AtomicBool>,
    handle: JoinHandle<Result<PlaybackReport, AppError>>,
}

struct RuntimeState {
    recording: RecordingReducer,
    persistence: Persistence,
    listener: GlobalInputListener,
    playback: Option<PlaybackRuntime>,
    last_report: Option<PlaybackReport>,
}

#[derive(Debug, Serialize, Clone)]
pub struct RuntimeStatus {
    pub is_recording: bool,
    pub is_playing: bool,
    pub hotkey: String,
    pub keys: HashMap<String, bool>,
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
        if inner.playback.is_some() {
            return Err(AppError::State("playback already active".to_string()));
        }
        let session = inner.persistence.load_session(&session_id)?;
        let cancel = Arc::new(AtomicBool::new(false));
        let cancel_for_thread = Arc::clone(&cancel);
        let handle = std::thread::spawn(move || {
            let mut sink = EnigoPlaybackSink::new()?;
            let mut clock = SystemClock;
            play_session(&session, &cancel_for_thread, &mut clock, &mut sink)
        });
        inner.playback = Some(PlaybackRuntime { cancel, handle });
        Ok(())
    }

    pub fn stop_playback(&self) -> Result<(), AppError> {
        let mut inner = self.lock_state()?;
        if let Some(runtime) = inner.playback.take() {
            runtime.cancel.store(true, Ordering::Relaxed);
            let report = runtime
                .handle
                .join()
                .map_err(|_| AppError::Playback("playback thread panicked".to_string()))??;
            inner.last_report = Some(report);
        }
        Ok(())
    }

    pub fn get_status(&self) -> Result<RuntimeStatus, AppError> {
        let mut inner = self.lock_state()?;
        drain_listener(&mut inner)?;
        harvest_finished_playback(&mut inner)?;
        Ok(RuntimeStatus {
            is_recording: inner.recording.is_recording(),
            is_playing: inner.playback.is_some(),
            hotkey: inner.recording.hotkey().to_string(),
            keys: inner.recording.key_states(),
        })
    }

    pub fn set_hotkey(&self, hotkey: String) -> Result<(), AppError> {
        let mut inner = self.lock_state()?;
        inner.recording.set_hotkey(hotkey)
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
    let hotkey = inner.recording.hotkey().to_string();
    for event in inner.listener.try_recv_all() {
        let is_hotkey = event.key.as_str().eq_ignore_ascii_case(&hotkey);
        if is_hotkey {
            if matches!(event.action, KeyAction::Press) {
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

fn harvest_finished_playback(inner: &mut RuntimeState) -> Result<(), AppError> {
    let should_join = inner
        .playback
        .as_ref()
        .is_some_and(|runtime| runtime.handle.is_finished());

    if should_join && let Some(runtime) = inner.playback.take() {
        let report = runtime
            .handle
            .join()
            .map_err(|_| AppError::Playback("playback thread panicked".to_string()))??;
        inner.last_report = Some(report);
    }
    Ok(())
}
