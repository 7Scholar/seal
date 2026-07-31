#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use std::path::PathBuf;

use age::secrecy::SecretString;
use seal_desktop::app;
use seal_desktop::error::Kind;
use seal_desktop::rekey::{self, Ledger};
use seal_registry::state::{ManagedFile, Repo, SealedState, State};
use seal_session::Session;

const PASSWORD: &str = "correct horse battery staple";
const OTHER: &str = "not the password";
const WORK: u8 = seal_engine::format::MINIMUM_WORK_FACTOR;

fn establish(directory: &std::path::Path, state: &State, passphrase: &str) -> Session {
    let mut session = Session::new();
    app::establish(&mut session, directory, state, passphrase.to_owned(), WORK).unwrap();
    session
}

#[test]
fn a_fresh_directory_is_not_established() {
    let dir = tempfile::tempdir().unwrap();
    assert!(!app::is_established(dir.path()));
}

#[test]
fn establishing_creates_a_sealed_sentinel_and_unlocks_the_session() {
    let dir = tempfile::tempdir().unwrap();
    let mut session = establish(dir.path(), &State::default(), PASSWORD);

    assert!(app::is_established(dir.path()));
    assert!(session.is_unlocked());
    assert!(matches!(
        seal_engine::operations::classify(&app::sentinel_path(dir.path())),
        Ok(seal_engine::format::Classification::Sealed { .. })
    ));
}

#[test]
fn establishing_twice_is_refused() {
    let dir = tempfile::tempdir().unwrap();
    establish(dir.path(), &State::default(), PASSWORD);

    let mut session = Session::new();
    let error = app::establish(
        &mut session,
        dir.path(),
        &State::default(),
        PASSWORD.to_owned(),
        WORK,
    )
    .unwrap_err();
    assert_eq!(error.kind, Kind::AlreadyEstablished);
    assert!(!session.is_unlocked());
}

#[test]
fn unlock_accepts_the_established_password_and_rejects_another() {
    let dir = tempfile::tempdir().unwrap();
    establish(dir.path(), &State::default(), PASSWORD);

    let mut session = Session::new();
    let error = app::unlock(&mut session, dir.path(), OTHER.to_owned()).unwrap_err();
    assert_eq!(error.kind, Kind::WrongPassphrase);
    assert!(!session.is_unlocked());

    app::unlock(&mut session, dir.path(), PASSWORD.to_owned()).unwrap();
    assert!(session.is_unlocked());
}

#[test]
fn unlock_before_establishment_is_refused() {
    let dir = tempfile::tempdir().unwrap();
    let mut session = Session::new();
    let error = app::unlock(&mut session, dir.path(), PASSWORD.to_owned()).unwrap_err();
    assert_eq!(error.kind, Kind::NotEstablished);
}

#[test]
fn a_half_written_plaintext_sentinel_does_not_count_and_is_overwritten() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(app::sentinel_path(dir.path()), b"interrupted").unwrap();

    assert!(!app::is_established(dir.path()));
    establish(dir.path(), &State::default(), PASSWORD);
    assert!(app::is_established(dir.path()));

    let mut session = Session::new();
    app::unlock(&mut session, dir.path(), PASSWORD.to_owned()).unwrap();
}

fn state_with_sealed_file(passphrase: &str) -> (tempfile::TempDir, State) {
    let repo = tempfile::tempdir().unwrap();
    let path = repo.path().join(".env.production");
    std::fs::write(&path, "SECRET=value\n").unwrap();
    seal_engine::operations::seal(&path, &SecretString::from(passphrase.to_owned()), WORK).unwrap();

    let state = State {
        repos: vec![Repo {
            root: repo.path().to_path_buf(),
            uses_override_passphrase: false,
            files: vec![ManagedFile {
                relative_path: PathBuf::from(".env.production"),
                last_known: SealedState::Sealed,
                fingerprint: None,
                unknown: Default::default(),
            }],
            unknown: Default::default(),
        }],
        acknowledged_irreversibility: true,
        ..Default::default()
    };
    (repo, state)
}

#[test]
fn establishing_over_existing_sealed_files_demands_their_password() {
    let dir = tempfile::tempdir().unwrap();
    let (_repo, state) = state_with_sealed_file(PASSWORD);

    let mut session = Session::new();
    let error =
        app::establish(&mut session, dir.path(), &state, OTHER.to_owned(), WORK).unwrap_err();
    assert_eq!(error.kind, Kind::WrongPassphrase);
    assert!(!app::is_established(dir.path()));

    establish(dir.path(), &state, PASSWORD);
    assert!(app::is_established(dir.path()));
}

#[test]
fn a_rekey_that_carries_the_sentinel_moves_the_unlock_password() {
    let dir = tempfile::tempdir().unwrap();
    let (_repo, state) = state_with_sealed_file(PASSWORD);
    establish(dir.path(), &state, PASSWORD);

    let ledger = Ledger::new(dir.path());
    let mut paths = vec![app::sentinel_path(dir.path())];
    paths.extend(state.managed_paths());
    let manifest = rekey::begin(&ledger, paths, WORK).unwrap();
    assert_eq!(manifest.entries[0].path, app::sentinel_path(dir.path()));

    let outcome = rekey::run(
        &ledger,
        &SecretString::from(PASSWORD.to_owned()),
        &SecretString::from(OTHER.to_owned()),
    )
    .unwrap();
    assert!(outcome.is_complete());

    let mut session = Session::new();
    let error = app::unlock(&mut session, dir.path(), PASSWORD.to_owned()).unwrap_err();
    assert_eq!(error.kind, Kind::WrongPassphrase);
    app::unlock(&mut session, dir.path(), OTHER.to_owned()).unwrap();
}
