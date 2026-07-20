use std::fs::File;
use std::io;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Step {
    CaptureMetadata,
    CreateTemp,
    Write,
    RestoreMetadata,
    Flush,
    Rename,
    SyncDir,
    RemoveTemp,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Durability {
    Full,
    None,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Metadata {
    inner: PlatformMetadata,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Identity {
    pub device: u64,
    pub inode: u64,
    pub size: u64,
    pub modified_secs: i64,
    pub modified_nanos: i64,
}

pub trait FileSystem {
    fn capture_metadata(&self, path: &Path) -> io::Result<Metadata>;
    fn create_temp(&self, dir: &Path, prefix: &str) -> io::Result<(File, PathBuf)>;
    fn restore_metadata(&self, file: &File, path: &Path, metadata: &Metadata) -> io::Result<()>;
    fn flush(&self, file: &File, durability: Durability) -> io::Result<()>;
    fn rename(&self, from: &Path, to: &Path) -> io::Result<()>;
    fn sync_dir(&self, dir: &Path) -> io::Result<()>;
    fn remove_file(&self, path: &Path) -> io::Result<()>;
    fn identity(&self, path: &Path) -> io::Result<Identity>;
}

#[cfg(unix)]
pub(crate) mod imp;

#[cfg(unix)]
pub use imp::{PlatformMetadata, RealFileSystem};

impl Metadata {
    pub(crate) fn new(inner: PlatformMetadata) -> Self {
        Self { inner }
    }

    pub(crate) fn inner(&self) -> &PlatformMetadata {
        &self.inner
    }
}

pub(crate) fn temp_prefix_for(target: &Path) -> String {
    let name = target
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_default();

    if name.is_empty() {
        "seal".to_owned()
    } else {
        name
    }
}
