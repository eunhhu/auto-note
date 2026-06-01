use std::{
    sync::mpsc::{self, Receiver},
    thread,
};

use enigo::{Direction, Enigo, Keyboard, Settings};
use keytap::{EventKind, Tap};

use crate::{
    error::AppError,
    keymap::{enigo_key, tap_key_name},
    model::{KeyAction, RecordedKey},
    playback::PlaybackSink,
    timing::instant_ns,
};

#[derive(Debug, Clone)]
pub struct GlobalInputEvent {
    pub when_ns: u64,
    pub key: RecordedKey,
    pub action: KeyAction,
}

pub struct GlobalInputListener {
    receiver: Receiver<GlobalInputEvent>,
    _thread_handle: Option<thread::JoinHandle<()>>,
}

impl GlobalInputListener {
    pub fn spawn() -> Self {
        let (tx, rx) = mpsc::channel::<GlobalInputEvent>();
        let handle = thread::spawn(move || {
            let Ok(tap) = Tap::new() else {
                return;
            };
            for event in tap.iter() {
                if let Some(input_event) = map_tap_event(event) {
                    let _ = tx.send(input_event);
                }
            }
        });

        Self {
            receiver: rx,
            _thread_handle: Some(handle),
        }
    }

    #[cfg(test)]
    pub fn from_receiver(receiver: Receiver<GlobalInputEvent>) -> Self {
        Self {
            receiver,
            _thread_handle: None,
        }
    }

    pub fn try_recv_all(&self) -> Vec<GlobalInputEvent> {
        let mut items = vec![];
        while let Ok(event) = self.receiver.try_recv() {
            items.push(event);
        }
        items
    }
}

pub struct EnigoPlaybackSink {
    enigo: Enigo,
}

impl EnigoPlaybackSink {
    pub fn new() -> Result<Self, AppError> {
        let enigo = Enigo::new(&Settings::default())
            .map_err(|error| AppError::Playback(error.to_string()))?;
        Ok(Self { enigo })
    }
}

impl PlaybackSink for EnigoPlaybackSink {
    fn key_press(&mut self, key: &RecordedKey) -> Result<(), AppError> {
        self.enigo
            .key(enigo_key(key)?, Direction::Press)
            .map_err(|error| AppError::Playback(error.to_string()))
    }

    fn key_release(&mut self, key: &RecordedKey) -> Result<(), AppError> {
        self.enigo
            .key(enigo_key(key)?, Direction::Release)
            .map_err(|error| AppError::Playback(error.to_string()))
    }
}

fn map_tap_event(event: keytap::Event) -> Option<GlobalInputEvent> {
    let (key, action) = match event.kind {
        EventKind::KeyDown(key) => (key, KeyAction::Press),
        EventKind::KeyUp(key) => (key, KeyAction::Release),
        EventKind::KeyRepeat(_) => return None,
    };
    let name = tap_key_name(key);
    let key = RecordedKey::new(name).ok()?;
    Some(GlobalInputEvent {
        when_ns: instant_ns(event.time),
        key,
        action,
    })
}
