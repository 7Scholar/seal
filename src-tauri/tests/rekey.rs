#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use std::path::{Path, PathBuf};

use age::secrecy::SecretString;
use seal_desktop::error::Kind;
use seal_desktop::rekey::{self, Ledger, Standing};
use seal_registry::state::{ManagedFile, Repo, SealedState, State};

const OLD: &str = "old master password";
const NEW: &str = "new master password";
const WORK: u8 = seal_engine::format::MINIMUM_WORK_FACTOR;

struct World {
    _dir: tempfile::TempDir,
    _repo: tempfile::TempDir,
    ledger: Ledger,
    state: State,
    paths: Vec<PathBuf>,
}

fn world(files: usize) -> World {
    let dir = tempfile::tempdir().unwrap();
    let repo = tempfile::tempdir().unwrap();
    let root = repo.path().to_path_buf();

    let mut managed = Vec::new();
    let mut paths = Vec::new();
    for index in 0..files {
        let name = format!(".env.{index}");
        let path = root.join(&name);
        std::fs::write(&path, format!("SECRET_{index}=value\n")).unwrap();
        seal_engine::operations::seal(&path, &SecretString::from(OLD.to_owned()), WORK).unwrap();
        managed.push(ManagedFile {
            relative_path: PathBuf::from(&name),
            last_known: SealedState::Sealed,
            fingerprint: None,
            unknown: Default::default(),
        });
        paths.push(path);
    }

    let state = State {
        repos: vec![Repo {
            root,
            uses_override_passphrase: false,
            files: managed,
            unknown: Default::default(),
        }],
        acknowledged_irreversibility: true,
        ..Default::default()
    };

    World {
        ledger: Ledger::new(dir.path()),
        _dir: dir,
        _repo: repo,
        state,
        paths,
    }
}

fn opens_with(path: &Path, passphrase: &str) -> bool {
    seal_engine::operations::verify(path, &[SecretString::from(passphrase.to_owned())]).is_ok()
}

#[test]
fn the_manifest_is_written_before_any_file_is_touched() {
    let world = world(2);

    let manifest = rekey::begin(&world.ledger, world.state.managed_paths(), WORK).unwrap();

    assert_eq!(manifest.entries.len(), 2);
    assert!(
        manifest
            .entries
            .iter()
            .all(|e| e.standing == Standing::Pending),
        "every file starts pending, so a crash before the first write is still recorded"
    );
    assert!(
        world.ledger.path().exists(),
        "the manifest must be on disk before the operation begins, not after it ends"
    );
    for path in &world.paths {
        assert!(opens_with(path, OLD), "planning must not touch any file");
    }
}

#[test]
fn a_completed_run_converts_every_file_and_clears_the_manifest() {
    let world = world(3);
    rekey::begin(&world.ledger, world.state.managed_paths(), WORK).unwrap();

    let manifest = rekey::run(
        &world.ledger,
        &SecretString::from(OLD.to_owned()),
        &SecretString::from(NEW.to_owned()),
    )
    .unwrap();

    assert!(manifest.is_complete());
    assert_eq!(manifest.counts(), (3, 3));
    for path in &world.paths {
        assert!(
            opens_with(path, NEW),
            "every file must open with the new password"
        );
        assert!(!opens_with(path, OLD));
    }
    assert!(
        !world.ledger.path().exists(),
        "a finished run leaves no unfinished-work record behind"
    );
}

#[test]
fn an_interrupted_run_is_resumable_and_says_which_files_moved() {
    let world = world(3);
    rekey::begin(&world.ledger, world.state.managed_paths(), WORK).unwrap();

    seal_engine::operations::reseal_from_memory(
        &world.paths[0],
        b"SECRET_0=value\n",
        &SecretString::from(NEW.to_owned()),
        WORK,
    )
    .unwrap();

    let mut manifest = world.ledger.read().unwrap().unwrap();
    manifest.entries[0].standing = Standing::Converted;
    world.ledger.write(&manifest).unwrap();

    let resumed = world.ledger.read().unwrap().unwrap();
    assert_eq!(
        resumed.counts(),
        (1, 3),
        "a fresh process must be able to read exactly which files already moved"
    );
    assert_eq!(
        resumed.outstanding().len(),
        2,
        "only the files that have not converted are retried"
    );

    let finished = rekey::run(
        &world.ledger,
        &SecretString::from(OLD.to_owned()),
        &SecretString::from(NEW.to_owned()),
    )
    .unwrap();

    assert!(finished.is_complete());
    for path in &world.paths {
        assert!(opens_with(path, NEW));
    }
}

