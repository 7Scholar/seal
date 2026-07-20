#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};

use age::secrecy::SecretString;
use seal_engine::format::{Classification, Encoding, MINIMUM_WORK_FACTOR};
use seal_engine::operations::{self, OperationError};

const PLAINTEXT: &[u8] = b"DATABASE_URL=postgres://user:secret@host/db\nAPI_KEY=sk-live\n";

fn pass(text: &str) -> SecretString {
    SecretString::from(text.to_owned())
}

struct Fixture {
    _dir: tempfile::TempDir,
    path: PathBuf,
}

impl Fixture {
    fn new() -> Self {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join(".env.production");
        fs::write(&path, PLAINTEXT).unwrap();
        fs::set_permissions(&path, fs::Permissions::from_mode(0o600)).unwrap();
        Self { _dir: dir, path }
    }

    fn contents(&self) -> Vec<u8> {
        fs::read(&self.path).unwrap()
    }

    fn mode(&self) -> u32 {
        fs::metadata(&self.path).unwrap().permissions().mode() & 0o7777
    }

    fn directory(&self) -> &Path {
        self.path.parent().unwrap()
    }
}

fn seal(fixture: &Fixture, passphrase: &str) {
    operations::seal(&fixture.path, &pass(passphrase), MINIMUM_WORK_FACTOR)
        .expect("sealing must succeed");
}

#[test]
fn seals_a_file_in_place_and_unseals_it_back() {
    let fixture = Fixture::new();
    seal(&fixture, "correct horse");

    assert_ne!(
        fixture.contents(),
        PLAINTEXT,
        "the file on disk must no longer hold the plaintext"
    );
    assert_eq!(
        operations::classify(&fixture.path).unwrap(),
        Classification::Sealed {
            encoding: Encoding::Armored
        }
    );

    let mut opened = Vec::new();
    let outcome =
        operations::unseal_to(&fixture.path, &mut opened, &[pass("correct horse")]).unwrap();

    assert_eq!(opened, PLAINTEXT);
    assert_eq!(outcome.candidate, 0);
    assert_eq!(
        fixture.contents(),
        fs::read(&fixture.path).unwrap(),
        "unsealing must leave the file sealed on disk"
    );
    assert_eq!(
        operations::classify(&fixture.path).unwrap(),
        Classification::Sealed {
            encoding: Encoding::Armored
        },
        "unsealing is a memory operation and must never write plaintext back"
    );
}

#[test]
fn sealing_preserves_the_files_permissions() {
    let fixture = Fixture::new();
    seal(&fixture, "pw");

    assert_eq!(
        fixture.mode(),
        0o600,
        "a secrets file must not be widened by being sealed"
    );
}

#[test]
fn sealing_leaves_no_debris_beside_the_file() {
    let fixture = Fixture::new();
    seal(&fixture, "pw");

    let mut names: Vec<String> = fs::read_dir(fixture.directory())
        .unwrap()
        .map(|entry| entry.unwrap().file_name().to_string_lossy().into_owned())
        .collect();
    names.retain(|name| !name.ends_with(".seal.lock"));
    names.sort();

    assert_eq!(
        names,
        vec![".env.production".to_owned()],
        "no temporary files may remain after a successful seal"
    );
}

#[test]
fn refuses_to_seal_a_file_that_is_already_sealed() {
    let fixture = Fixture::new();
    seal(&fixture, "pw");
    let sealed = fixture.contents();

    let error = operations::seal(&fixture.path, &pass("pw"), MINIMUM_WORK_FACTOR)
        .expect_err("a second seal must be refused");

    assert!(
        matches!(error, OperationError::AlreadySealed { .. }),
        "expected an already-sealed refusal, got {error:?}"
    );
    assert_eq!(
        fixture.contents(),
        sealed,
        "a refused seal must leave the file untouched rather than doubly encrypting it"
    );
}

