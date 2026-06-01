use std::{
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
        mpsc,
    },
    thread,
    time::Duration,
};

use tempfile::TempDir;

use crate::{
    adapters::{GlobalInputEvent, GlobalInputListener},
    model::{KeyAction, RecordedKey},
    persistence::Persistence,
    playback::PlaybackReport,
    recording::RecordingReducer,
};

use super::{PlaybackRuntime, RuntimeState, drain_listener, playback_cursor_ns, stop_recording_inner};

fn key(name: &str) -> RecordedKey {
    RecordedKey::new(name).expect("valid key")
}

#[test]
fn stop_recording_drains_pending_listener_events_before_saving() {
    let dir = TempDir::new().expect("tempdir");
    let persistence = Persistence::with_data_dir(dir.path().to_path_buf()).expect("persistence");
    let (tx, rx) = mpsc::channel();
    let mut inner = RuntimeState {
        recording: RecordingReducer::new(),
        persistence,
        listener: GlobalInputListener::from_receiver(rx),
        playback: None,
        last_report: None,
        play_hotkey: "F9".to_string(),
        stop_hotkey: "F8".to_string(),
        last_play_session_id: None,
    };

    inner.recording.start(1_000).expect("start recording");
    tx.send(GlobalInputEvent {
        when_ns: 1_020,
        key: key("S"),
        action: KeyAction::Press,
    })
    .expect("send press");
    tx.send(GlobalInputEvent {
        when_ns: 1_045,
        key: key("S"),
        action: KeyAction::Release,
    })
    .expect("send release");

    let session = stop_recording_inner(&mut inner, "drained".to_string(), 180.0, 0).expect("stop");

    assert_eq!(session.events.len(), 2);
    assert_eq!(session.events[0].t_ns, 20);
    assert_eq!(session.events[1].t_ns, 45);
}

#[test]
fn stop_hotkey_cancels_active_playback() {
    let dir = TempDir::new().expect("tempdir");
    let persistence = Persistence::with_data_dir(dir.path().to_path_buf()).expect("persistence");
    let (tx, rx) = mpsc::channel();
    let cancel = Arc::new(AtomicBool::new(false));
    let cancel_for_thread = Arc::clone(&cancel);
    let handle = thread::spawn(move || {
        thread::sleep(Duration::from_millis(5));
        Ok(PlaybackReport {
            max_drift_ns: 0,
            emitted_events: 0,
            cancelled: cancel_for_thread.load(Ordering::Relaxed),
        })
    });
    let mut inner = RuntimeState {
        recording: RecordingReducer::new(),
        persistence,
        listener: GlobalInputListener::from_receiver(rx),
        playback: Some(PlaybackRuntime {
            cancel,
            handle,
            started_at_ns: 0,
            duration_ns: 1_000,
        }),
        last_report: None,
        play_hotkey: "F9".to_string(),
        stop_hotkey: "F8".to_string(),
        last_play_session_id: None,
    };
    tx.send(GlobalInputEvent {
        when_ns: 1_020,
        key: key("F8"),
        action: KeyAction::Press,
    })
    .expect("send stop");
    drain_listener(&mut inner).expect("drain");
    assert!(inner.playback.is_none());
    assert!(inner.last_report.is_some());
}

#[test]
fn playback_cursor_reports_progress_when_active() {
    let dir = TempDir::new().expect("tempdir");
    let persistence = Persistence::with_data_dir(dir.path().to_path_buf()).expect("persistence");
    let (_tx, rx) = mpsc::channel();
    let handle = thread::spawn(move || {
        thread::sleep(Duration::from_millis(20));
        Ok(PlaybackReport {
            max_drift_ns: 0,
            emitted_events: 0,
            cancelled: false,
        })
    });
    let now = crate::timing::now_ns();
    let inner = RuntimeState {
        recording: RecordingReducer::new(),
        persistence,
        listener: GlobalInputListener::from_receiver(rx),
        playback: Some(PlaybackRuntime {
            cancel: Arc::new(AtomicBool::new(false)),
            handle,
            started_at_ns: now.saturating_sub(100),
            duration_ns: 1_000,
        }),
        last_report: None,
        play_hotkey: "F9".to_string(),
        stop_hotkey: "F8".to_string(),
        last_play_session_id: None,
    };
    let cursor = playback_cursor_ns(&inner);
    assert!(cursor.is_some());
}
