use std::path::PathBuf;

use seal_engine::format::Classification;
use seal_engine::operations::{self, OperationError};

use crate::state::{Fingerprint, ManagedFile, SealedState, State};

#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub enum Divergence {
    BecamePlaintext { fingerprint_changed: bool },
    BecameSealed,
    Missing,
    Unreadable { reason: String },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Finding {
    pub repo_root: PathBuf,
    pub path: PathBuf,
    pub recorded: SealedState,
    pub observed: SealedState,
    pub divergence: Divergence,
}

impl Finding {
    pub fn demands_attention(&self) -> bool {
        matches!(self.divergence, Divergence::BecamePlaintext { .. })
    }
}

#[derive(Debug, Default)]
pub struct Reconciliation {
    pub findings: Vec<Finding>,
    pub checked: usize,
}

impl Reconciliation {
    pub fn is_in_sync(&self) -> bool {
        self.findings.is_empty()
    }

    pub fn alarming(&self) -> impl Iterator<Item = &Finding> {
        self.findings.iter().filter(|f| f.demands_attention())
    }
}

pub fn reconcile(state: &State) -> Reconciliation {
    let mut result = Reconciliation::default();

    for repo in &state.repos {
        for file in &repo.files {
            let path = repo.root.join(&file.relative_path);
            result.checked += 1;

            let observed = observe(&path);
            if let Some(divergence) = diverges(file, observed, &path) {
                result.findings.push(Finding {
                    repo_root: repo.root.clone(),
                    path,
                    recorded: file.last_known,
                    observed: observed.state(),
                    divergence,
                });
            }
        }
    }

    result
}

pub fn apply(state: &mut State, reconciliation: &Reconciliation) {
    for finding in &reconciliation.findings {
        if finding.demands_attention() {
            continue;
        }

        let Some(repo) = state.repo_mut(&finding.repo_root) else {
            continue;
        };
        let Ok(relative) = finding.path.strip_prefix(&finding.repo_root) else {
            continue;
        };
        let Some(file) = repo
            .files
            .iter_mut()
            .find(|file| file.relative_path == relative)
        else {
            continue;
        };

        file.last_known = finding.observed;
        if finding.observed == SealedState::Sealed {
            file.fingerprint = current_fingerprint(&finding.path);
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Observed {
    Sealed,
    Plaintext,
    Missing,
    Unreadable,
}

impl Observed {
    fn state(self) -> SealedState {
        match self {
            Self::Sealed => SealedState::Sealed,
            Self::Plaintext => SealedState::Plaintext,
            Self::Missing => SealedState::Missing,
            Self::Unreadable => SealedState::Unknown,
        }
    }
}

fn observe(path: &std::path::Path) -> Observed {
    match operations::classify(path) {
        Ok(Classification::Sealed { .. }) => Observed::Sealed,
        Ok(Classification::Plaintext) => Observed::Plaintext,
        Ok(_) => Observed::Unreadable,
        Err(OperationError::Absent { .. }) => Observed::Missing,
        Err(_) => Observed::Unreadable,
    }
}

fn diverges(file: &ManagedFile, observed: Observed, path: &std::path::Path) -> Option<Divergence> {
    match (file.last_known, observed) {
        (SealedState::Sealed, Observed::Plaintext) => Some(Divergence::BecamePlaintext {
            fingerprint_changed: fingerprint_changed(file, path),
        }),
        (SealedState::Plaintext, Observed::Sealed) => Some(Divergence::BecameSealed),
        (SealedState::Unknown, Observed::Sealed) => Some(Divergence::BecameSealed),
        (SealedState::Unknown, Observed::Plaintext) => Some(Divergence::BecamePlaintext {
            fingerprint_changed: false,
        }),
        (_, Observed::Missing) if file.last_known != SealedState::Missing => {
            Some(Divergence::Missing)
        }
        (_, Observed::Unreadable) => Some(Divergence::Unreadable {
            reason: "the file could not be read".to_owned(),
        }),
        _ => None,
    }
}

fn fingerprint_changed(file: &ManagedFile, path: &std::path::Path) -> bool {
    let Some(recorded) = file.fingerprint else {
        return false;
    };
    match current_fingerprint(path) {
        Some(current) => current != recorded,
        None => true,
    }
}

fn current_fingerprint(path: &std::path::Path) -> Option<Fingerprint> {
    use std::os::unix::fs::MetadataExt;

    let meta = std::fs::metadata(path).ok()?;
    Some(Fingerprint {
        device: meta.dev(),
        inode: meta.ino(),
        size: meta.size(),
        modified_secs: meta.mtime(),
        modified_nanos: meta.mtime_nsec(),
    })
}
