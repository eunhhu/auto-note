use tauri::State;

use crate::{
    error::CommandError,
    model::Session,
    platform::PlatformStatus,
    playback::PlaybackReport,
    state::{AppState, RuntimeStatus},
};

#[tauri::command]
pub fn start_recording(state: State<'_, AppState>) -> Result<(), CommandError> {
    state.start_recording().map_err(CommandError::from)
}

#[tauri::command]
pub fn start_recording_at(state: State<'_, AppState>, offset_ms: u64) -> Result<(), CommandError> {
    state
        .start_recording_at(offset_ms)
        .map_err(CommandError::from)
}

#[tauri::command]
pub fn stop_recording(
    state: State<'_, AppState>,
    name: String,
    bpm: f64,
    offset_ms: i64,
) -> Result<Session, CommandError> {
    state
        .stop_recording(name, bpm, offset_ms)
        .map_err(CommandError::from)
}

#[tauri::command]
pub fn play_session(state: State<'_, AppState>, session_id: String) -> Result<(), CommandError> {
    state.play_session(session_id).map_err(CommandError::from)
}

#[tauri::command]
pub fn stop_playback(state: State<'_, AppState>) -> Result<(), CommandError> {
    state.stop_playback().map_err(CommandError::from)
}

#[tauri::command]
pub fn get_status(state: State<'_, AppState>) -> Result<RuntimeStatus, CommandError> {
    state.get_status().map_err(CommandError::from)
}

#[tauri::command]
pub fn set_hotkey(state: State<'_, AppState>, hotkey: String) -> Result<(), CommandError> {
    state.set_hotkey(hotkey).map_err(CommandError::from)
}

#[tauri::command]
pub fn set_play_hotkey(state: State<'_, AppState>, hotkey: String) -> Result<(), CommandError> {
    state.set_play_hotkey(hotkey).map_err(CommandError::from)
}

#[tauri::command]
pub fn set_stop_hotkey(state: State<'_, AppState>, hotkey: String) -> Result<(), CommandError> {
    state.set_stop_hotkey(hotkey).map_err(CommandError::from)
}

#[tauri::command]
pub fn update_session(state: State<'_, AppState>, session: Session) -> Result<(), CommandError> {
    state.save_session(session).map_err(CommandError::from)
}

#[tauri::command]
pub fn list_sessions(state: State<'_, AppState>) -> Result<Vec<String>, CommandError> {
    state.list_sessions().map_err(CommandError::from)
}

#[tauri::command]
pub fn load_session(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<Session, CommandError> {
    state.load_session(session_id).map_err(CommandError::from)
}

#[tauri::command]
pub fn save_session(state: State<'_, AppState>, session: Session) -> Result<(), CommandError> {
    state.save_session(session).map_err(CommandError::from)
}

#[tauri::command]
pub fn delete_session(state: State<'_, AppState>, session_id: String) -> Result<(), CommandError> {
    state.delete_session(session_id).map_err(CommandError::from)
}

#[tauri::command]
pub fn import_session_json(
    state: State<'_, AppState>,
    payload: String,
) -> Result<Session, CommandError> {
    state
        .import_session_json(payload)
        .map_err(CommandError::from)
}

#[tauri::command]
pub fn export_session_json(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<String, CommandError> {
    state
        .export_session_json(session_id)
        .map_err(CommandError::from)
}

#[tauri::command]
pub fn timing_report(state: State<'_, AppState>) -> Result<Option<PlaybackReport>, CommandError> {
    state.timing_report().map_err(CommandError::from)
}

#[tauri::command]
pub fn platform_status(state: State<'_, AppState>) -> Result<PlatformStatus, CommandError> {
    Ok(state.platform_status())
}
