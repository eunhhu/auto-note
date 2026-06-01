use crate::error::AppError;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use uuid::Uuid;

pub const SESSION_SCHEMA_VERSION: u32 = 2;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[serde(transparent)]
pub struct RecordedKey(String);

impl RecordedKey {
    pub fn new(value: impl Into<String>) -> Result<Self, AppError> {
        let value = value.into().trim().to_string();
        if value.is_empty() {
            return Err(AppError::Validation("key name cannot be empty".to_string()));
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum KeyAction {
    Press,
    Release,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SessionEvent {
    pub t_ns: u64,
    pub key: RecordedKey,
    pub action: KeyAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub schema_version: u32,
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
    pub keys: Vec<RecordedKey>,
    pub bpm: f64,
    pub offset_ms: i64,
    pub events: Vec<SessionEvent>,
}

impl Session {
    pub fn new(name: String, bpm: f64, offset_ms: i64, events: Vec<SessionEvent>) -> Self {
        let now = Utc::now().to_rfc3339();
        Self {
            schema_version: SESSION_SCHEMA_VERSION,
            id: Uuid::new_v4().to_string(),
            name,
            created_at: now.clone(),
            updated_at: now,
            keys: derive_keys(&events),
            bpm,
            offset_ms,
            events,
        }
    }

    pub fn validate(&self) -> Result<(), AppError> {
        if self.schema_version != SESSION_SCHEMA_VERSION {
            return Err(AppError::Validation(format!(
                "unsupported schema_version {}",
                self.schema_version
            )));
        }
        if self.name.trim().is_empty() {
            return Err(AppError::Validation("session name is empty".to_string()));
        }
        if !self.bpm.is_finite() || self.bpm <= 0.0 {
            return Err(AppError::Validation("bpm must be positive".to_string()));
        }
        let mut seen_keys = HashSet::<&RecordedKey>::new();
        for key in &self.keys {
            if key.as_str().trim().is_empty() {
                return Err(AppError::Validation("key name cannot be empty".to_string()));
            }
            if !seen_keys.insert(key) {
                return Err(AppError::Validation(
                    "duplicate key lane detected".to_string(),
                ));
            }
        }

        let mut holds = HashSet::<RecordedKey>::new();
        let mut last_t = 0_u64;
        for event in &self.events {
            if event.key.as_str().trim().is_empty() {
                return Err(AppError::Validation("key name cannot be empty".to_string()));
            }
            if event.t_ns < last_t {
                return Err(AppError::Validation(
                    "events must be ordered by t_ns".to_string(),
                ));
            }
            last_t = event.t_ns;
            match event.action {
                KeyAction::Press => {
                    holds.insert(event.key.clone());
                }
                KeyAction::Release => {
                    if !holds.remove(&event.key) {
                        return Err(AppError::Validation(
                            "unmatched key release detected".to_string(),
                        ));
                    }
                }
            }
        }
        Ok(())
    }
}

fn derive_keys(events: &[SessionEvent]) -> Vec<RecordedKey> {
    let mut keys = Vec::<RecordedKey>::new();
    let mut seen = HashSet::<RecordedKey>::new();
    for event in events {
        if seen.insert(event.key.clone()) {
            keys.push(event.key.clone());
        }
    }
    keys
}

#[cfg(test)]
mod tests {
    use super::{KeyAction, RecordedKey, Session, SessionEvent};

    fn key(name: &str) -> RecordedKey {
        RecordedKey::new(name).expect("valid key")
    }

    #[test]
    fn rejects_future_schema_version() {
        let mut session = Session::new("test".to_string(), 180.0, 0, vec![]);
        session.schema_version = 3;
        let result = session.validate();
        assert!(result.is_err());
    }

    #[test]
    fn rejects_unmatched_release() {
        let session = Session::new(
            "test".to_string(),
            180.0,
            0,
            vec![SessionEvent {
                t_ns: 10,
                key: key("S"),
                action: KeyAction::Release,
            }],
        );
        let result = session.validate();
        assert!(result.is_err());
    }

    #[test]
    fn accepts_valid_pairs() {
        let session = Session::new(
            "test".to_string(),
            180.0,
            0,
            vec![
                SessionEvent {
                    t_ns: 10,
                    key: key("S"),
                    action: KeyAction::Press,
                },
                SessionEvent {
                    t_ns: 40,
                    key: key("S"),
                    action: KeyAction::Release,
                },
            ],
        );
        let result = session.validate();
        assert!(result.is_ok());
        assert_eq!(session.keys, vec![key("S")]);
    }
}
