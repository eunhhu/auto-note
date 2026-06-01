use std::collections::HashMap;

use crate::{
    error::AppError,
    model::{KeyAction, RecordedKey, SessionEvent},
};

#[derive(Debug, Clone)]
pub struct RecordingReducer {
    hotkey: String,
    recording: bool,
    started_at_ns: u64,
    record_offset_ns: u64,
    key_states: HashMap<String, bool>,
    events: Vec<SessionEvent>,
}

impl RecordingReducer {
    pub fn new() -> Self {
        Self {
            hotkey: "F10".to_string(),
            recording: false,
            started_at_ns: 0,
            record_offset_ns: 0,
            key_states: HashMap::new(),
            events: vec![],
        }
    }

    pub fn set_hotkey(&mut self, hotkey: String) -> Result<(), AppError> {
        if hotkey.trim().is_empty() {
            return Err(AppError::Validation("hotkey cannot be empty".to_string()));
        }
        self.hotkey = hotkey;
        Ok(())
    }

    pub fn hotkey(&self) -> &str {
        &self.hotkey
    }

    pub fn key_states(&self) -> HashMap<String, bool> {
        self.key_states.clone()
    }

    pub fn is_recording(&self) -> bool {
        self.recording
    }

    pub fn live_events(&self) -> Vec<SessionEvent> {
        self.events.clone()
    }

    pub fn start(&mut self, now_ns: u64) -> Result<(), AppError> {
        self.start_at(now_ns, 0)
    }

    pub fn start_at(&mut self, now_ns: u64, offset_ns: u64) -> Result<(), AppError> {
        if self.recording {
            return Err(AppError::State("already recording".to_string()));
        }
        self.recording = true;
        self.started_at_ns = now_ns;
        self.record_offset_ns = offset_ns;
        self.events.clear();
        Ok(())
    }

    pub fn stop(&mut self) -> Result<Vec<SessionEvent>, AppError> {
        if !self.recording {
            return Err(AppError::State("recording is not active".to_string()));
        }
        self.recording = false;
        Ok(self.events.clone())
    }

    pub fn on_key_event(&mut self, now_ns: u64, key: RecordedKey, action: KeyAction) {
        let key_name = key.as_str().to_string();
        let next_pressed = matches!(action, KeyAction::Press);
        let previous_pressed = self.key_states.get(&key_name).copied().unwrap_or(false);
        if previous_pressed == next_pressed {
            return;
        }
        self.key_states.insert(key_name, next_pressed);
        if self.recording {
            let elapsed_ns = now_ns.saturating_sub(self.started_at_ns);
            let t_ns = self.record_offset_ns.saturating_add(elapsed_ns);
            self.events.push(SessionEvent { t_ns, key, action });
        }
    }
}

#[cfg(test)]
mod tests {
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
}
