use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("validation error: {0}")]
    Validation(String),
    #[error("io error: {0}")]
    Io(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("state error: {0}")]
    State(String),
    #[error("playback error: {0}")]
    Playback(String),
}

impl From<std::io::Error> for AppError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(value: serde_json::Error) -> Self {
        Self::Validation(value.to_string())
    }
}

#[derive(Debug, Serialize)]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

impl From<AppError> for CommandError {
    fn from(value: AppError) -> Self {
        let code = match value {
            AppError::Validation(_) => "validation_error",
            AppError::Io(_) => "io_error",
            AppError::NotFound(_) => "not_found",
            AppError::State(_) => "state_error",
            AppError::Playback(_) => "playback_error",
        }
        .to_string();
        Self {
            code,
            message: value.to_string(),
        }
    }
}
