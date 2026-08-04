use std::io;
use std::path::{Path, PathBuf};

use age::secrecy::SecretString;

use crate::format::{self, Classification};
use crate::operations::{self, OperationError};

pub const DEFAULT_ATTEMPTS: u8 = 3;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum FileState {
    Converted,
    AlreadyUnderNewPassphrase,
}

#[derive(Debug)]
pub struct Converted {
    pub path: PathBuf,
    pub state: FileState,
}

#[derive(Debug)]
pub struct Unfinished {
    pub path: PathBuf,
    pub attempts: u8,
    pub reason: OperationError,
}

impl Unfinished {
    pub fn is_retryable(&self) -> bool {
        is_transient(&self.reason)
    }
}

#[derive(Debug)]
pub enum Settled<'a> {
    Converted(&'a Converted),
    Unfinished(&'a Unfinished),
}

#[derive(Debug, Default)]
pub struct Report {
    pub converted: Vec<Converted>,
    pub unfinished: Vec<Unfinished>,
}

impl Report {
    pub fn is_complete(&self) -> bool {
        self.unfinished.is_empty()
    }
}

#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum PlanError {
    #[error("the new passphrase could not be proved usable")]
    NewPassphraseUnusable,
    #[error("{path} cannot be re-sealed")]
    Unusable {
        path: PathBuf,
        #[source]
        reason: OperationError,
    },
}

pub fn is_transient(error: &OperationError) -> bool {
    match error {
        OperationError::Busy { .. } => true,
        OperationError::Io { source, .. } => matches!(
            source.kind(),
            io::ErrorKind::Interrupted
                | io::ErrorKind::WouldBlock
                | io::ErrorKind::TimedOut
                | io::ErrorKind::PermissionDenied
        ),
        _ => false,
    }
}

pub fn prove_passphrase(passphrase: &SecretString, work_factor: u8) -> Result<(), PlanError> {
    const CANARY: &[u8] = b"seal round-trip canary";

    let mut sealed = Vec::new();
    format::seal(CANARY, &mut sealed, passphrase, work_factor)
        .map_err(|_| PlanError::NewPassphraseUnusable)?;

    let mut recovered = Vec::new();
    format::unseal(
        io::Cursor::new(&sealed[..]),
        &mut recovered,
        std::slice::from_ref(passphrase),
    )
    .map_err(|_| PlanError::NewPassphraseUnusable)?;

    if recovered == CANARY {
        Ok(())
    } else {
        Err(PlanError::NewPassphraseUnusable)
    }
}

pub fn plan(paths: &[PathBuf]) -> Result<Vec<PathBuf>, PlanError> {
    let mut planned = Vec::with_capacity(paths.len());

    for path in paths {
        match operations::classify(path) {
            Ok(Classification::Sealed { .. }) => planned.push(path.clone()),
            Ok(Classification::Plaintext) => {
                return Err(PlanError::Unusable {
                    path: path.clone(),
                    reason: OperationError::NotSealed { path: path.clone() },
                })
            }
            Err(reason) => {
                return Err(PlanError::Unusable {
                    path: path.clone(),
                    reason,
                })
            }
        }
    }

    Ok(planned)
}

pub fn reseal(
    paths: &[PathBuf],
    from: &SecretString,
    to: &SecretString,
    work_factor: u8,
    attempts: u8,
) -> Result<Report, PlanError> {
    reseal_observed(paths, from, to, work_factor, attempts, |_| {})
}

pub fn reseal_observed(
    paths: &[PathBuf],
    from: &SecretString,
    to: &SecretString,
    work_factor: u8,
    attempts: u8,
    mut settled: impl FnMut(Settled<'_>),
) -> Result<Report, PlanError> {
    prove_passphrase(to, work_factor)?;
    let planned = plan(paths)?;

    let mut report = Report::default();
    let candidates = [to.clone(), from.clone()];

    for path in planned {
        match reseal_one(&path, &candidates, to, work_factor, attempts.max(1)) {
            Ok(state) => {
                let converted = Converted { path, state };
                settled(Settled::Converted(&converted));
                report.converted.push(converted);
            }
            Err((attempts, reason)) => {
                let unfinished = Unfinished {
                    path,
                    attempts,
                    reason,
                };
                settled(Settled::Unfinished(&unfinished));
                report.unfinished.push(unfinished);
            }
        }
    }

    Ok(report)
}

fn reseal_one(
    path: &Path,
    candidates: &[SecretString; 2],
    to: &SecretString,
    work_factor: u8,
    attempts: u8,
) -> Result<FileState, (u8, OperationError)> {
    let mut last = None;

    for attempt in 1..=attempts {
        match attempt_once(path, candidates, to, work_factor) {
            Ok(state) => return Ok(state),
            Err(error) => {
                let retryable = is_transient(&error);
                last = Some(error);
                if !retryable {
                    break;
                }
                let _ = attempt;
            }
        }
    }

    let reason = last.unwrap_or(OperationError::Absent {
        path: path.to_path_buf(),
    });
    Err((attempts, reason))
}

fn attempt_once(
    path: &Path,
    candidates: &[SecretString; 2],
    to: &SecretString,
    work_factor: u8,
) -> Result<FileState, OperationError> {
    let mut plaintext = zeroize::Zeroizing::new(Vec::new());
    let opened = operations::unseal_to(path, &mut *plaintext, candidates)?;

    if opened.candidate == 0 {
        return Ok(FileState::AlreadyUnderNewPassphrase);
    }

    operations::reseal_from_memory(path, &plaintext, to, work_factor)?;
    Ok(FileState::Converted)
}
