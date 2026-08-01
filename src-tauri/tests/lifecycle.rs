#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use std::path::{Path, PathBuf};

use age::secrecy::SecretString;
use seal_desktop::error::Kind;
use seal_desktop::lifecycle::{self, Release};
use seal_registry::state::{SealedState, State};

const PASSPHRASE: &str = "correct horse battery staple";

fn repo_with_secrets() -> (tempfile::TempDir, PathBuf) {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path().to_path_buf();
    std::fs::write(root.join(".env"), "A=1\n").unwrap();
    std::fs::write(root.join(".env.production"), "DATABASE_URL=real\n").unwrap();
    std::fs::write(root.join(".env.example"), "A=\n").unwrap();
    std::fs::write(root.join("main.rs"), "fn main() {}\n").unwrap();
    std::fs::create_dir_all(root.join("node_modules/pkg")).unwrap();
    std::fs::write(root.join("node_modules/pkg/.env"), "NOISE=1\n").unwrap();
    (dir, root)
}

fn acknowledged() -> State {
    let mut state = State::default();
    lifecycle::acknowledge(&mut state);
    state
}

#[test]
fn a_fresh_registry_gains_a_repo_through_import() {
    let (_dir, root) = repo_with_secrets();
    let mut state = State::default();

    assert!(state.repos.is_empty(), "a fresh registry manages nothing");

    let view = lifecycle::scan_folder(&root, &state).unwrap();
    assert!(!view.already_registered);

    let selected: Vec<PathBuf> = view
        .candidates
        .iter()
        .filter(|candidate| candidate.preselected)
        .map(|candidate| candidate.relative_path.clone())
        .collect();
    assert!(
        selected.contains(&PathBuf::from(".env.production")),
        "a real secret must be preselected, got {selected:?}"
    );

    let added = lifecycle::manage(&mut state, &root, &selected).unwrap();

    assert_eq!(added, selected.len());
    assert_eq!(state.repos.len(), 1);
    assert_eq!(state.repos[0].root, root);
}

#[test]
fn the_committed_example_is_offered_but_never_preselected() {
    let (_dir, root) = repo_with_secrets();
    let state = State::default();

    let view = lifecycle::scan_folder(&root, &state).unwrap();
    let example = view
        .candidates
        .iter()
        .find(|candidate| candidate.relative_path == Path::new(".env.example"))
        .expect("the example must be offered so the user can decide");

    assert!(
        !example.preselected,
        "a template is not a secret and must never be preselected"
    );
}

#[test]
fn noise_directories_are_not_proposed() {
    let (_dir, root) = repo_with_secrets();
    let state = State::default();

    let view = lifecycle::scan_folder(&root, &state).unwrap();
    assert!(
        !view
            .candidates
            .iter()
            .any(|candidate| candidate.relative_path.starts_with("node_modules")),
        "dependency directories must be pruned from the scan"
    );
}

#[test]
fn importing_the_same_folder_twice_merges_rather_than_duplicating() {
    let (_dir, root) = repo_with_secrets();
    let mut state = State::default();

    let first = lifecycle::manage(&mut state, &root, &[PathBuf::from(".env.production")]).unwrap();
    let second = lifecycle::manage(
        &mut state,
        &root,
        &[PathBuf::from(".env.production"), PathBuf::from(".env")],
    )
    .unwrap();

    assert_eq!(first, 1);
    assert_eq!(second, 1, "only the genuinely new file counts as added");
    assert_eq!(state.repos.len(), 1, "the repo must not be duplicated");
    assert_eq!(state.repos[0].files.len(), 2);
}

#[test]
fn a_rescan_marks_what_is_already_managed() {
    let (_dir, root) = repo_with_secrets();
    let mut state = State::default();
    lifecycle::manage(&mut state, &root, &[PathBuf::from(".env.production")]).unwrap();

    let view = lifecycle::scan_folder(&root, &state).unwrap();

    assert!(view.already_registered);
    let managed = view
        .candidates
        .iter()
        .find(|c| c.relative_path == Path::new(".env.production"))
        .unwrap();
    assert!(managed.already_managed);
}

