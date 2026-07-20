use std::cell::RefCell;
use std::fs::File;
use std::io;
use std::path::{Path, PathBuf};

use super::fs::{Durability, FileSystem, Identity, Metadata, RealFileSystem, Step};

#[derive(Debug, Default)]
pub struct FaultyFileSystem {
    inner: RealFileSystem,
    fail_at: Option<Step>,
    observed: RefCell<Vec<Step>>,
}

impl FaultyFileSystem {
    pub fn failing_at(step: Step) -> Self {
        Self {
            inner: RealFileSystem::new(),
            fail_at: Some(step),
            observed: RefCell::new(Vec::new()),
        }
    }

    pub fn passthrough() -> Self {
        Self {
            inner: RealFileSystem::new(),
            fail_at: None,
            observed: RefCell::new(Vec::new()),
        }
    }

    pub fn observed(&self) -> Vec<Step> {
        self.observed.borrow().clone()
    }

    fn check(&self, step: Step) -> io::Result<()> {
        self.observed.borrow_mut().push(step);
        if self.fail_at == Some(step) {
            return Err(io::Error::other(format!("injected failure at {step:?}")));
        }
        Ok(())
    }
}

impl FileSystem for FaultyFileSystem {
    fn capture_metadata(&self, path: &Path) -> io::Result<Metadata> {
        self.check(Step::CaptureMetadata)?;
        self.inner.capture_metadata(path)
    }

    fn create_temp(&self, dir: &Path, prefix: &str) -> io::Result<(File, PathBuf)> {
        self.check(Step::CreateTemp)?;
        self.inner.create_temp(dir, prefix)
    }

    fn restore_metadata(&self, file: &File, path: &Path, metadata: &Metadata) -> io::Result<()> {
        self.check(Step::RestoreMetadata)?;
        self.inner.restore_metadata(file, path, metadata)
    }

    fn flush(&self, file: &File, durability: Durability) -> io::Result<()> {
        self.check(Step::Flush)?;
        self.inner.flush(file, durability)
    }

    fn rename(&self, from: &Path, to: &Path) -> io::Result<()> {
        self.check(Step::Rename)?;
        self.inner.rename(from, to)
    }

    fn sync_dir(&self, dir: &Path) -> io::Result<()> {
        self.check(Step::SyncDir)?;
        self.inner.sync_dir(dir)
    }

    fn remove_file(&self, path: &Path) -> io::Result<()> {
        self.check(Step::RemoveTemp)?;
        self.inner.remove_file(path)
    }

    fn identity(&self, path: &Path) -> io::Result<Identity> {
        self.inner.identity(path)
    }
}
