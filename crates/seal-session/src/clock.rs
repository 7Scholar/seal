use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Reading {
    pub wall: Duration,
    pub monotonic: Duration,
}

pub trait Clock: Send + Sync + 'static {
    fn read(&self) -> Option<Reading>;
}

#[derive(Debug, Default, Clone, Copy)]
pub struct SystemClock;

impl SystemClock {
    pub fn new() -> Self {
        Self
    }
}

impl Clock for SystemClock {
    fn read(&self) -> Option<Reading> {
        let wall = SystemTime::now().duration_since(UNIX_EPOCH).ok()?;
        let monotonic = Instant::now()
            .checked_duration_since(*origin())
            .unwrap_or_default();
        Some(Reading { wall, monotonic })
    }
}

fn origin() -> &'static Instant {
    use std::sync::OnceLock;
    static ORIGIN: OnceLock<Instant> = OnceLock::new();
    ORIGIN.get_or_init(Instant::now)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Deadline {
    wall: Duration,
    monotonic: Duration,
}

impl Deadline {
    pub fn after(now: Reading, lifetime: Duration) -> Option<Self> {
        Some(Self {
            wall: now.wall.checked_add(lifetime)?,
            monotonic: now.monotonic.checked_add(lifetime)?,
        })
    }

    pub fn has_passed(&self, now: Reading) -> bool {
        now.wall >= self.wall || now.monotonic >= self.monotonic
    }

    pub fn remaining(&self, now: Reading) -> Duration {
        let wall = self.wall.saturating_sub(now.wall);
        let monotonic = self.monotonic.saturating_sub(now.monotonic);
        wall.min(monotonic)
    }
}
