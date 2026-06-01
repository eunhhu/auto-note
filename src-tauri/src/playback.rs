use std::{
    collections::HashSet,
    sync::atomic::{AtomicBool, Ordering},
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

#[derive(Debug, Clone, Serialize)]
pub struct PlaybackReport {
    pub max_drift_ns: u64,
    pub emitted_events: usize,
    pub cancelled: bool,
}

pub fn play_session(
    session: &Session,
    cancel: &AtomicBool,
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
        if cancel.load(Ordering::Relaxed) {
            release_held(&held, sink)?;
            return Ok(PlaybackReport {
                max_drift_ns,
                emitted_events,
                cancelled: true,
            });
        }

        let target = start.saturating_add(event.t_ns);
        clock.sleep_until_ns(target);
        let now = clock.now_ns();
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

fn release_held(held: &HashSet<RecordedKey>, sink: &mut dyn PlaybackSink) -> Result<(), AppError> {
    for key in held {
        sink.key_release(key)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::AtomicBool;

    use crate::model::{KeyAction, RecordedKey, Session, SessionEvent};

    use super::{AppError, PlaybackClock, PlaybackSink, play_session};

    struct FakeClock {
        now: u64,
    }

    impl PlaybackClock for FakeClock {
        fn now_ns(&self) -> u64 {
            self.now
        }

        fn sleep_until_ns(&mut self, target_ns: u64) {
            self.now = target_ns;
        }
    }

    struct FakeSink {
        events: Vec<(RecordedKey, KeyAction)>,
    }

    impl PlaybackSink for FakeSink {
        fn key_press(&mut self, key: &RecordedKey) -> Result<(), AppError> {
            self.events.push((key.clone(), KeyAction::Press));
            Ok(())
        }

        fn key_release(&mut self, key: &RecordedKey) -> Result<(), AppError> {
            self.events.push((key.clone(), KeyAction::Release));
            Ok(())
        }
    }

    fn key(name: &str) -> RecordedKey {
        RecordedKey::new(name).expect("valid key")
    }

    fn sample_session() -> Session {
        Session::new(
            "sample".to_string(),
            150.0,
            0,
            vec![
                SessionEvent {
                    t_ns: 10,
                    key: key("S"),
                    action: KeyAction::Press,
                },
                SessionEvent {
                    t_ns: 20,
                    key: key("S"),
                    action: KeyAction::Release,
                },
            ],
        )
    }

    #[test]
    fn empty_session_is_not_playable() {
        let session = Session::new("sample".to_string(), 150.0, 0, vec![]);
        let cancel = AtomicBool::new(false);
        let mut clock = FakeClock { now: 0 };
        let mut sink = FakeSink { events: vec![] };
        let result = play_session(&session, &cancel, &mut clock, &mut sink);
        assert!(result.is_err());
    }

    #[test]
    fn deterministic_playback_has_low_drift() {
        let session = sample_session();
        let cancel = AtomicBool::new(false);
        let mut clock = FakeClock { now: 0 };
        let mut sink = FakeSink { events: vec![] };
        let report =
            play_session(&session, &cancel, &mut clock, &mut sink).expect("playback should pass");
        assert_eq!(report.max_drift_ns, 0);
        assert_eq!(sink.events.len(), 2);
    }

    #[test]
    fn visual_offset_does_not_change_replay_timing() {
        let mut session = sample_session();
        session.offset_ms = 50_000;
        let cancel = AtomicBool::new(false);
        let mut clock = FakeClock { now: 1_000 };
        let mut sink = FakeSink { events: vec![] };
        play_session(&session, &cancel, &mut clock, &mut sink).expect("playback should pass");
        assert_eq!(clock.now, 1_020);
    }

    #[test]
    fn cancellation_releases_held_keys() {
        let session = Session::new(
            "sample".to_string(),
            150.0,
            0,
            vec![
                SessionEvent {
                    t_ns: 10,
                    key: key("S"),
                    action: KeyAction::Press,
                },
                SessionEvent {
                    t_ns: 40,
                    key: key("D"),
                    action: KeyAction::Press,
                },
            ],
        );
        let cancel = AtomicBool::new(true);
        let mut clock = FakeClock { now: 0 };
        let mut sink = FakeSink { events: vec![] };
        let report =
            play_session(&session, &cancel, &mut clock, &mut sink).expect("playback should pass");
        assert!(report.cancelled);
    }
}
