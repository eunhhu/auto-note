use std::{
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    thread::JoinHandle,
};

use crate::{
    adapters::EnigoPlaybackSink,
    error::AppError,
    model::Session,
    playback::{PlaybackClock, PlaybackReport, play_session},
    timing::now_ns,
};

use super::RuntimeState;

pub(super) struct SystemClock;

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

pub(super) struct PlaybackRuntime {
    pub(super) cancel: Arc<AtomicBool>,
    pub(super) handle: JoinHandle<Result<PlaybackReport, AppError>>,
    pub(super) started_at_ns: u64,
    pub(super) duration_ns: u64,
}

pub(super) fn start_playback_inner(
    inner: &mut RuntimeState,
    session_id: String,
) -> Result<(), AppError> {
    if inner.playback.is_some() {
        return Err(AppError::State("playback already active".to_string()));
    }
    let session = inner.persistence.load_session(&session_id)?;
    if session.events.is_empty() {
        return Err(AppError::Playback("No recorded events to play".to_string()));
    }
    let duration_ns = session_duration_ns(&session);
    let started_at_ns = now_ns();
    let cancel = Arc::new(AtomicBool::new(false));
    let cancel_for_thread = Arc::clone(&cancel);
    let handle = std::thread::spawn(move || {
        let mut sink = EnigoPlaybackSink::new()?;
        let mut clock = SystemClock;
        play_session(&session, &cancel_for_thread, &mut clock, &mut sink)
    });
    inner.playback = Some(PlaybackRuntime {
        cancel,
        handle,
        started_at_ns,
        duration_ns,
    });
    inner.last_play_session_id = Some(session_id);
    Ok(())
}

pub(super) fn stop_playback_inner(inner: &mut RuntimeState) -> Result<(), AppError> {
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

pub(super) fn playback_cursor_ns(inner: &RuntimeState) -> Option<u64> {
    inner.playback.as_ref().map(|runtime| {
        let elapsed = now_ns().saturating_sub(runtime.started_at_ns);
        elapsed.min(runtime.duration_ns)
    })
}

pub(super) fn harvest_finished_playback(inner: &mut RuntimeState) -> Result<(), AppError> {
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

fn session_duration_ns(session: &Session) -> u64 {
    session
        .events
        .iter()
        .map(|event| event.t_ns)
        .max()
        .unwrap_or(0)
}
