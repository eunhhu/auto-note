use std::sync::mpsc;

use tempfile::TempDir;

use crate::{
    adapters::{GlobalInputEvent, GlobalInputListener},
    model::{KeyAction, RecordedKey},
    persistence::Persistence,
    recording::RecordingReducer,
};

use super::{RuntimeState, stop_recording_inner};

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
