use crate::{
    error::AppError,
    model::Session,
    timing::{ms_to_ns, now_ns},
};

use super::{AppState, RuntimeState, drain_listener};

impl AppState {
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

    pub fn pause_recording(&self) -> Result<(), AppError> {
        let mut inner = self.lock_state()?;
        drain_listener(&mut inner)?;
        inner.recording.pause(now_ns())
    }

    pub fn resume_recording(&self) -> Result<(), AppError> {
        let mut inner = self.lock_state()?;
        drain_listener(&mut inner)?;
        inner.recording.resume(now_ns())
    }
}

pub(super) fn stop_recording_inner(
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
