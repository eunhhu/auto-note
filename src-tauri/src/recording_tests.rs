use crate::model::{KeyAction, RecordedKey};

use super::RecordingReducer;

fn key(name: &str) -> RecordedKey {
    RecordedKey::new(name).expect("valid key")
}

#[test]
fn updates_state_even_when_not_recording() {
    let mut reducer = RecordingReducer::new();
    reducer.on_key_event(100, key("S"), KeyAction::Press);
    let states = reducer.key_states();
    assert_eq!(states.get("S"), Some(&true));
}

#[test]
fn records_only_while_active() {
    let mut reducer = RecordingReducer::new();
    reducer.on_key_event(100, key("S"), KeyAction::Press);
    reducer.start(200).expect("start");
    reducer.on_key_event(250, key("D"), KeyAction::Press);
    reducer.on_key_event(300, key("D"), KeyAction::Release);
    let events = reducer.stop().expect("stop");
    assert_eq!(events.len(), 2);
    assert_eq!(events[0].t_ns, 50);
    assert_eq!(events[1].t_ns, 100);
}

#[test]
fn records_with_middle_offset_when_started_at_cursor() {
    let mut reducer = RecordingReducer::new();
    reducer.start_at(1_000, 2_500).expect("start at offset");
    reducer.on_key_event(1_025, key("D"), KeyAction::Press);
    reducer.on_key_event(1_040, key("D"), KeyAction::Release);
    let events = reducer.stop().expect("stop");
    assert_eq!(events.len(), 2);
    assert_eq!(events[0].t_ns, 2_525);
    assert_eq!(events[1].t_ns, 2_540);
}

#[test]
fn ignores_duplicate_edges() {
    let mut reducer = RecordingReducer::new();
    reducer.start(10).expect("start");
    reducer.on_key_event(20, key("A"), KeyAction::Press);
    reducer.on_key_event(21, key("A"), KeyAction::Press);
    reducer.on_key_event(30, key("A"), KeyAction::Release);
    let events = reducer.stop().expect("stop");
    assert_eq!(events.len(), 2);
}

#[test]
fn exposes_live_events_while_recording() {
    let mut reducer = RecordingReducer::new();
    reducer.start(10).expect("start");
    reducer.on_key_event(20, key("A"), KeyAction::Press);
    let live = reducer.live_events();
    assert_eq!(live.len(), 1);
    assert_eq!(live[0].t_ns, 10);
}

#[test]
fn pause_resume_excludes_paused_time_from_recorded_timing() {
    let mut reducer = RecordingReducer::new();
    reducer.start(1_000).expect("start");
    reducer.on_key_event(1_100, key("A"), KeyAction::Press);
    reducer.pause(1_200).expect("pause");
    reducer.resume(1_700).expect("resume");
    reducer.on_key_event(1_800, key("A"), KeyAction::Release);
    let events = reducer.stop().expect("stop");
    assert_eq!(events.len(), 4);
    assert_eq!(events[0].t_ns, 100);
    assert_eq!(events[0].action, KeyAction::Press);
    assert_eq!(events[1].t_ns, 200);
    assert_eq!(events[1].action, KeyAction::Release);
    assert_eq!(events[2].t_ns, 200);
    assert_eq!(events[2].action, KeyAction::Press);
    assert_eq!(events[3].t_ns, 300);
    assert_eq!(events[3].action, KeyAction::Release);
}

#[test]
fn pause_ignores_keys_pressed_and_released_while_paused() {
    let mut reducer = RecordingReducer::new();
    reducer.start(1_000).expect("start");
    reducer.on_key_event(1_100, key("A"), KeyAction::Press);
    reducer.pause(1_200).expect("pause");
    reducer.on_key_event(1_300, key("A"), KeyAction::Release);
    reducer.on_key_event(1_400, key("B"), KeyAction::Press);
    reducer.on_key_event(1_500, key("B"), KeyAction::Release);
    reducer.resume(1_700).expect("resume");
    let events = reducer.stop().expect("stop");
    assert_eq!(events.len(), 2);
    assert_eq!(events[0].action, KeyAction::Press);
    assert_eq!(events[0].t_ns, 100);
    assert_eq!(events[1].action, KeyAction::Release);
    assert_eq!(events[1].t_ns, 200);
}

#[test]
fn release_from_pre_recording_key_is_not_recorded() {
    let mut reducer = RecordingReducer::new();
    reducer.on_key_event(900, key("A"), KeyAction::Press);
    reducer.start(1_000).expect("start");
    reducer.on_key_event(1_100, key("A"), KeyAction::Release);
    let events = reducer.stop().expect("stop");
    assert!(events.is_empty());
}

#[test]
fn stop_while_paused_keeps_events_before_pause() {
    let mut reducer = RecordingReducer::new();
    reducer.start(10).expect("start");
    reducer.on_key_event(20, key("A"), KeyAction::Press);
    reducer.pause(30).expect("pause");
    let events = reducer.stop().expect("stop");
    assert_eq!(events.len(), 2);
    assert!(!reducer.is_recording());
    assert!(!reducer.is_paused());
}
