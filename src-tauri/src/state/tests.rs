use std::{
    sync::{Arc, mpsc},
    thread,
    time::Duration,
};

use tempfile::TempDir;

use crate::{
    adapters::{GlobalInputEvent, GlobalInputListener},
    model::{KeyAction, RecordedKey},
    persistence::Persistence,
    playback::{PlaybackControl, PlaybackReport},
    recording::RecordingReducer,
};

use super::{
    PlaybackRuntime, RuntimeState, drain_listener, playback_cursor_ns,
    recording::stop_recording_inner,
};

struct RuntimeFixture {
    _dir: TempDir,
    inner: RuntimeState,
    tx: mpsc::Sender<GlobalInputEvent>,
}

fn key(name: &str) -> RecordedKey {
    RecordedKey::new(name).expect("valid key")
}

fn runtime_fixture(playback: Option<PlaybackRuntime>) -> RuntimeFixture {
    let dir = TempDir::new().expect("tempdir");
    let persistence = Persistence::with_data_dir(dir.path().to_path_buf()).expect("persistence");
    let (tx, rx) = mpsc::channel();
    RuntimeFixture {
        _dir: dir,
        tx,
        inner: RuntimeState {
            recording: RecordingReducer::new(),
            persistence,
            listener: GlobalInputListener::from_receiver(rx),
            playback,
            last_report: None,
            play_hotkey: "F9".to_string(),
            punch_in_hotkey: "F7".to_string(),
            play_toggle_request_id: None,
            pause_toggle_request_id: None,
            record_toggle_request_id: None,
            punch_in_request_id: None,
            stop_hotkey: "F8".to_string(),
            last_play_session_id: None,
        },
    }
}

fn send_key(tx: &mpsc::Sender<GlobalInputEvent>, when_ns: u64, name: &str, action: KeyAction) {
    tx.send(GlobalInputEvent {
        when_ns,
        key: key(name),
        action,
    })
    .expect("send key event");
}

fn short_playback(control: Arc<PlaybackControl>) -> PlaybackRuntime {
    let control_for_thread = Arc::clone(&control);
    let handle = thread::spawn(move || {
        thread::sleep(Duration::from_millis(5));
        Ok(PlaybackReport {
            max_drift_ns: 0,
            emitted_events: 0,
            cancelled: control_for_thread.is_cancelled(),
        })
    });
    PlaybackRuntime {
        control,
        handle,
        started_at_ns: 0,
        duration_ns: 1_000,
    }
}

#[test]
fn stop_recording_drains_pending_listener_events_before_saving() {
    let mut fixture = runtime_fixture(None);
    fixture
        .inner
        .recording
        .start(1_000)
        .expect("start recording");
    send_key(&fixture.tx, 1_020, "S", KeyAction::Press);
    send_key(&fixture.tx, 1_045, "S", KeyAction::Release);

    let session =
        stop_recording_inner(&mut fixture.inner, "drained".to_string(), 180.0, 0).expect("stop");

    assert_eq!(session.events.len(), 2);
    assert_eq!(session.events[0].t_ns, 20);
    assert_eq!(session.events[1].t_ns, 45);
}

#[test]
fn play_hotkey_requests_play_stop_toggle_without_stopping_backend_directly() {
    let control = Arc::new(PlaybackControl::new());
    let mut fixture = runtime_fixture(Some(short_playback(control)));
    send_key(&fixture.tx, 1_020, "F9", KeyAction::Press);

    drain_listener(&mut fixture.inner).expect("drain");

    assert_eq!(fixture.inner.play_toggle_request_id, Some(1_020));
    assert!(fixture.inner.playback.is_some());
}

#[test]
fn pause_hotkey_requests_pause_resume_toggle() {
    let mut fixture = runtime_fixture(None);
    send_key(&fixture.tx, 1_050, "F8", KeyAction::Press);

    drain_listener(&mut fixture.inner).expect("drain");

    assert_eq!(fixture.inner.pause_toggle_request_id, Some(1_050));
}

#[test]
fn record_hotkey_requests_record_stop_toggle_without_recording_the_key() {
    let mut fixture = runtime_fixture(None);
    send_key(&fixture.tx, 1_090, "F10", KeyAction::Press);

    drain_listener(&mut fixture.inner).expect("drain");

    assert_eq!(fixture.inner.record_toggle_request_id, Some(1_090));
    assert!(!fixture.inner.recording.is_recording());
    assert!(fixture.inner.recording.live_events().is_empty());
}

#[test]
fn playback_cursor_reports_progress_when_active() {
    let handle = thread::spawn(move || {
        thread::sleep(Duration::from_millis(20));
        Ok(PlaybackReport {
            max_drift_ns: 0,
            emitted_events: 0,
            cancelled: false,
        })
    });
    let playback = PlaybackRuntime {
        control: Arc::new(PlaybackControl::new()),
        handle,
        started_at_ns: crate::timing::now_ns().saturating_sub(100),
        duration_ns: 1_000,
    };
    let fixture = runtime_fixture(Some(playback));

    let cursor = playback_cursor_ns(&fixture.inner);

    assert!(cursor.is_some());
}

#[test]
fn punch_in_hotkey_requests_frontend_punch_in_without_recording_the_key() {
    let mut fixture = runtime_fixture(None);
    send_key(&fixture.tx, 7_000, "F7", KeyAction::Press);

    drain_listener(&mut fixture.inner).expect("drain");

    assert_eq!(fixture.inner.punch_in_request_id, Some(7_000));
    assert!(!fixture.inner.recording.is_recording());
    assert!(fixture.inner.recording.live_events().is_empty());
}
