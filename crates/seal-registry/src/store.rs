use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use crate::state::{State, CURRENT_VERSION};

const STATE_FILE: &str = "registry.json";
const BACKUP_FILE: &str = "registry.json.previous";

#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum StoreError {
    #[error("the registry at {path} is from a newer version of Seal and will not be modified")]
    FromTheFuture { path: PathBuf, version: u32 },
    #[error("the registry at {path} could not be understood")]
    Unreadable {
        path: PathBuf,
        #[source]
        source: serde_json::Error,
    },
    #[error("the registry at {path} could not be read or written")]
    Io {
        path: PathBuf,
        #[source]
        source: io::Error,
    },
    #[error("the registry changed underneath this operation after {attempts} attempts")]
    Contended { attempts: u8 },
}

#[derive(Debug, Clone)]
pub struct Store {
    directory: PathBuf,
}

impl Store {
    pub fn new(directory: PathBuf) -> Self {
        Self { directory }
    }

    pub fn path(&self) -> PathBuf {
        self.directory.join(STATE_FILE)
    }

    fn backup_path(&self) -> PathBuf {
        self.directory.join(BACKUP_FILE)
    }

    fn io_error(path: &Path) -> impl FnOnce(io::Error) -> StoreError + use<'_> {
        move |source| StoreError::Io {
            path: path.to_path_buf(),
            source,
        }
    }

    pub fn load(&self) -> Result<State, StoreError> {
        let path = self.path();

        let bytes = match fs::read(&path) {
            Ok(bytes) => bytes,
            Err(err) if err.kind() == io::ErrorKind::NotFound => return Ok(State::default()),
            Err(err) => return Err(Self::io_error(&path)(err)),
        };

        let state: State =
            serde_json::from_slice(&bytes).map_err(|source| StoreError::Unreadable {
                path: path.clone(),
                source,
            })?;

        Ok(migrate(state))
    }

    pub fn store(&self, state: &State) -> Result<(), StoreError> {
        if state.version > CURRENT_VERSION {
            return Err(StoreError::FromTheFuture {
                path: self.path(),
                version: state.version,
            });
        }

        let path = self.path();
        self.prepare_directory()?;

        let serialized =
            serde_json::to_vec_pretty(state).map_err(|source| StoreError::Unreadable {
                path: path.clone(),
                source,
            })?;

        if path.exists() {
            let backup = self.backup_path();
            fs::copy(&path, &backup).map_err(Self::io_error(&backup))?;
        }

        write_atomically(&path, &serialized).map_err(Self::io_error(&path))
    }

    pub fn update<F>(&self, attempts: u8, mut change: F) -> Result<State, StoreError>
    where
        F: FnMut(&mut State),
    {
        for _ in 0..attempts.max(1) {
            let mut state = self.load()?;
            if state.version > CURRENT_VERSION {
                return Err(StoreError::FromTheFuture {
                    path: self.path(),
                    version: state.version,
                });
            }

            let observed = state.revision;
            change(&mut state);
            state.revision = observed + 1;

            let current = self.load()?.revision;
            if current != observed {
                continue;
            }

            self.store(&state)?;
            return Ok(state);
        }

        Err(StoreError::Contended { attempts })
    }

    fn prepare_directory(&self) -> Result<(), StoreError> {
        fs::create_dir_all(&self.directory).map_err(Self::io_error(&self.directory))?;
        restrict_to_owner(&self.directory, 0o700).map_err(Self::io_error(&self.directory))
    }
}

fn migrate(state: State) -> State {
    state
}

fn write_atomically(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let directory = path.parent().unwrap_or(Path::new("."));
    let name = path
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| "registry".to_owned());
    let temp = directory.join(format!(".{name}.tmp"));

    write_owner_only(&temp, bytes)?;
    fs::rename(&temp, path)?;
    fs::File::open(directory)?.sync_all()
}

#[cfg(unix)]
fn write_owner_only(path: &Path, bytes: &[u8]) -> io::Result<()> {
    use std::io::Write;
    use std::os::unix::fs::OpenOptionsExt;

    let mut file = fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .mode(0o600)
        .open(path)?;
    file.write_all(bytes)?;
    file.sync_all()
}

#[cfg(not(unix))]
fn write_owner_only(path: &Path, bytes: &[u8]) -> io::Result<()> {
    fs::write(path, bytes)
}

#[cfg(unix)]
fn restrict_to_owner(path: &Path, mode: u32) -> io::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(path, fs::Permissions::from_mode(mode))
}

#[cfg(not(unix))]
fn restrict_to_owner(_path: &Path, _mode: u32) -> io::Result<()> {
    Ok(())
}
