use std::{
    sync::OnceLock,
    time::{Duration, Instant},
};

const NS_PER_MS: u64 = 1_000_000;

static ORIGIN: OnceLock<Instant> = OnceLock::new();

pub fn now_ns() -> u64 {
    duration_ns(origin().elapsed())
}

pub fn instant_ns(instant: Instant) -> u64 {
    let start = origin();
    if instant >= start {
        duration_ns(instant.duration_since(start))
    } else {
        0
    }
}

pub const fn ms_to_ns(value: u64) -> u64 {
    value.saturating_mul(NS_PER_MS)
}

fn origin() -> Instant {
    *ORIGIN.get_or_init(Instant::now)
}

fn duration_ns(duration: Duration) -> u64 {
    u64::try_from(duration.as_nanos()).unwrap_or(u64::MAX)
}