#[test]
fn resuming_never_retries_a_file_that_already_moved() {
    let world = world(2);
    rekey::begin(&world.ledger, world.state.managed_paths(), WORK).unwrap();

    let mut manifest = world.ledger.read().unwrap().unwrap();
    manifest.entries[0].standing = Standing::Converted;
    world.ledger.write(&manifest).unwrap();

    let outstanding = world.ledger.read().unwrap().unwrap().outstanding();

    assert_eq!(outstanding.len(), 1);
    assert_eq!(outstanding[0], world.paths[1]);
}

#[test]
fn a_second_run_cannot_start_while_one_is_unfinished() {
    let world = world(2);
    rekey::begin(&world.ledger, world.state.managed_paths(), WORK).unwrap();

    let error = rekey::begin(&world.ledger, world.state.managed_paths(), WORK).unwrap_err();

    assert_eq!(
        error.kind,
        Kind::RekeyInFlight,
        "starting a second change over a half-done one is how a repo ends up on three passwords"
    );
}

#[test]
fn running_without_a_plan_is_refused() {
    let world = world(1);

    let error = rekey::run(
        &world.ledger,
        &SecretString::from(OLD.to_owned()),
        &SecretString::from(NEW.to_owned()),
    )
    .unwrap_err();

    assert_eq!(error.kind, Kind::NoRekey);
}

#[test]
fn a_wrong_old_password_changes_nothing() {
    let world = world(2);
    rekey::begin(&world.ledger, world.state.managed_paths(), WORK).unwrap();

    let outcome = rekey::run(
        &world.ledger,
        &SecretString::from("not the old password".to_owned()),
        &SecretString::from(NEW.to_owned()),
    );

    assert!(outcome.is_err() || !outcome.unwrap().is_complete());
    for path in &world.paths {
        assert!(
            opens_with(path, OLD),
            "a failed run must leave every file on the password it had"
        );
    }
}

#[test]
fn the_manifest_survives_a_process_boundary() {
    let world = world(2);
    rekey::begin(&world.ledger, world.state.managed_paths(), WORK).unwrap();

    let reopened = Ledger::new(world.ledger.path().parent().unwrap());
    let manifest = reopened
        .read()
        .unwrap()
        .expect("a new process must find it");

    assert_eq!(manifest.entries.len(), 2);
    assert_eq!(manifest.work_factor, WORK);
}

#[test]
fn a_recorded_failure_names_a_kind_and_never_an_error_message() {
    let world = world(1);
    rekey::begin(&world.ledger, world.state.managed_paths(), WORK).unwrap();
    std::fs::remove_file(&world.paths[0]).unwrap();

    let manifest = rekey::run(
        &world.ledger,
        &SecretString::from(OLD.to_owned()),
        &SecretString::from(NEW.to_owned()),
    )
    .unwrap();

    let entry = &manifest.entries[0];
    assert_eq!(entry.standing, Standing::Failed);
    let reason = entry.reason.clone().expect("a failure records why");
    assert!(
        !reason.contains(OLD) && !reason.contains("SECRET_0"),
        "a recorded reason must carry no secret material, got {reason}"
    );
}

#[test]
fn an_unfinished_run_is_still_there_after_a_failure() {
    let world = world(1);
    rekey::begin(&world.ledger, world.state.managed_paths(), WORK).unwrap();
    std::fs::remove_file(&world.paths[0]).unwrap();

    rekey::run(
        &world.ledger,
        &SecretString::from(OLD.to_owned()),
        &SecretString::from(NEW.to_owned()),
    )
    .unwrap();

    assert!(
        world.ledger.path().exists(),
        "unfinished work must survive so the user is told about it on next launch"
    );
}
