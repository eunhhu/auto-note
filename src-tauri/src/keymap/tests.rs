#[cfg(target_os = "macos")]
use crate::model::RecordedKey;

#[cfg(target_os = "macos")]
use super::enigo_key;

#[cfg(target_os = "macos")]
fn key(name: &str) -> RecordedKey {
    RecordedKey::new(name).expect("valid key")
}

#[cfg(target_os = "macos")]
#[test]
fn macos_recorded_letters_use_layout_independent_keycodes() {
    use enigo::Key as EnigoKey;

    assert_eq!(enigo_key(&key("S")).expect("key"), EnigoKey::Other(0x01));
    assert_eq!(enigo_key(&key("D")).expect("key"), EnigoKey::Other(0x02));
    assert_eq!(enigo_key(&key("J")).expect("key"), EnigoKey::Other(0x26));
    assert_eq!(enigo_key(&key("K")).expect("key"), EnigoKey::Other(0x28));
}

#[cfg(target_os = "macos")]
#[test]
fn macos_recorded_named_keys_use_layout_independent_keycodes() {
    use enigo::Key as EnigoKey;

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
