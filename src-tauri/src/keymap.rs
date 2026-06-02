mod enigo;
#[cfg(target_os = "macos")]
mod macos;
mod tap;

#[cfg(test)]
mod tests;

pub use enigo::enigo_key;
pub use tap::tap_key_name;
