use std::path::PathBuf;
use std::sync::Mutex;

use seal_registry::state::State;
use seal_registry::store::Store;
use seal_session::Session;
use tauri::ipc::Response;
use tauri::State as Managed;

use crate::app;
use crate::error::{CommandError, Kind};
use crate::lifecycle::{self, ScanView};
use crate::rekey;
use crate::view::{OpenedFile, RepoView};

pub const RETRY_ATTEMPTS: u8 = 5;

pub struct Held {
    pub session: Mutex<Session>,
    pub registry: Mutex<State>,
    pub store: Store,
    pub directory: PathBuf,
}

impl Held {
    pub fn new(store: Store, registry: State) -> Self {
        let directory = store
            .path()
            .parent()
            .map(std::path::Path::to_path_buf)
            .unwrap_or_default();
        Self {
            session: Mutex::new(Session::new()),
            registry: Mutex::new(registry),
            store,
            directory,
        }
    }

    pub fn wipe(&self) {
        if let Ok(mut session) = self.session.lock() {
            session.wipe();
        }
    }

    pub fn sweep(&self) {
        if let Ok(mut session) = self.session.lock() {
            session.sweep();
        }
    }

    fn session(&self) -> Result<std::sync::MutexGuard<'_, Session>, CommandError> {
        self.session
            .lock()
            .map_err(|_| CommandError::new(Kind::Locked))
    }

    fn registry(&self) -> Result<std::sync::MutexGuard<'_, State>, CommandError> {
        self.registry
            .lock()
            .map_err(|_| CommandError::new(Kind::Registry))
    }

    pub fn ledger(&self) -> rekey::Ledger {
        rekey::Ledger::new(&self.directory)
    }

    pub fn persist(&self, state: &State) -> Result<(), CommandError> {
        let replacement = state.clone();
        self.store.update(RETRY_ATTEMPTS, |on_disk| {
            on_disk.repos = replacement.repos.clone();
            on_disk.acknowledged_irreversibility |= replacement.acknowledged_irreversibility;
        })?;
        Ok(())
    }
}

#[tauri::command]
pub async fn unlock(held: Managed<'_, Held>, passphrase: String) -> Result<(), CommandError> {
    let mut session = held.session()?;
    app::unlock(&mut session, &held.directory, passphrase)
}

#[tauri::command]
pub async fn is_established(held: Managed<'_, Held>) -> Result<bool, CommandError> {
    Ok(app::is_established(&held.directory))
}

#[tauri::command]
pub async fn establish(held: Managed<'_, Held>, passphrase: String) -> Result<(), CommandError> {
    let mut session = held.session()?;
    let registry = held.registry()?;
    app::establish(
        &mut session,
        &held.directory,
        &registry,
        passphrase,
        app::WORK_FACTOR,
    )
}

#[tauri::command]
pub async fn lock(held: Managed<'_, Held>) -> Result<(), CommandError> {
    held.wipe();
    Ok(())
}

#[tauri::command]
pub async fn is_unlocked(held: Managed<'_, Held>) -> Result<bool, CommandError> {
    let mut session = held.session()?;
    Ok(session.is_unlocked())
}

#[tauri::command]
pub async fn overview(held: Managed<'_, Held>) -> Result<Vec<RepoView>, CommandError> {
    let registry = held.registry()?;
    Ok(app::overview(&registry))
}

#[tauri::command]
pub async fn open_file(held: Managed<'_, Held>, path: PathBuf) -> Result<OpenedFile, CommandError> {
    let mut session = held.session()?;
    let registry = held.registry()?;
    app::open_file(&mut session, &path, &registry)
}

#[tauri::command]
pub async fn reveal(
    held: Managed<'_, Held>,
    path: PathBuf,
    key: String,
) -> Result<Response, CommandError> {
    let mut session = held.session()?;
    let value = app::reveal(&mut session, &path, &key)?;
    Ok(Response::new(value))
}

