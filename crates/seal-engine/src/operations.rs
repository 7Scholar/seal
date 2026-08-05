use std::fs::File;
use std::io::{self, Seek, Write};
use std::path::{Path, PathBuf};

use age::secrecy::SecretString;

use crate::format::{self, Classification, FormatError};
use crate::lock::{FileLock, LockError};
use crate::replace::{Durability, Identity, RealFileSystem, ReplaceError, Replacement};

#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum OperationError {
    #[error("{path} is already sealed")]
    AlreadySealed { path: PathBuf },
    #[error("{path} is not sealed")]
    NotSealed { path: PathBuf },
    #[error("{path} does not exist")]
    Absent { path: PathBuf },
    #[error("{path} is in use by another operation")]
    Busy { path: PathBuf },
    #[error("no candidate passphrase opened {path}")]
    NoMatchingPassphrase { path: PathBuf },
    #[error("{path} is damaged or truncated")]
    Damaged { path: PathBuf },
    #[error("{path} was sealed with an unacceptable work factor")]
    UnacceptableWork { path: PathBuf },
    #[error("{path} is a symbolic link")]
    SymlinkTarget { path: PathBuf },
    #[error("could not complete the operation on {path}")]
    Io {
        path: PathBuf,
        #[source]
        source: io::Error,
    },
}

impl OperationError {
    fn from_format(path: &Path, error: FormatError) -> Self {
        let path = path.to_path_buf();
        match error {
            FormatError::NoMatchingPassphrase => Self::NoMatchingPassphrase { path },
            FormatError::NotSealed => Self::NotSealed { path },
            FormatError::Damaged => Self::Damaged { path },
            FormatError::ExcessiveWork
            | FormatError::InsufficientWork
            | FormatError::UnsupportedWorkFactor { .. } => Self::UnacceptableWork { path },
            FormatError::Io(source) => Self::Io { path, source },
        }
    }

    fn from_replace(error: ReplaceError) -> Self {
        match error {
            ReplaceError::SymlinkTarget { path } => Self::SymlinkTarget { path },
            ReplaceError::Io { path, source, .. } => Self::Io { path, source },
        }
    }

    fn from_lock(error: LockError) -> Self {
        match error {
            LockError::Busy { path } => Self::Busy { path },
            LockError::Io { path, source } => Self::Io { path, source },
        }
    }
}

#[derive(Debug)]
pub struct SealOutcome {
    pub identity: Identity,
}

#[derive(Debug)]
pub struct UnsealOutcome {
    pub candidate: usize,
    pub work_factor: u8,
}

pub fn classify(path: &Path) -> Result<Classification, OperationError> {
    let file = open(path)?;
    format::classify(file).map_err(|source| OperationError::Io {
        path: path.to_path_buf(),
        source,
    })
}

pub fn seal(
    path: &Path,
    passphrase: &SecretString,
    work_factor: u8,
) -> Result<SealOutcome, OperationError> {
    let _lock = FileLock::acquire(path).map_err(OperationError::from_lock)?;

    let mut source = open(path)?;
    if let Classification::Sealed { .. } = classify_handle(path, &mut source)? {
        return Err(OperationError::AlreadySealed {
            path: path.to_path_buf(),
        });
    }
    let identity = Replacement::new(&RealFileSystem::new(), Durability::Full)
        .run(path, |sink| {
            format::seal(&mut source, sink, passphrase, work_factor)
                .map_err(|err| io::Error::other(err.to_string()))
        })
        .map_err(OperationError::from_replace)?;

    Ok(SealOutcome { identity })
}

pub fn unseal_to<W: Write>(
    path: &Path,
    sink: W,
    candidates: &[SecretString],
) -> Result<UnsealOutcome, OperationError> {
    let _lock = FileLock::acquire(path).map_err(OperationError::from_lock)?;

    let sealed = open(path)?;
    let opened = format::unseal(sealed, sink, candidates)
        .map_err(|err| OperationError::from_format(path, err))?;

    Ok(UnsealOutcome {
        candidate: opened.candidate,
        work_factor: opened.work_factor,
    })
}

