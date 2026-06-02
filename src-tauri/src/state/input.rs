use crate::{error::AppError, model::KeyAction};

use super::RuntimeState;

pub(super) fn drain_listener(inner: &mut RuntimeState) -> Result<(), AppError> {
    let record_hotkey = inner.recording.hotkey().to_string();
    let play_hotkey = inner.play_hotkey.clone();
    let punch_in_hotkey = inner.punch_in_hotkey.clone();
    let stop_hotkey = inner.stop_hotkey.clone();
    for event in inner.listener.try_recv_all() {
        let key = event.key.as_str();
        let is_press = matches!(event.action, KeyAction::Press);
        if key.eq_ignore_ascii_case(&record_hotkey) {
            if is_press {
                inner.record_toggle_request_id = Some(event.when_ns);
            }
            continue;
        }
        if key.eq_ignore_ascii_case(&stop_hotkey) {
            if is_press {
                inner.pause_toggle_request_id = Some(event.when_ns);
            }
            continue;
        }
        if key.eq_ignore_ascii_case(&punch_in_hotkey) {
            if is_press {
                inner.punch_in_request_id = Some(event.when_ns);
            }
            continue;
        }
        if key.eq_ignore_ascii_case(&play_hotkey) {
            if is_press {
                inner.play_toggle_request_id = Some(event.when_ns);
            }
            continue;
        }
        inner
            .recording
            .on_key_event(event.when_ns, event.key, event.action);
    }
    Ok(())
}
