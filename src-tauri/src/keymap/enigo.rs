use enigo::Key as EnigoKey;

use crate::{error::AppError, model::RecordedKey};

pub fn enigo_key(key: &RecordedKey) -> Result<EnigoKey, AppError> {
    let name = key.as_str();
    if let Some(value) = platform_physical_key(name) {
        return Ok(value);
    }
    if let Some(value) = single_char_key(name) {
        return Ok(value);
    }
    let mapped = match name {
        "Digit0" => EnigoKey::Unicode('0'),
        "Digit1" => EnigoKey::Unicode('1'),
        "Digit2" => EnigoKey::Unicode('2'),
        "Digit3" => EnigoKey::Unicode('3'),
        "Digit4" => EnigoKey::Unicode('4'),
        "Digit5" => EnigoKey::Unicode('5'),
        "Digit6" => EnigoKey::Unicode('6'),
        "Digit7" => EnigoKey::Unicode('7'),
        "Digit8" => EnigoKey::Unicode('8'),
        "Digit9" => EnigoKey::Unicode('9'),
        "Space" => EnigoKey::Space,
        "Enter" => EnigoKey::Return,
        "Backspace" => EnigoKey::Backspace,
        "Tab" => EnigoKey::Tab,
        "Escape" => EnigoKey::Escape,
        "ArrowLeft" => EnigoKey::LeftArrow,
        "ArrowRight" => EnigoKey::RightArrow,
        "ArrowUp" => EnigoKey::UpArrow,
        "ArrowDown" => EnigoKey::DownArrow,
        "Backtick" => EnigoKey::Unicode('`'),
        "Minus" => EnigoKey::Unicode('-'),
        "Equal" => EnigoKey::Unicode('='),
        "BracketLeft" => EnigoKey::Unicode('['),
        "BracketRight" => EnigoKey::Unicode(']'),
        "Backslash" => EnigoKey::Unicode('\\'),
        "Semicolon" => EnigoKey::Unicode(';'),
        "Quote" => EnigoKey::Unicode('\''),
        "Comma" => EnigoKey::Unicode(','),
        "Period" => EnigoKey::Unicode('.'),
        "Slash" => EnigoKey::Unicode('/'),
        "ShiftLeft" => EnigoKey::LShift,
        "ShiftRight" => EnigoKey::RShift,
        "ControlLeft" => EnigoKey::LControl,
        "ControlRight" => EnigoKey::RControl,
        "AltLeft" | "AltRight" => EnigoKey::Alt,
        "MetaLeft" | "MetaRight" => EnigoKey::Meta,
        "Numpad0" => EnigoKey::Numpad0,
        "Numpad1" => EnigoKey::Numpad1,
        "Numpad2" => EnigoKey::Numpad2,
        "Numpad3" => EnigoKey::Numpad3,
        "Numpad4" => EnigoKey::Numpad4,
        "Numpad5" => EnigoKey::Numpad5,
        "Numpad6" => EnigoKey::Numpad6,
        "Numpad7" => EnigoKey::Numpad7,
        "Numpad8" => EnigoKey::Numpad8,
        "Numpad9" => EnigoKey::Numpad9,
        "NumpadAdd" => EnigoKey::Add,
        "NumpadSubtract" => EnigoKey::Subtract,
        "NumpadMultiply" => EnigoKey::Multiply,
        "NumpadDivide" => EnigoKey::Divide,
        "NumpadDecimal" => EnigoKey::Decimal,
        "NumpadEnter" => EnigoKey::Return,
        #[cfg(not(target_os = "macos"))]
        "Insert" => EnigoKey::Insert,
        "Delete" => EnigoKey::Delete,
        "Home" => EnigoKey::Home,
        "End" => EnigoKey::End,
        "PageUp" => EnigoKey::PageUp,
        "PageDown" => EnigoKey::PageDown,
        "CapsLock" => EnigoKey::CapsLock,
        #[cfg(not(target_os = "macos"))]
        "NumLock" => EnigoKey::Numlock,
        "F1" => EnigoKey::F1,
        "F2" => EnigoKey::F2,
        "F3" => EnigoKey::F3,
        "F4" => EnigoKey::F4,
        "F5" => EnigoKey::F5,
        "F6" => EnigoKey::F6,
        "F7" => EnigoKey::F7,
        "F8" => EnigoKey::F8,
        "F9" => EnigoKey::F9,
        "F10" => EnigoKey::F10,
        "F11" => EnigoKey::F11,
        "F12" => EnigoKey::F12,
        "F13" => EnigoKey::F13,
        "F14" => EnigoKey::F14,
        "F15" => EnigoKey::F15,
        "F16" => EnigoKey::F16,
        "F17" => EnigoKey::F17,
        "F18" => EnigoKey::F18,
        "F19" => EnigoKey::F19,
        "F20" => EnigoKey::F20,
        _ => {
            return Err(AppError::Playback(format!("unsupported replay key {name}")));
        }
    };
    Ok(mapped)
}

fn single_char_key(name: &str) -> Option<EnigoKey> {
    let mut chars = name.chars();
    let first = chars.next()?;
    if chars.next().is_some() || !first.is_ascii_alphanumeric() {
        return None;
    }
    Some(EnigoKey::Unicode(first.to_ascii_lowercase()))
}

#[cfg(target_os = "macos")]
fn platform_physical_key(name: &str) -> Option<EnigoKey> {
    if let Some(raw_code) = super::macos::unknown_raw_code(name) {
        return Some(EnigoKey::Other(raw_code));
    }
    super::macos::virtual_keycode(name).map(EnigoKey::Other)
}

#[cfg(not(target_os = "macos"))]
fn platform_physical_key(_: &str) -> Option<EnigoKey> {
    None
}
