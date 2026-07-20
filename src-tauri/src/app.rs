use std::path::{Path, PathBuf};

use age::secrecy::SecretString;
use seal_engine::operations;
use seal_registry::state::{SealedState, State};
use seal_registry::{reconcile, scan};
use seal_session::{Plaintext, Session};

use crate::error::{CommandError, Kind};
use crate::view::{self, EnvView, FileView, RepoView};

pub const WORK_FACTOR: u8 = 18;

pub fn overview(state: &State) -> Vec<RepoView> {
    let reconciliation = reconcile::reconcile(state);

    state
        .repos
        .iter()
        .map(|repo| RepoView {
            root: repo.root.clone(),
            name: view::repo_name(&repo.root),
            files: repo
                .files
                .iter()
                .map(|file| {
                    let absolute = repo.root.join(&file.relative_path);
                    let alert = reconciliation.findings.iter().any(|finding| {
                        finding.path == absolute
                            && matches!(
                                finding.divergence,
                                reconcile::Divergence::BecamePlaintext { .. }
                            )
                    });
                    FileView {
                        relative_path: file.relative_path.clone(),
                        state: file.last_known,
                        alert,
                    }
                })
                .collect(),
        })
        .collect()
}

pub fn candidates(root: &Path) -> Vec<scan::Candidate> {
    scan::scan(root)
}

pub fn seal_file(
    session: &mut Session,
    path: &Path,
    state: &mut State,
) -> Result<(), CommandError> {
    require_managed(state, path)?;
    let passphrase = session.passphrase_for(path)?;

    match operations::classify(path)? {
        seal_engine::format::Classification::Sealed { .. } => {}
        _ => {
            operations::seal(path, &passphrase, WORK_FACTOR)?;
        }
    }

    session.close(path)?;
    record(state, path, SealedState::Sealed);
    Ok(())
}

pub fn open_file(
    session: &mut Session,
    path: &Path,
    state: &State,
) -> Result<EnvView, CommandError> {
    require_managed_ref(state, path)?;
    let passphrase = session.passphrase_for(path)?;

    let mut plaintext = Vec::new();
    operations::unseal_to(path, &mut plaintext, &[passphrase])?;

    let held = Plaintext::new(plaintext);
    let rendered = view::env_view(path, held.as_bytes());
    session.open(path, held)?;

    Ok(rendered)
}

pub fn reveal(session: &mut Session, path: &Path, key: &str) -> Result<Vec<u8>, CommandError> {
    let plaintext = session.plaintext(path)?;
    view::value_of(plaintext, key)
        .map(String::into_bytes)
        .ok_or_else(|| CommandError::at(Kind::UnknownKey, path))
}

pub fn save(
    session: &mut Session,
    path: &Path,
    edits: &[(String, String)],
    state: &mut State,
) -> Result<(), CommandError> {
    require_managed(state, path)?;
    let passphrase = session.passphrase_for(path)?;

    let updated = {
        let plaintext = session.plaintext(path)?;
        view::apply_edits(plaintext, edits)
            .ok_or_else(|| CommandError::at(Kind::UnknownKey, path))?
    };

    operations::reseal_from_memory(path, &updated, &passphrase, WORK_FACTOR)?;
    session.open(path, Plaintext::new(updated))?;
    record(state, path, SealedState::Sealed);
    Ok(())
}

fn require_managed(state: &mut State, path: &Path) -> Result<(), CommandError> {
    require_managed_ref(state, path)
}

fn require_managed_ref(state: &State, path: &Path) -> Result<(), CommandError> {
    let known = state.repos.iter().any(|repo| {
        repo.files
            .iter()
            .any(|file| repo.root.join(&file.relative_path) == path)
    });

    if known {
        Ok(())
    } else {
        Err(CommandError::at(Kind::NotManaged, path))
    }
}

fn record(state: &mut State, path: &Path, sealed: SealedState) {
    for repo in &mut state.repos {
        for file in &mut repo.files {
            if repo.root.join(&file.relative_path) == path {
                file.last_known = sealed;
            }
        }
    }
}

pub fn unlock(session: &mut Session, passphrase: String) -> Result<(), CommandError> {
    session.unlock(SecretString::from(passphrase))?;
    Ok(())
}

pub fn managed_paths(state: &State) -> Vec<PathBuf> {
    state
        .repos
        .iter()
        .flat_map(|repo| {
            repo.files
                .iter()
                .map(|file| repo.root.join(&file.relative_path))
        })
        .collect()
}
