use std::fs;
use std::path::{Path, PathBuf};

use age::secrecy::SecretString;
use seal_engine::format::Classification;
use seal_engine::operations;
use seal_registry::reconcile;
use seal_registry::state::{SealedState, State};
use seal_session::{Plaintext, Session};

use crate::error::{CommandError, Kind};
use crate::view::{self, FileView, OpenedFile, RepoView};

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

pub fn seal_file(
    session: &mut Session,
    path: &Path,
    state: &mut State,
) -> Result<(), CommandError> {
    require_managed(state, path)?;
    crate::lifecycle::require_acknowledgement(state)?;
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
) -> Result<OpenedFile, CommandError> {
    require_managed_ref(state, path)?;
    let passphrase = session.passphrase_for(path)?;

    let mut plaintext = Vec::new();
    operations::unseal_to(path, &mut plaintext, &[passphrase])?;

    let held = Plaintext::new(plaintext);
    let opened = if view::is_editable(path) {
        OpenedFile::Env(view::env_view(path, held.as_bytes()))
    } else {
        OpenedFile::Opaque {
            path: path.to_path_buf(),
            bytes: held.as_bytes().len(),
        }
    };
    session.open(path, held)?;

    Ok(opened)
}

pub fn reveal(session: &mut Session, path: &Path, key: &str) -> Result<Vec<u8>, CommandError> {
    if !view::is_editable(path) {
        return Err(CommandError::at(Kind::NotAnEnvFile, path));
    }
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
    crate::lifecycle::require_acknowledgement(state)?;
    if !view::is_editable(path) {
        return Err(CommandError::at(Kind::NotAnEnvFile, path));
    }
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

pub const SENTINEL_FILE: &str = "password-check.age";
pub const SENTINEL_CONTENT: &[u8] =
    b"This file lets Seal check the master password. It holds no secret.\n";

pub fn sentinel_path(directory: &Path) -> PathBuf {
    directory.join(SENTINEL_FILE)
}

pub fn is_established(directory: &Path) -> bool {
    matches!(
        operations::classify(&sentinel_path(directory)),
        Ok(Classification::Sealed { .. })
    )
}

pub fn establish(
    session: &mut Session,
    directory: &Path,
    state: &State,
    passphrase: String,
    work_factor: u8,
) -> Result<(), CommandError> {
    let path = sentinel_path(directory);
    if is_established(directory) {
        return Err(CommandError::at(Kind::AlreadyEstablished, path));
    }

    let secret = SecretString::from(passphrase);
    if let Some(sealed) = recorded_sealed_on_disk(state) {
        operations::verify(&sealed, std::slice::from_ref(&secret))?;
    }

    fs::create_dir_all(directory).map_err(|_| CommandError::at(Kind::Io, directory))?;
    fs::write(&path, SENTINEL_CONTENT).map_err(|_| CommandError::at(Kind::Io, &path))?;
    operations::seal(&path, &secret, work_factor)?;

    session.unlock(secret)?;
    Ok(())
}

pub fn unlock(
    session: &mut Session,
    directory: &Path,
    passphrase: String,
) -> Result<(), CommandError> {
    let path = sentinel_path(directory);
    if !is_established(directory) {
        return Err(CommandError::at(Kind::NotEstablished, path));
    }

    let secret = SecretString::from(passphrase);
    operations::verify(&path, std::slice::from_ref(&secret))?;
    session.unlock(secret)?;
    Ok(())
}

fn recorded_sealed_on_disk(state: &State) -> Option<PathBuf> {
    state
        .repos
        .iter()
        .flat_map(|repo| {
            repo.files
                .iter()
                .filter(|file| file.last_known == SealedState::Sealed)
                .map(move |file| repo.root.join(&file.relative_path))
        })
        .find(|path| {
            matches!(
                operations::classify(path),
                Ok(Classification::Sealed { .. })
            )
        })
}
