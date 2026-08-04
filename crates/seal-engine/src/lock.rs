use std::fs::{File, OpenOptions};
use std::io;
use std::os::unix::io::AsRawFd;
use std::path::{Path, PathBuf};

#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum LockError {
    #[error("{path} is in use by another operation")]
    Busy { path: PathBuf },
    #[error("could not acquire the lock for {path}")]
    Io {
        path: PathBuf,
        #[source]
        source: io::Error,
    },
}

#[derive(Debug)]
pub struct FileLock {
    file: Option<File>,
    path: PathBuf,
}

pub fn lock_path_for(target: &Path) -> PathBuf {
    let directory = crate::replace::containing_directory(target);
    let name = target
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| "seal".to_owned());
    directory.join(format!(".{name}.seal.lock"))
}

impl FileLock {
    pub fn acquire(target: &Path) -> Result<Self, LockError> {
        let path = lock_path_for(target);

        let file = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(false)
            .open(&path)
            .map_err(|source| LockError::Io {
                path: path.clone(),
                source,
            })?;

        let acquired = unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) };
        if acquired == -1 {
            let source = io::Error::last_os_error();
            return match source.kind() {
                io::ErrorKind::WouldBlock => Err(LockError::Busy { path }),
                _ => Err(LockError::Io { path, source }),
            };
        }

        Ok(Self {
            file: Some(file),
            path,
        })
    }

    pub fn path(&self) -> &Path {
        &self.path
    }
}

impl Drop for FileLock {
    fn drop(&mut self) {
        if let Some(file) = self.file.take() {
            unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_UN) };
        }
    }
}