pub fn reseal_from_memory(
    path: &Path,
    plaintext: &[u8],
    passphrase: &SecretString,
    work_factor: u8,
) -> Result<SealOutcome, OperationError> {
    replace_with_sealed(path, plaintext, passphrase, work_factor, true)
}

pub fn seal_from_memory(
    path: &Path,
    plaintext: &[u8],
    passphrase: &SecretString,
    work_factor: u8,
) -> Result<SealOutcome, OperationError> {
    replace_with_sealed(path, plaintext, passphrase, work_factor, false)
}

fn replace_with_sealed(
    path: &Path,
    plaintext: &[u8],
    passphrase: &SecretString,
    work_factor: u8,
    require_sealed: bool,
) -> Result<SealOutcome, OperationError> {
    let _lock = FileLock::acquire(path).map_err(OperationError::from_lock)?;

    let mut source = open(path)?;
    if let Classification::Plaintext = classify_handle(path, &mut source)? {
        if require_sealed {
            return Err(OperationError::NotSealed {
                path: path.to_path_buf(),
            });
        }
    }
    drop(source);

    let identity = Replacement::new(&RealFileSystem::new(), Durability::Full)
        .run(path, |sink| {
            format::seal(plaintext, sink, passphrase, work_factor)
                .map_err(|err| io::Error::other(err.to_string()))
        })
        .map_err(OperationError::from_replace)?;

    Ok(SealOutcome { identity })
}

pub fn release_to_plaintext(
    path: &Path,
    candidates: &[SecretString],
) -> Result<Identity, OperationError> {
    let _lock = FileLock::acquire(path).map_err(OperationError::from_lock)?;

    let mut plaintext = Vec::new();
    {
        let sealed = open(path)?;
        format::unseal(sealed, &mut plaintext, candidates)
            .map_err(|err| OperationError::from_format(path, err))?;
    }

    Replacement::new(&RealFileSystem::new(), Durability::Full)
        .run(path, |sink| sink.write_all(&plaintext))
        .map_err(OperationError::from_replace)
}

pub fn verify(path: &Path, candidates: &[SecretString]) -> Result<usize, OperationError> {
    let outcome = unseal_to(path, io::sink(), candidates)?;
    Ok(outcome.candidate)
}

fn open(path: &Path) -> Result<File, OperationError> {
    File::open(path).map_err(|source| match source.kind() {
        io::ErrorKind::NotFound => OperationError::Absent {
            path: path.to_path_buf(),
        },
        _ => OperationError::Io {
            path: path.to_path_buf(),
            source,
        },
    })
}

fn classify_handle(path: &Path, file: &mut File) -> Result<Classification, OperationError> {
    let io_error = |source: io::Error| OperationError::Io {
        path: path.to_path_buf(),
        source,
    };

    let classification = format::classify(&mut *file).map_err(io_error)?;
    file.rewind().map_err(io_error)?;
    Ok(classification)
}

#[cfg(test)]
mod payload_safety {
    use super::*;

    trait CannotCarrySecrets {}
    impl CannotCarrySecrets for PathBuf {}
    impl CannotCarrySecrets for io::Error {}

    fn assert_safe<T: CannotCarrySecrets>(_: &T) {}

    #[test]
    fn every_error_variant_carries_only_payloads_that_cannot_hold_secrets() {
        let path = PathBuf::from("/tmp/example");
        let sample = OperationError::Absent { path: path.clone() };

        match &sample {
            OperationError::AlreadySealed { path }
            | OperationError::NotSealed { path }
            | OperationError::Absent { path }
            | OperationError::Busy { path }
            | OperationError::NoMatchingPassphrase { path }
            | OperationError::Damaged { path }
            | OperationError::UnacceptableWork { path }
            | OperationError::SymlinkTarget { path } => assert_safe(path),
            OperationError::Io { path, source } => {
                assert_safe(path);
                assert_safe(source);
            }
        }
    }
}
