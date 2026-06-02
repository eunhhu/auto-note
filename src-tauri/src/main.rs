#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

#[cfg(not(test))]
fn main() -> tauri::Result<()> {
    use auto_note_tauri_lib::*;
    use tauri::Manager;

    tauri::Builder::default()
        .setup(|app| {
            app.manage(AppState::new(app.handle().clone())?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_recording,
            pause_recording,
            resume_recording,
            stop_recording,
            play_session,
            pause_playback,
            resume_playback,
            stop_playback,
            get_status,
            set_hotkey,
            set_play_hotkey,
            set_punch_in_hotkey,
            set_stop_hotkey,
            start_recording_at,
            update_session,
            list_sessions,
            load_session,
            save_session,
            delete_session,
            import_session_json,
            export_session_json,
            timing_report,
            platform_status,
        ])
        .run(tauri::generate_context!())
}

#[cfg(test)]
fn main() {}
