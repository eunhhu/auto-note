use enigo::Key as EnigoKey;
use keytap::{Key as TapKey, RawCode};

use crate::{error::AppError, model::RecordedKey};

pub fn tap_key_name(key: TapKey) -> String {
    match key {
        TapKey::A => "A".to_string(),
        TapKey::B => "B".to_string(),
        TapKey::C => "C".to_string(),
        TapKey::D => "D".to_string(),
        TapKey::E => "E".to_string(),
        TapKey::F => "F".to_string(),
        TapKey::G => "G".to_string(),
        TapKey::H => "H".to_string(),
        TapKey::I => "I".to_string(),
        TapKey::J => "J".to_string(),
        TapKey::K => "K".to_string(),
        TapKey::L => "L".to_string(),
        TapKey::M => "M".to_string(),
        TapKey::N => "N".to_string(),
        TapKey::O => "O".to_string(),
        TapKey::P => "P".to_string(),
        TapKey::Q => "Q".to_string(),
        TapKey::R => "R".to_string(),
        TapKey::S => "S".to_string(),
        TapKey::T => "T".to_string(),
        TapKey::U => "U".to_string(),
        TapKey::V => "V".to_string(),
        TapKey::W => "W".to_string(),
        TapKey::X => "X".to_string(),
        TapKey::Y => "Y".to_string(),
        TapKey::Z => "Z".to_string(),
        TapKey::Unknown(RawCode(code)) => format!("Unknown({code})"),
        other => format!("{other:?}"),
    }
}

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
    if let Some(raw_code) = unknown_raw_code(name) {
        return Some(EnigoKey::Other(raw_code));
    }
    macos_virtual_keycode(name).map(EnigoKey::Other)
}

#[cfg(not(target_os = "macos"))]
fn platform_physical_key(_: &str) -> Option<EnigoKey> {
    None
}

#[cfg(target_os = "macos")]
fn unknown_raw_code(name: &str) -> Option<u32> {
    name.strip_prefix("Unknown(")?
        .strip_suffix(')')?
        .parse()
        .ok()
}

#[cfg(target_os = "macos")]
fn macos_virtual_keycode(name: &str) -> Option<u32> {
    if let Some(code) = macos_single_char_keycode(name) {
        return Some(code);
    }

    let code = match name {
        "Digit0" => 0x1D,
        "Digit1" => 0x12,
        "Digit2" => 0x13,
        "Digit3" => 0x14,
        "Digit4" => 0x15,
        "Digit5" => 0x17,
        "Digit6" => 0x16,
        "Digit7" => 0x1A,
        "Digit8" => 0x1C,
        "Digit9" => 0x19,
        "F1" => 0x7A,
        "F2" => 0x78,
        "F3" => 0x63,
        "F4" => 0x76,
        "F5" => 0x60,
        "F6" => 0x61,
        "F7" => 0x62,
        "F8" => 0x64,
        "F9" => 0x65,
        "F10" => 0x6D,
        "F11" => 0x67,
        "F12" => 0x6F,
        "F13" => 0x69,
        "F14" => 0x6B,
        "F15" => 0x71,
        "F16" => 0x6A,
        "F17" => 0x40,
        "F18" => 0x4F,
        "F19" => 0x50,
        "F20" => 0x5A,
        "ShiftLeft" => 0x38,
        "ShiftRight" => 0x3C,
        "ControlLeft" => 0x3B,
        "ControlRight" => 0x3E,
        "AltLeft" => 0x3A,
        "AltRight" => 0x3D,
        "MetaLeft" => 0x37,
        "MetaRight" => 0x36,
        "ArrowLeft" => 0x7B,
        "ArrowRight" => 0x7C,
        "ArrowDown" => 0x7D,
        "ArrowUp" => 0x7E,
        "Home" => 0x73,
        "End" => 0x77,
        "PageUp" => 0x74,
        "PageDown" => 0x79,
        "Insert" => 0x72,
        "Delete" => 0x75,
        "Escape" => 0x35,
        "Tab" => 0x30,
        "CapsLock" => 0x39,
        "Space" => 0x31,
        "Enter" => 0x24,
        "Backspace" => 0x33,
        "Backtick" => 0x32,
        "Minus" => 0x1B,
        "Equal" => 0x18,
        "BracketLeft" => 0x21,
        "BracketRight" => 0x1E,
        "Backslash" => 0x2A,
        "Semicolon" => 0x29,
        "Quote" => 0x27,
        "Comma" => 0x2B,
        "Period" => 0x2F,
        "Slash" => 0x2C,
        "Numpad0" => 0x52,
        "Numpad1" => 0x53,
        "Numpad2" => 0x54,
        "Numpad3" => 0x55,
        "Numpad4" => 0x56,
        "Numpad5" => 0x57,
        "Numpad6" => 0x58,
        "Numpad7" => 0x59,
        "Numpad8" => 0x5B,
        "Numpad9" => 0x5C,
        "NumpadAdd" => 0x45,
        "NumpadSubtract" => 0x4E,
        "NumpadMultiply" => 0x43,
        "NumpadDivide" => 0x4B,
        "NumpadEnter" => 0x4C,
        "NumpadDecimal" => 0x41,
        "NumLock" => 0x47,
        "IntlBackslash" => 0x0A,
        "Function" => 0x3F,
        _ => return None,
    };
    Some(code)
}

