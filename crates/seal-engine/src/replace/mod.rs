pub mod fault;
pub mod fs;

use std::io::{self, Write};
use std::path::{Path, PathBuf};

pub use fs::{Durability, FileSystem, Identity, Metadata, RealFileSystem, Step};

#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum ReplaceError {
    #[error("failed during {step:?} on {path}")]
    Io {
        step: Step,
        path: PathBuf,
        #[source]
        source: io::Error,
    },
    #[error("{path} is a symbolic link")]
    SymlinkTarget { path: PathBuf },
}

impl ReplaceError {
    fn at(step: Step, path: &Path) -> impl FnOnce(io::Error) -> Self + use<'_> {
        move |source| Self::Io {
            step,
            path: path.to_path_buf(),
            source,
        }
    }

    pub fn step(&self) -> Option<Step> {
        match self {
            Self::Io { step, .. } => Some(*step),
            Self::SymlinkTarget { .. } => None,
        }
    }
}

pub fn containing_directory(target: &Path) -> &Path {
    match target.parent() {
        Some(parent) if !parent.as_os_str().is_empty() => parent,
        _ => Path::new("."),
    }
}

pub struct Replacement<'a, F: FileSystem> {
    filesystem: &'a F,
    durability: Durability,
}

struct TempGuard<'a, F: FileSystem> {
    filesystem: &'a F,
    path: Option<PathBuf>,
}

impl<'a, F: FileSystem> TempGuard<'a, F> {
    fn new(filesystem: &'a F, path: PathBuf) -> Self {
        Self {
            filesystem,
            path: Some(path),
        }
    }

    fn path(&self) -> &Path {
        self.path.as_deref().unwrap_or(Path::new(""))
    }

    fn release(mut self) {
        self.path = None;
    }
}

impl<F: FileSystem> Drop for TempGuard<'_, F> {
    fn drop(&mut self) {
        if let Some(path) = self.path.take() {
            let _ = self.filesystem.remove_file(&path);
        }
    }
}

impl<'a, F: FileSystem> Replacement<'a, F> {
    pub fn new(filesystem: &'a F, durability: Durability) -> Self {
        Self {
            filesystem,
            durability,
        }
    }

    pub fn run<W>(&self, target: &Path, write_contents: W) -> Result<Identity, ReplaceError>
    where
        W: FnOnce(&mut dyn Write) -> io::Result<()>,
    {
        let directory = containing_directory(target);

        if self
            .filesystem
            .is_symlink(target)
            .map_err(ReplaceError::at(Step::InspectTarget, target))?
        {
            return Err(ReplaceError::SymlinkTarget {
                path: target.to_path_buf(),
            });
        }

        let metadata = self
            .filesystem
            .capture_metadata(target)
            .map_err(ReplaceError::at(Step::CaptureMetadata, target))?;

        let prefix = fs::temp_prefix_for(target);
        let (mut file, temp_path) = self
            .filesystem
            .create_temp(directory, &prefix)
            .map_err(ReplaceError::at(Step::CreateTemp, target))?;
        let guard = TempGuard::new(self.filesystem, temp_path);

        write_contents(&mut file).map_err(ReplaceError::at(Step::Write, guard.path()))?;
        file.flush()
            .map_err(ReplaceError::at(Step::Write, guard.path()))?;

        self.filesystem
            .restore_metadata(&file, guard.path(), &metadata)
            .map_err(ReplaceError::at(Step::RestoreMetadata, guard.path()))?;

        self.filesystem
            .flush(&file, self.durability)
            .map_err(ReplaceError::at(Step::Flush, guard.path()))?;
        drop(file);

        self.filesystem
            .rename(guard.path(), target)
            .map_err(ReplaceError::at(Step::Rename, target))?;
        guard.release();

        if self.durability == Durability::Full {
            self.filesystem
                .sync_dir(directory)
                .map_err(ReplaceError::at(Step::SyncDir, directory))?;
        }

        self.filesystem
            .identity(target)
            .map_err(ReplaceError::at(Step::Identity, target))
    }
}
