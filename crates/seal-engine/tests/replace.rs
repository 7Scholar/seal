#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use std::fs;
use std::io::{self, Write};
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};

use seal_engine::replace::fault::FaultyFileSystem;
use seal_engine::replace::{Durability, FileSystem, RealFileSystem, Replacement, Step};

const ORIGINAL: &[u8] = b"ORIGINAL-PLAINTEXT\n";
const REPLACEMENT: &[u8] = b"REPLACEMENT-CIPHERTEXT\n";

struct Fixture {
    _dir: tempfile::TempDir,
    target: PathBuf,
}

impl Fixture {
    fn new() -> Self {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("secrets.conf");
        fs::write(&target, ORIGINAL).unwrap();
        fs::set_permissions(&target, fs::Permissions::from_mode(0o600)).unwrap();
        Self { _dir: dir, target }
    }

    fn directory(&self) -> &Path {
        self.target.parent().unwrap()
    }

    fn siblings(&self) -> Vec<String> {
        let mut names: Vec<String> = fs::read_dir(self.directory())
            .unwrap()
            .map(|entry| entry.unwrap().file_name().to_string_lossy().into_owned())
            .collect();
        names.sort();
        names
    }

    fn contents(&self) -> Vec<u8> {
        fs::read(&self.target).unwrap()
    }

    fn mode(&self) -> u32 {
        fs::metadata(&self.target).unwrap().permissions().mode() & 0o7777
    }
}

fn write_replacement(sink: &mut dyn Write) -> io::Result<()> {
    sink.write_all(REPLACEMENT)
}

#[test]
fn replaces_contents_and_reports_new_identity() {
    let fixture = Fixture::new();
    let filesystem = RealFileSystem::new();
    let before = filesystem.identity(&fixture.target).unwrap();

    let after = Replacement::new(&filesystem, Durability::Full)
        .run(&fixture.target, write_replacement)
        .unwrap();

    assert_eq!(fixture.contents(), REPLACEMENT);
    assert_ne!(
        before.inode, after.inode,
        "replacement installs a new inode"
    );
    assert_eq!(after.size, REPLACEMENT.len() as u64);
    assert_eq!(fixture.siblings(), vec!["secrets.conf".to_owned()]);
}

#[test]
fn preserves_owner_only_permissions() {
    let fixture = Fixture::new();
    let filesystem = RealFileSystem::new();

    Replacement::new(&filesystem, Durability::Full)
        .run(&fixture.target, write_replacement)
        .unwrap();

    assert_eq!(
        fixture.mode(),
        0o600,
        "a secrets file must not be widened by being replaced"
    );
}

#[test]
fn preserves_modes_the_temporary_file_does_not_share() {
    for mode in [0o640, 0o644, 0o664, 0o755] {
        let fixture = Fixture::new();
        fs::set_permissions(&fixture.target, fs::Permissions::from_mode(mode)).unwrap();

        Replacement::new(&RealFileSystem::new(), Durability::Full)
            .run(&fixture.target, write_replacement)
            .unwrap();

        assert_eq!(
            fixture.mode(),
            mode,
            "mode {mode:o} must be carried across the replacement rather than \
             inherited from the temporary file"
        );
    }
}

#[test]
fn preserves_extended_attributes() {
    let fixture = Fixture::new();

    match xattr::set(&fixture.target, "user.seal.test", b"carried") {
        Ok(()) => {}
        Err(err) if err.raw_os_error() == Some(libc::ENOTSUP) => {
            eprintln!("skipped: filesystem does not support extended attributes");
            return;
        }
        Err(err) => panic!("could not set the attribute this test depends on: {err}"),
    }

    assert_eq!(
        xattr::get(&fixture.target, "user.seal.test")
            .unwrap()
            .as_deref(),
        Some(&b"carried"[..]),
        "fixture precondition: the attribute must be present before replacing"
    );

    Replacement::new(&RealFileSystem::new(), Durability::Full)
        .run(&fixture.target, write_replacement)
        .unwrap();

    let carried = xattr::get(&fixture.target, "user.seal.test").unwrap();
    assert_eq!(
        carried.as_deref(),
        Some(&b"carried"[..]),
        "extended attributes must be carried across the replacement"
    );
}