#[cfg(target_os = "macos")]
fn macos_single_char_keycode(name: &str) -> Option<u32> {
    let mut chars = name.chars();
    let first = chars.next()?;
    if chars.next().is_some() {
        return None;
    }

    let code = match first.to_ascii_uppercase() {
        'A' => 0x00,
        'S' => 0x01,
        'D' => 0x02,
        'F' => 0x03,
        'H' => 0x04,
        'G' => 0x05,
        'Z' => 0x06,
        'X' => 0x07,
        'C' => 0x08,
        'V' => 0x09,
        'B' => 0x0B,
        'Q' => 0x0C,
        'W' => 0x0D,
        'E' => 0x0E,
        'R' => 0x0F,
        'Y' => 0x10,
        'T' => 0x11,
        '1' => 0x12,
        '2' => 0x13,
        '3' => 0x14,
        '4' => 0x15,
        '6' => 0x16,
        '5' => 0x17,
        '=' => 0x18,
        '9' => 0x19,
        '7' => 0x1A,
        '-' => 0x1B,
        '8' => 0x1C,
        '0' => 0x1D,
        ']' => 0x1E,
        'O' => 0x1F,
        'U' => 0x20,
        '[' => 0x21,
        'I' => 0x22,
        'P' => 0x23,
        'L' => 0x25,
        'J' => 0x26,
        '\'' => 0x27,
        'K' => 0x28,
        ';' => 0x29,
        '\\' => 0x2A,
        ',' => 0x2B,
        '/' => 0x2C,
        'N' => 0x2D,
        'M' => 0x2E,
        '.' => 0x2F,
        '`' => 0x32,
        _ => return None,
    };
    Some(code)
}

#[cfg(test)]
mod tests {
    use enigo::Key as EnigoKey;

    use crate::model::RecordedKey;

    use super::enigo_key;

    fn key(name: &str) -> RecordedKey {
        RecordedKey::new(name).expect("valid key")
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn macos_recorded_letters_use_layout_independent_keycodes() {
        assert_eq!(enigo_key(&key("S")).expect("key"), EnigoKey::Other(0x01));
        assert_eq!(enigo_key(&key("D")).expect("key"), EnigoKey::Other(0x02));
        assert_eq!(enigo_key(&key("J")).expect("key"), EnigoKey::Other(0x26));
        assert_eq!(enigo_key(&key("K")).expect("key"), EnigoKey::Other(0x28));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn macos_recorded_named_keys_use_layout_independent_keycodes() {
        assert_eq!(
            enigo_key(&key("NumpadEnter")).expect("key"),
            EnigoKey::Other(0x4C)
        );
        assert_eq!(
            enigo_key(&key("AltRight")).expect("key"),
            EnigoKey::Other(0x3D)
        );
        assert_eq!(
            enigo_key(&key("Unknown(123)")).expect("key"),
            EnigoKey::Other(123)
        );
    }
}
