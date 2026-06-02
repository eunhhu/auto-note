use std::{
    collections::HashSet,
    sync::atomic::{AtomicBool, AtomicU64, Ordering},
};

use serde::Serialize;

use crate::{
    error::AppError,
    model::{KeyAction, RecordedKey, Session},
};

pub trait PlaybackClock: Send {
    fn now_ns(&self) -> u64;
    fn sleep_until_ns(&mut self, target_ns: u64);
}

pub trait PlaybackSink: Send {
    fn key_press(&mut self, key: &RecordedKey) -> Result<(), AppError>;
    fn key_release(&mut self, key: &RecordedKey) -> Result<(), AppError>;
}

#[derive(Debug)]
pub struct PlaybackControl {
    cancel: AtomicBool,
    paused: AtomicBool,
    pause_started_ns: AtomicU64,
    paused_total_ns: AtomicU64,
}

impl PlaybackControl {
    pub fn new() -> Self {
        Self {
            cancel: AtomicBool::new(false),
            paused: AtomicBool::new(false),
            pause_started_ns: AtomicU64::new(0),
            paused_total_ns: AtomicU64::new(0),
        }
    }

    pub fn cancel(&self) {
        self.cancel.store(true, Ordering::Release);
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancel.load(Ordering::Acquire)
    }

    pub fn is_paused(&self) -> bool {
        self.paused.load(Ordering::Acquire)
    }

    pub fn pause_at(&self, now_ns: u64) {
        if !self.paused.swap(true, Ordering::AcqRel) {
            self.pause_started_ns.store(now_ns, Ordering::Release);
        }
    }

    pub fn resume_at(&self, now_ns: u64) {
        if self.paused.swap(false, Ordering::AcqRel) {
            let started = self.pause_started_ns.swap(0, Ordering::AcqRel);
            self.paused_total_ns
                .fetch_add(now_ns.saturating_sub(started), Ordering::AcqRel);
        }
    }

    pub fn elapsed_since(&self, started_at_ns: u64, now_ns: u64) -> u64 {
        now_ns
            .saturating_sub(started_at_ns)
            .saturating_sub(self.paused_total_at(now_ns))
    }

    fn paused_total_at(&self, now_ns: u64) -> u64 {
        let total = self.paused_total_ns.load(Ordering::Acquire);
        if !self.is_paused() {
            return total;
        }
        total.saturating_add(now_ns.saturating_sub(self.pause_started_ns.load(Ordering::Acquire)))
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct PlaybackReport {
    pub max_drift_ns: u64,
    pub emitted_events: usize,
    pub cancelled: bool,
}

pub fn play_session(
    session: &Session,
    control: &PlaybackControl,
    clock: &mut dyn PlaybackClock,
    sink: &mut dyn PlaybackSink,
) -> Result<PlaybackReport, AppError> {
    session.validate()?;
    if session.events.is_empty() {
        return Err(AppError::Playback("No recorded events to play".to_string()));
    }
    let start = clock.now_ns();
    let mut max_drift_ns = 0_u64;
    let mut held = HashSet::<RecordedKey>::new();
    let mut emitted_events = 0_usize;

    for event in &session.events {
        if control.is_cancelled() {
            release_held(&held, sink)?;
            return Ok(PlaybackReport {
                max_drift_ns,
                emitted_events,
                cancelled: true,
            });
        }

        if !wait_until_event_time(control, clock, start, event.t_ns) {
            release_held(&held, sink)?;
            return Ok(PlaybackReport {
                max_drift_ns,
                emitted_events,
                cancelled: true,
            });
        }
        let now = clock.now_ns();
        let target = playback_target_ns(control, start, event.t_ns, now);
        let drift = now.abs_diff(target);
        max_drift_ns = max_drift_ns.max(drift);

        match event.action {
            KeyAction::Press => {
                sink.key_press(&event.key)?;
                held.insert(event.key.clone());
            }
            KeyAction::Release => {
                sink.key_release(&event.key)?;
                held.remove(&event.key);
            }
        }
        emitted_events += 1;
    }

    release_held(&held, sink)?;
    Ok(PlaybackReport {
        max_drift_ns,
        emitted_events,
        cancelled: false,
    })
}

fn wait_until_event_time(
    control: &PlaybackControl,
    clock: &mut dyn PlaybackClock,
    start_ns: u64,
    event_ns: u64,
) -> bool {
    loop {
        if control.is_cancelled() {
            return false;
        }
        let now = clock.now_ns();
        if control.is_paused() {
            clock.sleep_until_ns(now.saturating_add(1_000_000));
            continue;
        }
        let target = playback_target_ns(control, start_ns, event_ns, now);
        if now >= target {
            return true;
        }
        let wait_ns = target - now;
        clock.sleep_until_ns(now.saturating_add(wait_ns.min(1_000_000)));
    }
}

fn playback_target_ns(control: &PlaybackControl, start_ns: u64, event_ns: u64, now_ns: u64) -> u64 {
    start_ns
        .saturating_add(event_ns)
        .saturating_add(control.paused_total_at(now_ns))
}

fn release_held(held: &HashSet<RecordedKey>, sink: &mut dyn PlaybackSink) -> Result<(), AppError> {
    for key in held {
        sink.key_release(key)?;
    }
    Ok(())
}

#[cfg(test)]
#[path = "playback_tests.rs"]
mod tests;
