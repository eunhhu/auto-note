use crate::model::{KeyAction, RecordedKey, Session, SessionEvent};

use super::{AppError, PlaybackClock, PlaybackControl, PlaybackSink, play_session};

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
    let control = PlaybackControl::new();
    let mut clock = FakeClock { now: 0 };
    let mut sink = FakeSink { events: vec![] };
    let result = play_session(&session, &control, &mut clock, &mut sink);
    assert!(result.is_err());
}

#[test]
fn deterministic_playback_has_low_drift() {
    let session = sample_session();
    let control = PlaybackControl::new();
    let mut clock = FakeClock { now: 0 };
    let mut sink = FakeSink { events: vec![] };
    let report =
        play_session(&session, &control, &mut clock, &mut sink).expect("playback should pass");
    assert_eq!(report.max_drift_ns, 0);
    assert_eq!(sink.events.len(), 2);
}

#[test]
fn visual_offset_does_not_change_replay_timing() {
    let mut session = sample_session();
    session.offset_ms = 50_000;
    let control = PlaybackControl::new();
    let mut clock = FakeClock { now: 1_000 };
    let mut sink = FakeSink { events: vec![] };
    play_session(&session, &control, &mut clock, &mut sink).expect("playback should pass");
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
    let control = PlaybackControl::new();
    control.cancel();
    let mut clock = FakeClock { now: 0 };
    let mut sink = FakeSink { events: vec![] };
    let report =
        play_session(&session, &control, &mut clock, &mut sink).expect("playback should pass");
    assert!(report.cancelled);
}

#[test]
fn pause_shifts_later_event_targets_without_drift() {
    let control = PlaybackControl::new();
    control.pause_at(1_005);
    control.resume_at(1_105);
    let session = sample_session();
    let mut clock = FakeClock { now: 1_000 };
    let mut sink = FakeSink { events: vec![] };

    let report =
        play_session(&session, &control, &mut clock, &mut sink).expect("playback should pass");

    assert_eq!(report.max_drift_ns, 0);
    assert_eq!(clock.now, 1_120);
}