#[test]
fn temporary_file_is_a_sibling_of_the_target() {
    let fixture = Fixture::new();
    let filesystem = RealFileSystem::new();
    let observed = std::cell::RefCell::new(Vec::new());

    Replacement::new(&filesystem, Durability::Full)
        .run(&fixture.target, |sink| {
            for entry in fs::read_dir(fixture.directory()).unwrap() {
                observed
                    .borrow_mut()
                    .push(entry.unwrap().file_name().to_string_lossy().into_owned());
            }
            sink.write_all(REPLACEMENT)
        })
        .unwrap();

    let during = observed.borrow();
    assert!(
        during.iter().any(|name| name.contains(".seal.tmp.")),
        "expected a temp sibling during the write, saw {during:?}"
    );
}

#[test]
fn plaintext_durability_skips_directory_sync() {
    let fixture = Fixture::new();
    let filesystem = FaultyFileSystem::passthrough();

    Replacement::new(&filesystem, Durability::None)
        .run(&fixture.target, write_replacement)
        .unwrap();

    assert!(
        !filesystem.observed().contains(&Step::SyncDir),
        "writing plaintext must not force it to durable storage"
    );
    assert_eq!(fixture.contents(), REPLACEMENT);
}

#[test]
fn ciphertext_durability_syncs_file_and_directory() {
    let fixture = Fixture::new();
    let filesystem = FaultyFileSystem::passthrough();

    Replacement::new(&filesystem, Durability::Full)
        .run(&fixture.target, write_replacement)
        .unwrap();

    let observed = filesystem.observed();
    assert!(observed.contains(&Step::Flush));
    assert!(observed.contains(&Step::SyncDir));
}

#[test]
fn failure_at_any_step_leaves_the_target_intact() {
    let steps = [
        Step::CaptureMetadata,
        Step::CreateTemp,
        Step::RestoreMetadata,
        Step::Flush,
        Step::Rename,
    ];

    for step in steps {
        let fixture = Fixture::new();
        let filesystem = FaultyFileSystem::failing_at(step);

        let error = Replacement::new(&filesystem, Durability::Full)
            .run(&fixture.target, write_replacement)
            .expect_err("injected failure must surface");

        assert_eq!(error.step, step);
        assert_eq!(
            fixture.contents(),
            ORIGINAL,
            "target must be untouched when {step:?} fails"
        );
        assert_eq!(
            fixture.mode(),
            0o600,
            "permissions must survive a failure at {step:?}"
        );
        assert_eq!(
            fixture.siblings(),
            vec!["secrets.conf".to_owned()],
            "no debris may remain after {step:?} fails"
        );
    }
}

#[test]
fn failure_while_writing_leaves_the_target_intact() {
    let fixture = Fixture::new();
    let filesystem = RealFileSystem::new();

    let error = Replacement::new(&filesystem, Durability::Full)
        .run(&fixture.target, |sink| {
            sink.write_all(b"partial")?;
            Err(io::Error::other("caller failed mid-write"))
        })
        .expect_err("a failing writer must surface");

    assert_eq!(error.step, Step::Write);
    assert_eq!(fixture.contents(), ORIGINAL);
    assert_eq!(fixture.siblings(), vec!["secrets.conf".to_owned()]);
}

#[test]
fn failure_after_rename_keeps_the_new_contents() {
    let fixture = Fixture::new();
    let filesystem = FaultyFileSystem::failing_at(Step::SyncDir);

    let error = Replacement::new(&filesystem, Durability::Full)
        .run(&fixture.target, write_replacement)
        .expect_err("injected failure must surface");

    assert_eq!(error.step, Step::SyncDir);
    assert_eq!(
        fixture.contents(),
        REPLACEMENT,
        "the rename already committed, so the new contents stand"
    );
    assert_eq!(fixture.siblings(), vec!["secrets.conf".to_owned()]);
}