#[test]
fn import_refuses_a_path_that_escapes_the_repo() {
    let (_dir, root) = repo_with_secrets();
    let mut state = State::default();

    let error =
        lifecycle::manage(&mut state, &root, &[PathBuf::from("../elsewhere/.env")]).unwrap_err();

    assert_eq!(
        error.kind,
        Kind::NotManaged,
        "a traversing path must be refused rather than recorded"
    );
}

#[test]
fn import_records_whether_each_file_is_already_sealed() {
    let (_dir, root) = repo_with_secrets();
    let sealed = root.join(".env.production");
    seal_engine::operations::seal(
        &sealed,
        &SecretString::from(PASSPHRASE.to_owned()),
        seal_engine::format::MINIMUM_WORK_FACTOR,
    )
    .unwrap();

    let mut state = State::default();
    lifecycle::manage(
        &mut state,
        &root,
        &[PathBuf::from(".env.production"), PathBuf::from(".env")],
    )
    .unwrap();

    let state_of = |name: &str| {
        state.repos[0]
            .files
            .iter()
            .find(|f| f.relative_path == Path::new(name))
            .unwrap()
            .last_known
    };

    assert_eq!(state_of(".env.production"), SealedState::Sealed);
    assert_eq!(state_of(".env"), SealedState::Plaintext);
}

#[test]
fn importing_never_seals_anything() {
    let (_dir, root) = repo_with_secrets();
    let mut state = State::default();

    lifecycle::manage(&mut state, &root, &[PathBuf::from(".env.production")]).unwrap();

    assert_eq!(
        std::fs::read_to_string(root.join(".env.production")).unwrap(),
        "DATABASE_URL=real\n",
        "pointing Seal at a folder must never encrypt a file the user did not choose to seal"
    );
}

#[test]
fn releasing_a_file_restores_its_plaintext_and_forgets_it() {
    let (_dir, root) = repo_with_secrets();
    let path = root.join(".env.production");
    let original = std::fs::read(&path).unwrap();

    seal_engine::operations::seal(
        &path,
        &SecretString::from(PASSPHRASE.to_owned()),
        seal_engine::format::MINIMUM_WORK_FACTOR,
    )
    .unwrap();

    let mut state = acknowledged();
    lifecycle::manage(&mut state, &root, &[PathBuf::from(".env.production")]).unwrap();

    lifecycle::release(
        &mut state,
        &path,
        Release::RestorePlaintext,
        &SecretString::from(PASSPHRASE.to_owned()),
    )
    .unwrap();

    assert_eq!(
        std::fs::read(&path).unwrap(),
        original,
        "removal from management is the one action that legitimately ends in plaintext"
    );
    assert!(
        state.repos.is_empty(),
        "the repo record goes when its last file does"
    );
}

#[test]
fn releasing_can_leave_the_file_sealed() {
    let (_dir, root) = repo_with_secrets();
    let path = root.join(".env.production");
    seal_engine::operations::seal(
        &path,
        &SecretString::from(PASSPHRASE.to_owned()),
        seal_engine::format::MINIMUM_WORK_FACTOR,
    )
    .unwrap();

    let mut state = acknowledged();
    lifecycle::manage(&mut state, &root, &[PathBuf::from(".env.production")]).unwrap();

    lifecycle::release(
        &mut state,
        &path,
        Release::LeaveSealed,
        &SecretString::from(PASSPHRASE.to_owned()),
    )
    .unwrap();

    assert!(
        matches!(
            seal_engine::operations::classify(&path).unwrap(),
            seal_engine::format::Classification::Sealed { .. }
        ),
        "a user who wants Seal to stop tracking a file need not want it decrypted"
    );
    assert!(state.repos.is_empty());
}

