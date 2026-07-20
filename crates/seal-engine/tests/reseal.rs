#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use std::fs;
use std::path::PathBuf;

use age::secrecy::SecretString;
use seal_engine::format::MINIMUM_WORK_FACTOR;
use seal_engine::operations;
use seal_engine::reseal::{self, FileState};

const WORK: u8 = MINIMUM_WORK_FACTOR;

fn pass(text: &str) -> SecretString {
    SecretString::from(text.to_owned())
}

struct Tree {
    _dir: tempfile::TempDir,
    paths: Vec<PathBuf>,
}

impl Tree {
    fn sealed_under(names: &[&str], passphrase: &str) -> Self {
        let dir = tempfile::tempdir().unwrap();
        let mut paths = Vec::new();
        for (index, name) in names.iter().enumerate() {
            let path = dir.path().join(name);
            fs::write(&path, format!("KEY_{index}=value-{index}\n")).unwrap();
            operations::seal(&path, &pass(passphrase), WORK).unwrap();
            paths.push(path);
        }
        Self { _dir: dir, paths }
    }

    fn opens_with(&self, path: &std::path::Path, passphrase: &str) -> bool {
        operations::verify(path, &[pass(passphrase)]).is_ok()
    }
}

#[test]
fn reseals_every_file_under_the_new_passphrase() {
    let tree = Tree::sealed_under(&[".env.production", ".env.staging", "config.json"], "old");

    let report = reseal::reseal(&tree.paths, &pass("old"), &pass("new"), WORK, 3).unwrap();

    assert!(report.is_complete(), "unfinished: {:?}", report.unfinished);
    assert_eq!(report.converted.len(), 3);
    for path in &tree.paths {
        assert!(
            tree.opens_with(path, "new"),
            "{} must open with the new passphrase",
            path.display()
        );
        assert!(
            !tree.opens_with(path, "old"),
            "{} must no longer open with the old passphrase",
            path.display()
        );
    }
}

#[test]
fn re_running_is_safe_and_skips_what_is_already_converted() {
    let tree = Tree::sealed_under(&[".env.production", ".env.staging"], "old");

    reseal::reseal(&tree.paths, &pass("old"), &pass("new"), WORK, 3).unwrap();
    let second = reseal::reseal(&tree.paths, &pass("old"), &pass("new"), WORK, 3).unwrap();

    assert!(second.is_complete());
    assert!(
        second
            .converted
            .iter()
            .all(|c| c.state == FileState::AlreadyUnderNewPassphrase),
        "a second run must recognise the work as done rather than redo or fail it"
    );
    for path in &tree.paths {
        assert!(tree.opens_with(path, "new"));
    }
}

#[test]
fn a_partially_converted_set_completes_on_a_second_run() {
    let tree = Tree::sealed_under(&[".env.a", ".env.b", ".env.c"], "old");

    operations::unseal_to(&tree.paths[0], &mut Vec::new(), &[pass("old")]).unwrap();
    let mut plaintext = Vec::new();
    operations::unseal_to(&tree.paths[0], &mut plaintext, &[pass("old")]).unwrap();
    operations::reseal_from_memory(&tree.paths[0], &plaintext, &pass("new"), WORK).unwrap();

    let report = reseal::reseal(&tree.paths, &pass("old"), &pass("new"), WORK, 3).unwrap();

    assert!(report.is_complete());
    assert_eq!(
        report
            .converted
            .iter()
            .filter(|c| c.state == FileState::AlreadyUnderNewPassphrase)
            .count(),
        1,
        "the already-converted file must be recognised, not re-encrypted"
    );
    for path in &tree.paths {
        assert!(tree.opens_with(path, "new"));
    }
}

#[test]
fn refuses_to_start_when_the_new_passphrase_cannot_be_proved() {
    let tree = Tree::sealed_under(&[".env.production"], "old");

    let error = reseal::reseal(&tree.paths, &pass("old"), &pass("new"), 200, 3).unwrap_err();

    assert!(
        matches!(error, reseal::PlanError::NewPassphraseUnusable),
        "an unusable work factor must be caught before any file is touched, got {error:?}"
    );
    assert!(
        tree.opens_with(&tree.paths[0], "old"),
        "nothing may be touched when the plan is refused"
    );
}

#[test]
fn refuses_to_start_when_a_file_is_not_sealed() {
    let tree = Tree::sealed_under(&[".env.production"], "old");
    let dir = tree.paths[0].parent().unwrap();
    let plain = dir.join(".env.local");
    fs::write(&plain, b"KEY=plain\n").unwrap();

    let mut paths = tree.paths.clone();
    paths.push(plain);

    let error = reseal::reseal(&paths, &pass("old"), &pass("new"), WORK, 3).unwrap_err();

    assert!(
        matches!(error, reseal::PlanError::Unusable { .. }),
        "the whole plan must be refused before any file is touched, got {error:?}"
    );
    assert!(
        tree.opens_with(&tree.paths[0], "old"),
        "the sealed file must be untouched when the plan is refused"
    );
}

#[test]
fn a_locked_file_is_reported_as_unfinished_and_retryable() {
    let tree = Tree::sealed_under(&[".env.a", ".env.b"], "old");
    let held = seal_engine::lock::FileLock::acquire(&tree.paths[1]).unwrap();

    let report = reseal::reseal(&tree.paths, &pass("old"), &pass("new"), WORK, 2).unwrap();

    assert_eq!(report.converted.len(), 1, "the free file must convert");
    assert_eq!(report.unfinished.len(), 1);
    let stuck = &report.unfinished[0];
    assert_eq!(stuck.path, tree.paths[1]);
    assert!(
        stuck.is_retryable(),
        "a busy file must be reported as retryable rather than as a hard failure"
    );
    assert!(!report.is_complete());

    drop(held);

    let second = reseal::reseal(&tree.paths, &pass("old"), &pass("new"), WORK, 2).unwrap();
    assert!(
        second.is_complete(),
        "once the blocker is gone, re-running must finish the job"
    );
    for path in &tree.paths {
        assert!(tree.opens_with(path, "new"));
    }
}

#[test]
fn a_file_under_neither_passphrase_is_reported_without_retrying() {
    let tree = Tree::sealed_under(&[".env.a"], "old");
    let dir = tree.paths[0].parent().unwrap();
    let stranger = dir.join(".env.stranger");
    fs::write(&stranger, b"KEY=other\n").unwrap();
    operations::seal(&stranger, &pass("unrelated"), WORK).unwrap();

    let mut paths = tree.paths.clone();
    paths.push(stranger.clone());

    let report = reseal::reseal(&paths, &pass("old"), &pass("new"), WORK, 3).unwrap();

    assert_eq!(report.converted.len(), 1);
    assert_eq!(report.unfinished.len(), 1);
    let stuck = &report.unfinished[0];
    assert_eq!(stuck.path, stranger);
    assert!(
        !stuck.is_retryable(),
        "a wrong-passphrase file will never succeed on retry and must not be retried"
    );
    assert_eq!(
        stuck.attempts, 3,
        "the attempt count is reported so a caller can explain what was tried"
    );
}