#[tauri::command]
pub async fn save(
    held: Managed<'_, Held>,
    path: PathBuf,
    edits: Vec<(String, String)>,
) -> Result<(), CommandError> {
    let mut session = held.session()?;
    let mut registry = held.registry()?;
    app::save(&mut session, &path, &edits, &mut registry)?;
    held.persist(&registry)
}

#[tauri::command]
pub async fn seal_file(held: Managed<'_, Held>, path: PathBuf) -> Result<(), CommandError> {
    let mut session = held.session()?;
    let mut registry = held.registry()?;
    app::seal_file(&mut session, &path, &mut registry)?;
    held.persist(&registry)
}

#[tauri::command]
pub async fn close_file(held: Managed<'_, Held>, path: PathBuf) -> Result<(), CommandError> {
    let mut session = held.session()?;
    session.close(&path)?;
    Ok(())
}

#[tauri::command]
pub async fn open_paths(held: Managed<'_, Held>) -> Result<Vec<PathBuf>, CommandError> {
    let mut session = held.session()?;
    Ok(session.open_paths())
}

#[tauri::command]
pub async fn scan_folder(held: Managed<'_, Held>, root: PathBuf) -> Result<ScanView, CommandError> {
    let registry = held.registry()?;
    lifecycle::scan_folder(&root, &registry)
}

#[tauri::command]
pub async fn import(
    held: Managed<'_, Held>,
    root: PathBuf,
    selected: Vec<PathBuf>,
) -> Result<usize, CommandError> {
    let mut registry = held.registry()?;
    let added = lifecycle::import(&mut registry, &root, &selected)?;
    held.persist(&registry)?;
    Ok(added)
}

#[tauri::command]
pub async fn release(
    held: Managed<'_, Held>,
    path: PathBuf,
    how: lifecycle::Release,
) -> Result<(), CommandError> {
    let mut session = held.session()?;
    let passphrase = session.passphrase_for(&path)?;
    let mut registry = held.registry()?;
    lifecycle::release(&mut registry, &path, how, &passphrase)?;
    session.close(&path)?;
    held.persist(&registry)
}

#[tauri::command]
pub async fn seal_warning(
    held: Managed<'_, Held>,
    path: PathBuf,
) -> Result<Option<lifecycle::SealWarning>, CommandError> {
    let _registry = held.registry()?;
    Ok(lifecycle::seal_warning(&path))
}

#[tauri::command]
pub async fn has_acknowledged(held: Managed<'_, Held>) -> Result<bool, CommandError> {
    let registry = held.registry()?;
    Ok(registry.acknowledged_irreversibility)
}

#[tauri::command]
pub async fn acknowledge(held: Managed<'_, Held>) -> Result<(), CommandError> {
    let mut registry = held.registry()?;
    lifecycle::acknowledge(&mut registry);
    held.persist(&registry)
}

#[tauri::command]
pub async fn rekey_status(
    held: Managed<'_, Held>,
) -> Result<Option<rekey::Manifest>, CommandError> {
    held.ledger().read()
}

#[tauri::command]
pub async fn rekey_begin(held: Managed<'_, Held>) -> Result<rekey::Manifest, CommandError> {
    let registry = held.registry()?;
    let mut paths = Vec::new();
    if app::is_established(&held.directory) {
        paths.push(app::sentinel_path(&held.directory));
    }
    paths.extend(registry.managed_paths());
    rekey::begin(&held.ledger(), paths, app::WORK_FACTOR)
}

#[tauri::command]
pub async fn rekey_run(
    held: Managed<'_, Held>,
    current: String,
    replacement: String,
) -> Result<rekey::Manifest, CommandError> {
    let from = age::secrecy::SecretString::from(current);
    let to = age::secrecy::SecretString::from(replacement);

    let manifest = rekey::run(&held.ledger(), &from, &to)?;

    if manifest.is_complete() {
        let mut session = held.session()?;
        session.unlock(to)?;
    }

    Ok(manifest)
}

#[tauri::command]
pub async fn rekey_abandon(held: Managed<'_, Held>) -> Result<(), CommandError> {
    held.ledger().clear()
}
