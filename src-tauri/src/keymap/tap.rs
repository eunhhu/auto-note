use keytap::{Key as TapKey, RawCode};

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
