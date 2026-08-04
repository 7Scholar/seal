use std::ffi::OsString;
use std::fs::{File, OpenOptions};
use std::io;
use std::os::unix::fs::{MetadataExt, OpenOptionsExt, PermissionsExt};
#[cfg(target_os = "macos")]
use std::os::unix::io::AsRawFd;
use std::path::{Path, PathBuf};

use super::{Durability, FileSystem, Identity, Metadata};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlatformMetadata {
    mode: u32,
    xattrs: Vec<(OsString, Vec<u8>)>,
}

#[derive(Debug, Default, Clone, Copy)]
pub struct RealFileSystem;

impl RealFileSystem {
    pub fn new() -> Self {
        Self
    }
}

fn temp_name(prefix: &str, counter: u64) -> OsString {
    let mut name = OsString::from(".");
    name.push(prefix);
    name.push(format!(".seal.tmp.{counter:016x}"));
    name
}

fn random_seed() -> u64 {
    use std::collections::hash_map::RandomState;
    use std::hash::{BuildHasher, Hasher};

    RandomState::new().build_hasher().finish()
}

impl FileSystem for RealFileSystem {
    fn is_symlink(&self, path: &Path) -> io::Result<bool> {
        Ok(std::fs::symlink_metadata(path)?.file_type().is_symlink())
    }

    fn capture_metadata(&self, path: &Path) -> io::Result<Metadata> {
        let mode = std::fs::metadata(path)?.permissions().mode() & 0o7777;

        let mut xattrs = Vec::new();
        match xattr::list(path) {
            Ok(names) => {
                for name in names {
                    match xattr::get(path, &name) {
                        Ok(Some(value)) => xattrs.push((name, value)),
                        Ok(None) => {}
                        Err(err) if err.kind() == io::ErrorKind::NotFound => {}
                        Err(err) => return Err(err),
                    }
                }
            }
            Err(err) if err.raw_os_error() == Some(libc::ENOTSUP) => {}
            Err(err) => return Err(err),
        }

        Ok(Metadata::new(PlatformMetadata { mode, xattrs }))
    }

    fn create_temp(&self, dir: &Path, prefix: &str) -> io::Result<(File, PathBuf)> {
        let mut seed = random_seed();
        for _ in 0..64 {
            let candidate = dir.join(temp_name(prefix, seed));
            match OpenOptions::new()
                .write(true)
                .create_new(true)
                .mode(0o600)
                .open(&candidate)
            {
                Ok(file) => return Ok((file, candidate)),
                Err(err) if err.kind() == io::ErrorKind::AlreadyExists => {
                    seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
                }
                Err(err) => return Err(err),
            }
        }
        Err(io::Error::new(
            io::ErrorKind::AlreadyExists,
            "exhausted temporary file name attempts",
        ))
    }

    fn restore_metadata(&self, file: &File, path: &Path, metadata: &Metadata) -> io::Result<()> {
        let platform = metadata.inner();
        file.set_permissions(std::fs::Permissions::from_mode(platform.mode))?;

        for (name, value) in &platform.xattrs {
            match xattr::set(path, name.as_os_str(), value) {
                Ok(()) => {}
                Err(err) if err.raw_os_error() == Some(libc::ENOTSUP) => {}
                Err(err) => return Err(err),
            }
        }

        Ok(())
    }

    fn flush(&self, file: &File, durability: Durability) -> io::Result<()> {
        match durability {
            Durability::None => Ok(()),
            Durability::Full => {
                if full_fsync(file)? {
                    Ok(())
                } else {
                    file.sync_all()
                }
            }
        }
    }

    fn rename(&self, from: &Path, to: &Path) -> io::Result<()> {
        std::fs::rename(from, to)
    }

    fn sync_dir(&self, dir: &Path) -> io::Result<()> {
        File::open(dir)?.sync_all()
    }

    fn remove_file(&self, path: &Path) -> io::Result<()> {
        std::fs::remove_file(path)
    }

    fn identity(&self, path: &Path) -> io::Result<Identity> {
        let meta = std::fs::metadata(path)?;
        Ok(Identity {
            device: meta.dev(),
            inode: meta.ino(),
            size: meta.size(),
            modified_secs: meta.mtime(),
            modified_nanos: meta.mtime_nsec(),
        })
    }
}

#[cfg(target_os = "macos")]
fn full_fsync(file: &File) -> io::Result<bool> {
    let result = unsafe { libc::fcntl(file.as_raw_fd(), libc::F_FULLFSYNC) };
    if result != -1 {
        return Ok(true);
    }

    let err = io::Error::last_os_error();
    match err.raw_os_error() {
        Some(libc::ENOTSUP) | Some(libc::EINVAL) | Some(libc::EPERM) => Ok(false),
        _ => Err(err),
    }
}

#[cfg(not(target_os = "macos"))]
fn full_fsync(_file: &File) -> io::Result<bool> {
    Ok(false)
}