#[test]
fn releasing_one_of_several_files_keeps_the_repo() {
    let (_dir, root) = repo_with_secrets();
    let mut state = acknowledged();
    lifecycle::manage(
        &mut state,
        &root,
        &[PathBuf::from(".env.production"), PathBuf::from(".env")],
    )
    .unwrap();

    lifecycle::release(
        &mut state,
        &root.join(".env"),
        Release::LeaveSealed,
        &SecretString::from(PASSPHRASE.to_owned()),
    )
    .unwrap();

    assert_eq!(state.repos.len(), 1);
    assert_eq!(state.repos[0].files.len(), 1);
}

#[test]
fn releasing_an_unmanaged_file_is_refused() {
    let (_dir, root) = repo_with_secrets();
    let mut state = acknowledged();

    let error = lifecycle::release(
        &mut state,
        &root.join(".env"),
        Release::LeaveSealed,
        &SecretString::from(PASSPHRASE.to_owned()),
    )
    .unwrap_err();

    assert_eq!(error.kind, Kind::NotManaged);
}

#[test]
fn a_recently_modified_file_warns_before_sealing() {
    let (_dir, root) = repo_with_secrets();
    let path = root.join(".env.production");

    let warning = lifecycle::seal_warning(&path).expect("a file just written must warn");

    assert_eq!(warning.path, path);
    assert!(warning.modified_seconds_ago < 5);
}

#[test]
fn a_file_untouched_for_a_long_time_does_not_warn() {
    let (_dir, root) = repo_with_secrets();
    let path = root.join(".env.production");

    let long_ago = std::time::SystemTime::now()
        - lifecycle::RECENTLY_MODIFIED
        - std::time::Duration::from_secs(60);
    let file = std::fs::File::options().write(true).open(&path).unwrap();
    file.set_modified(long_ago).unwrap();

    assert!(
        lifecycle::seal_warning(&path).is_none(),
        "a file nobody has touched must not raise a warning nobody will read"
    );
}

#[test]
fn a_missing_file_does_not_warn() {
    let (_dir, root) = repo_with_secrets();
    assert!(lifecycle::seal_warning(&root.join("absent.env")).is_none());
}

#[test]
fn sealing_is_refused_until_the_consequences_are_acknowledged() {
    let state = State::default();

    let error = lifecycle::require_acknowledgement(&state).unwrap_err();
    assert_eq!(
        error.kind,
        Kind::NotAcknowledged,
        "the two irreversible consequences must be acknowledged before anything is sealed"
    );

    let state = acknowledged();
    assert!(lifecycle::require_acknowledgement(&state).is_ok());
}

#[test]
fn the_seal_command_itself_refuses_until_acknowledged() {
    let (_dir, root) = repo_with_secrets();
    let path = root.join(".env.production");

    let mut state = State::default();
    lifecycle::manage(&mut state, &root, &[PathBuf::from(".env.production")]).unwrap();

    let mut session = seal_session::Session::new();
    session
        .unlock(SecretString::from(PASSPHRASE.to_owned()))
        .unwrap();

    let error = seal_desktop::app::seal_file(&mut session, &path, &mut state).unwrap_err();
    assert_eq!(
        error.kind,
        Kind::NotAcknowledged,
        "the gate must sit on the command that seals, not only in the interface"
    );
    assert_eq!(
        std::fs::read_to_string(&path).unwrap(),
        "DATABASE_URL=real\n",
        "a refused seal must leave the file untouched"
    );

    lifecycle::acknowledge(&mut state);
    seal_desktop::app::seal_file(&mut session, &path, &mut state).unwrap();
    assert!(matches!(
        seal_engine::operations::classify(&path).unwrap(),
        seal_engine::format::Classification::Sealed { .. }
    ));
}

#[test]
fn the_acknowledgement_survives_a_restart() {
    let dir = tempfile::tempdir().unwrap();
    let store = seal_registry::store::Store::new(dir.path().to_path_buf());

    let held = seal_desktop::commands::Held::new(store.clone(), State::default());
    {
        let mut registry = held.registry.lock().unwrap();
        lifecycle::acknowledge(&mut registry);
        held.persist(&registry).unwrap();
    }

    let reloaded = store.load().unwrap();
    assert!(
        reloaded.acknowledged_irreversibility,
        "an acknowledgement the user gave once must not be asked for again after a restart"
    );
}
