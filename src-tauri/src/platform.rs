use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct PlatformStatus {
    pub os: String,
    pub can_record_globally: bool,
    pub can_play_globally: bool,
    pub notes: Vec<String>,
}

pub fn detect_platform_status() -> PlatformStatus {
    if cfg!(target_os = "macos") {
        PlatformStatus {
            os: "macos".to_string(),
            can_record_globally: false,
            can_play_globally: true,
            notes: vec![
                "Enable Accessibility permission for this app and terminal during development."
                    .to_string(),
                "Without Accessibility permission, global key capture may not receive events."
                    .to_string(),
            ],
        }
    } else if cfg!(target_os = "windows") {
        PlatformStatus {
            os: "windows".to_string(),
            can_record_globally: true,
            can_play_globally: true,
            notes: vec![
                "Running as administrator may be required to control elevated target windows."
                    .to_string(),
                "UIPI can block synthetic input into higher-integrity processes.".to_string(),
            ],
        }
    } else if cfg!(target_os = "linux") {
        PlatformStatus {
            os: "linux".to_string(),
            can_record_globally: true,
            can_play_globally: true,
            notes: vec![
                "X11 generally supports global capture and replay.".to_string(),
                "Wayland compositors may block global hooks or synthetic input for security."
                    .to_string(),
            ],
        }
    } else {
        PlatformStatus {
            os: std::env::consts::OS.to_string(),
            can_record_globally: false,
            can_play_globally: false,
            notes: vec!["platform support is unknown".to_string()],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::detect_platform_status;

    #[test]
    fn platform_status_has_notes() {
        let status = detect_platform_status();
        assert!(!status.os.is_empty());
        assert!(!status.notes.is_empty());
    }
}
