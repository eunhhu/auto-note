use crate::{error::AppError, model::Session};

use super::AppState;

impl AppState {
    pub fn list_sessions(&self) -> Result<Vec<String>, AppError> {
        let inner = self.lock_state()?;
        inner.persistence.list_sessions()
    }

    pub fn load_session(&self, id: String) -> Result<Session, AppError> {
        let inner = self.lock_state()?;
        inner.persistence.load_session(&id)
    }

    pub fn save_session(&self, session: Session) -> Result<(), AppError> {
        let inner = self.lock_state()?;
        inner.persistence.save_session(&session)
    }

    pub fn delete_session(&self, id: String) -> Result<(), AppError> {
        let mut inner = self.lock_state()?;
        if inner.last_play_session_id.as_deref() == Some(id.as_str()) {
            inner.last_play_session_id = None;
        }
        inner.persistence.delete_session(&id)
    }

    pub fn import_session_json(&self, payload: String) -> Result<Session, AppError> {
        let inner = self.lock_state()?;
        inner.persistence.import_session_json(&payload)
    }

    pub fn export_session_json(&self, session_id: String) -> Result<String, AppError> {
        let inner = self.lock_state()?;
        inner.persistence.export_session_json(&session_id)
    }
}
