pub mod clock;

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use age::secrecy::SecretString;
use zeroize::Zeroize;

use crate::clock::{Clock, Deadline, Reading, SystemClock};

pub const DEFAULT_LIFETIME: Duration = Duration::from_secs(15 * 60);

#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum SessionError {
    #[error("the session is locked")]
    Locked,
    #[error("no file is open at {path}")]
    NotOpen { path: PathBuf },
    #[error("the clock could not be read")]
    UnreadableClock,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum Lifecycle {
    Active,
    Expired,
}

struct Held<T> {
    value: T,
    deadline: Deadline,
}

pub struct Plaintext(Vec<u8>);

impl Plaintext {
    pub fn new(bytes: Vec<u8>) -> Self {
        Self(bytes)
    }

    pub fn as_bytes(&self) -> &[u8] {
        &self.0
    }

    pub fn wipe(&mut self) {
        self.0.zeroize();
    }
}

impl Drop for Plaintext {
    fn drop(&mut self) {
        self.0.zeroize();
    }
}

struct Unlocked {
    passphrase: SecretString,
    overrides: HashMap<PathBuf, SecretString>,
    open: HashMap<PathBuf, Held<Plaintext>>,
}

pub struct Session {
    clock: Arc<dyn Clock>,
    lifetime: Duration,
    unlocked: Option<Unlocked>,
}

impl Session {
    pub fn new() -> Self {
        Self::with_clock(Arc::new(SystemClock::new()), DEFAULT_LIFETIME)
    }

    pub fn with_clock(clock: Arc<dyn Clock>, lifetime: Duration) -> Self {
        Self {
            clock,
            lifetime,
            unlocked: None,
        }
    }

    pub fn unlock(&mut self, passphrase: SecretString) -> Result<(), SessionError> {
        self.now()?;
        self.wipe();
        self.unlocked = Some(Unlocked {
            passphrase,
            overrides: HashMap::new(),
            open: HashMap::new(),
        });
        Ok(())
    }

    pub fn is_unlocked(&mut self) -> bool {
        self.active().is_ok()
    }

    pub fn passphrase(&mut self) -> Result<SecretString, SessionError> {
        let unlocked = self.active()?;
        Ok(unlocked.passphrase.clone())
    }

    pub fn passphrase_for(&mut self, path: &Path) -> Result<SecretString, SessionError> {
        let unlocked = self.active()?;
        Ok(unlocked
            .overrides
            .get(path)
            .unwrap_or(&unlocked.passphrase)
            .clone())
    }

    pub fn set_override(
        &mut self,
        path: impl Into<PathBuf>,
        passphrase: SecretString,
    ) -> Result<(), SessionError> {
        let unlocked = self.active()?;
        unlocked.overrides.insert(path.into(), passphrase);
        Ok(())
    }

    pub fn open(
        &mut self,
        path: impl Into<PathBuf>,
        plaintext: Plaintext,
    ) -> Result<(), SessionError> {
        let now = self.now()?;
        let lifetime = self.lifetime;
        let unlocked = self.active()?;
        let deadline = Deadline::after(now, lifetime).ok_or(SessionError::UnreadableClock)?;
        unlocked.open.insert(
            path.into(),
            Held {
                value: plaintext,
                deadline,
            },
        );
        Ok(())
    }

    pub fn plaintext(&mut self, path: &Path) -> Result<&[u8], SessionError> {
        let now = self.now()?;
        let lifetime = self.lifetime;
        let unlocked = self.active()?;

        let expired = unlocked
            .open
            .get(path)
            .is_some_and(|held| held.deadline.has_passed(now));
        if expired {
            unlocked.open.remove(path);
        }

        let held = unlocked
            .open
            .get_mut(path)
            .ok_or_else(|| SessionError::NotOpen {
                path: path.to_path_buf(),
            })?;

        held.deadline = Deadline::after(now, lifetime).ok_or(SessionError::UnreadableClock)?;
        Ok(held.value.as_bytes())
    }

    pub fn close(&mut self, path: &Path) -> Result<(), SessionError> {
        let unlocked = self.active()?;
        unlocked.open.remove(path);
        Ok(())
    }

    pub fn open_paths(&mut self) -> Vec<PathBuf> {
        match self.active() {
            Ok(unlocked) => {
                let mut paths: Vec<PathBuf> = unlocked.open.keys().cloned().collect();
                paths.sort();
                paths
            }
            Err(_) => Vec::new(),
        }
    }

    pub fn sweep(&mut self) -> Lifecycle {
        let Ok(now) = self.now() else {
            self.wipe();
            return Lifecycle::Expired;
        };

        let Ok(unlocked) = self.active() else {
            return Lifecycle::Expired;
        };

        unlocked
            .open
            .retain(|_, held| !held.deadline.has_passed(now));
        Lifecycle::Active
    }

    pub fn wipe(&mut self) {
        if let Some(mut unlocked) = self.unlocked.take() {
            unlocked.open.clear();
            unlocked.overrides.clear();
            drop(unlocked);
        }
    }

    fn now(&self) -> Result<Reading, SessionError> {
        self.clock.read().ok_or(SessionError::UnreadableClock)
    }

    fn active(&mut self) -> Result<&mut Unlocked, SessionError> {
        self.now()?;
        self.unlocked.as_mut().ok_or(SessionError::Locked)
    }
}

impl Default for Session {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for Session {
    fn drop(&mut self) {
        self.wipe();
    }
}
