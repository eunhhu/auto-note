use std::collections::HashMap;

use crate::{
    error::AppError,
    model::{KeyAction, RecordedKey, SessionEvent},
};

#[derive(Debug, Clone)]
pub struct RecordingReducer {
    hotkey: String,
    recording: bool,
    paused: bool,
    pause_started_ns: u64,
    paused_total_ns: u64,
    started_at_ns: u64,
    record_offset_ns: u64,
    key_states: HashMap<String, bool>,
    recorded_keys: HashMap<String, RecordedKey>,
    events: Vec<SessionEvent>,
}

impl RecordingReducer {
    pub fn new() -> Self {
        Self {
            hotkey: "F10".to_string(),
            recording: false,
            paused: false,
            pause_started_ns: 0,
            paused_total_ns: 0,
            started_at_ns: 0,
            record_offset_ns: 0,
            key_states: HashMap::new(),
            recorded_keys: HashMap::new(),
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

    pub fn is_paused(&self) -> bool {
        self.paused
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
        self.paused = false;
        self.pause_started_ns = 0;
        self.paused_total_ns = 0;
        self.started_at_ns = now_ns;
        self.record_offset_ns = offset_ns;
        self.recorded_keys.clear();
        self.events.clear();
        Ok(())
    }

    pub fn stop(&mut self) -> Result<Vec<SessionEvent>, AppError> {
        if !self.recording {
            return Err(AppError::State("recording is not active".to_string()));
        }
        self.recording = false;
        self.paused = false;
        self.recorded_keys.clear();
        Ok(self.events.clone())
    }

    pub fn pause(&mut self, now_ns: u64) -> Result<(), AppError> {
        if !self.recording {
            return Err(AppError::State("recording is not active".to_string()));
        }
        if self.paused {
            return Ok(());
        }
        self.release_recorded_keys(self.event_time(now_ns));
        self.paused = true;
        self.pause_started_ns = now_ns;
        Ok(())
    }

    pub fn resume(&mut self, now_ns: u64) -> Result<(), AppError> {
        if !self.recording {
            return Err(AppError::State("recording is not active".to_string()));
        }
        if !self.paused {
            return Ok(());
        }
        self.paused_total_ns = self
            .paused_total_ns
            .saturating_add(now_ns.saturating_sub(self.pause_started_ns));
        self.pause_started_ns = 0;
        self.paused = false;
        self.press_current_keys(self.event_time(now_ns));
        Ok(())
    }

    pub fn on_key_event(&mut self, now_ns: u64, key: RecordedKey, action: KeyAction) {
        let key_name = key.as_str().to_string();
        let next_pressed = matches!(action, KeyAction::Press);
        let previous_pressed = self.key_states.get(&key_name).copied().unwrap_or(false);
        if previous_pressed == next_pressed {
            return;
        }
        self.key_states.insert(key_name.clone(), next_pressed);
        if self.recording && !self.paused {
            self.record_edge(self.event_time(now_ns), key_name, key, action);
        }
    }

    fn event_time(&self, now_ns: u64) -> u64 {
        let elapsed_ns = now_ns.saturating_sub(self.started_at_ns);
        self.record_offset_ns
            .saturating_add(elapsed_ns.saturating_sub(self.paused_total_ns))
    }

    fn record_edge(&mut self, t_ns: u64, key_name: String, key: RecordedKey, action: KeyAction) {
        match action {
            KeyAction::Press => {
                self.recorded_keys.insert(key_name, key.clone());
                self.events.push(SessionEvent { t_ns, key, action });
            }
            KeyAction::Release => {
                if self.recorded_keys.remove(&key_name).is_some() {
                    self.events.push(SessionEvent { t_ns, key, action });
                }
            }
        }
    }

    fn release_recorded_keys(&mut self, t_ns: u64) {
        let mut keys = self
            .recorded_keys
            .drain()
            .map(|(_, key)| key)
            .collect::<Vec<_>>();
        keys.sort();
        self.events.extend(keys.into_iter().map(|key| SessionEvent {
            t_ns,
            key,
            action: KeyAction::Release,
        }));
    }

    fn press_current_keys(&mut self, t_ns: u64) {
        let mut key_names = self
            .key_states
            .iter()
            .filter_map(|(key, down)| down.then_some(key.clone()))
            .collect::<Vec<_>>();
        key_names.sort();
        for key_name in key_names {
            if self.recorded_keys.contains_key(&key_name) {
                continue;
            }
            let Ok(key) = RecordedKey::new(key_name.clone()) else {
                continue;
            };
            self.recorded_keys.insert(key_name, key.clone());
            self.events.push(SessionEvent {
                t_ns,
                key,
                action: KeyAction::Press,
            });
        }
    }
}

#[cfg(test)]
#[path = "recording_tests.rs"]
mod tests;