#[test]
fn refuses_to_unseal_a_file_that_is_not_sealed() {
    let fixture = Fixture::new();

    let mut sink = Vec::new();
    let error = operations::unseal_to(&fixture.path, &mut sink, &[pass("pw")])
        .expect_err("unsealing plaintext must be refused");

    assert!(
        matches!(error, OperationError::NotSealed { .. }),
        "expected a not-sealed refusal, got {error:?}"
    );
    assert!(sink.is_empty());
}

#[test]
fn reports_an_absent_file_distinctly() {
    let dir = tempfile::tempdir().unwrap();
    let missing = dir.path().join("nothing-here.env");

    let error = operations::seal(&missing, &pass("pw"), MINIMUM_WORK_FACTOR)
        .expect_err("sealing a missing file must fail");
    assert!(
        matches!(error, OperationError::Absent { .. }),
        "a missing file must be reported as absent rather than as an IO failure, got {error:?}"
    );
}

#[test]
fn reports_which_candidate_passphrase_opened_the_file() {
    let fixture = Fixture::new();
    seal(&fixture, "repo override");

    let mut opened = Vec::new();
    let outcome = operations::unseal_to(
        &fixture.path,
        &mut opened,
        &[pass("master"), pass("repo override")],
    )
    .unwrap();

    assert_eq!(
        outcome.candidate, 1,
        "the caller must learn the master passphrase did not open it, but the override did"
    );
    assert_eq!(opened, PLAINTEXT);
}

#[test]
fn a_wrong_passphrase_leaves_the_file_sealed_and_reports_clearly() {
    let fixture = Fixture::new();
    seal(&fixture, "right");
    let sealed = fixture.contents();

    let mut sink = Vec::new();
    let error = operations::unseal_to(&fixture.path, &mut sink, &[pass("wrong")])
        .expect_err("a wrong passphrase must fail");

    assert!(
        matches!(error, OperationError::NoMatchingPassphrase { .. }),
        "expected a passphrase failure, got {error:?}"
    );
    assert_eq!(fixture.contents(), sealed);
    assert!(
        sink.is_empty(),
        "no plaintext may reach the sink on failure"
    );
}

#[test]
fn verifying_reports_the_match_without_producing_plaintext() {
    let fixture = Fixture::new();
    seal(&fixture, "second");

    let candidate = operations::verify(&fixture.path, &[pass("first"), pass("second")]).unwrap();
    assert_eq!(candidate, 1);

    let error = operations::verify(&fixture.path, &[pass("neither")]).unwrap_err();
    assert!(matches!(error, OperationError::NoMatchingPassphrase { .. }));
}

#[test]
fn refuses_a_symlinked_target() {
    let dir = tempfile::tempdir().unwrap();
    let real = dir.path().join("real.env");
    let link = dir.path().join(".env.production");
    fs::write(&real, PLAINTEXT).unwrap();
    std::os::unix::fs::symlink(&real, &link).unwrap();

    let error = operations::seal(&link, &pass("pw"), MINIMUM_WORK_FACTOR)
        .expect_err("a symlinked target must be refused");

    assert!(
        matches!(error, OperationError::SymlinkTarget { .. }),
        "expected a symlink refusal, got {error:?}"
    );
    assert_eq!(
        fs::read(&real).unwrap(),
        PLAINTEXT,
        "the file the link points at must be left alone"
    );
}

#[test]
fn an_operation_is_refused_while_the_file_is_locked_elsewhere() {
    let fixture = Fixture::new();
    let held = seal_engine::lock::FileLock::acquire(&fixture.path).unwrap();

    let error = operations::seal(&fixture.path, &pass("pw"), MINIMUM_WORK_FACTOR)
        .expect_err("a locked file must not be sealed concurrently");

    assert!(
        matches!(error, OperationError::Busy { .. }),
        "expected a busy report, got {error:?}"
    );
    assert_eq!(
        fixture.contents(),
        PLAINTEXT,
        "a refused operation must not touch the file"
    );

    drop(held);
    operations::seal(&fixture.path, &pass("pw"), MINIMUM_WORK_FACTOR)
        .expect("the operation must succeed once the lock is released");
}
