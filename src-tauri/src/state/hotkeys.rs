use crate::error::AppError;

use super::AppState;

impl AppState {
    pub fn set_hotkey(&self, hotkey: String) -> Result<(), AppError> {
        let mut inner = self.lock_state()?;
        inner.recording.set_hotkey(hotkey)
    }

    pub fn set_play_hotkey(&self, hotkey: String) -> Result<(), AppError> {
        let mut inner = self.lock_state()?;
        validate_hotkey(&hotkey)?;
        inner.play_hotkey = hotkey;
        Ok(())
    }

    pub fn set_punch_in_hotkey(&self, hotkey: String) -> Result<(), AppError> {
        let mut inner = self.lock_state()?;
        validate_hotkey(&hotkey)?;
        inner.punch_in_hotkey = hotkey;
        Ok(())
    }

    pub fn set_stop_hotkey(&self, hotkey: String) -> Result<(), AppError> {
        let mut inner = self.lock_state()?;
        validate_hotkey(&hotkey)?;
        inner.stop_hotkey = hotkey;
        Ok(())
    }
}

fn validate_hotkey(hotkey: &str) -> Result<(), AppError> {
    if hotkey.trim().is_empty() {
        return Err(AppError::Validation("hotkey cannot be empty".to_string()));
    }
    Ok(())
}
