pub mod fault;
pub mod fs;

use std::io::{self, Write};
use std::path::{Path, PathBuf};

pub use fs::{Durability, FileSystem, Identity, Metadata, RealFileSystem, Step};

#[derive(Debug, thiserror::Error)]
#[error("failed during {step:?}")]
pub struct ReplaceError {
    pub step: Step,
    #[source]
    pub source: io::Error,
}

impl ReplaceError {
    fn at(step: Step) -> impl FnOnce(io::Error) -> Self {
        move |source| Self { step, source }
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
        let directory = target.parent().unwrap_or(Path::new("."));

        let metadata = self
            .filesystem
            .capture_metadata(target)
            .map_err(ReplaceError::at(Step::CaptureMetadata))?;

        let prefix = fs::temp_prefix_for(target);
        let (mut file, temp_path) = self
            .filesystem
            .create_temp(directory, &prefix)
            .map_err(ReplaceError::at(Step::CreateTemp))?;
        let guard = TempGuard::new(self.filesystem, temp_path);

        write_contents(&mut file).map_err(ReplaceError::at(Step::Write))?;
        file.flush().map_err(ReplaceError::at(Step::Write))?;

        self.filesystem
            .restore_metadata(&file, guard.path(), &metadata)
            .map_err(ReplaceError::at(Step::RestoreMetadata))?;

        self.filesystem
            .flush(&file, self.durability)
            .map_err(ReplaceError::at(Step::Flush))?;
        drop(file);

        self.filesystem
            .rename(guard.path(), target)
            .map_err(ReplaceError::at(Step::Rename))?;
        guard.release();

        if self.durability == Durability::Full {
            self.filesystem
                .sync_dir(directory)
                .map_err(ReplaceError::at(Step::SyncDir))?;
        }

        self.filesystem
            .identity(target)
            .map_err(ReplaceError::at(Step::SyncDir))
    }
}
