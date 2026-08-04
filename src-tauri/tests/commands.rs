#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use std::path::{Path, PathBuf};

use age::secrecy::SecretString;
use seal_desktop::app;
use seal_desktop::error::Kind;
use seal_desktop::view::MASK;
use seal_registry::state::{ManagedFile, Repo, SealedState, State};
use seal_session::Session;

const PASSPHRASE: &str = "correct horse battery staple";
const CONTENT: &str = "\
# Production configuration
DATABASE_URL=postgres://user:pw@host/db
API_KEY=sk-live-42

# Feature flags
ENABLE_BETA=true
";

struct Fixture {
    _dir: tempfile::TempDir,
    root: PathBuf,
    path: PathBuf,
    state: State,
}

fn fixture() -> Fixture {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path().to_path_buf();
    let path = root.join(".env.production");
    std::fs::write(&path, CONTENT).unwrap();

    seal_engine::operations::seal(
        &path,
        &SecretString::from(PASSPHRASE.to_owned()),
        seal_engine::format::MINIMUM_WORK_FACTOR,
    )
    .unwrap();

    let state = State {
        repos: vec![Repo {
            root: root.clone(),
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

    Fixture {
        _dir: dir,
        root,
        path,
        state,
    }
}

fn env_of(opened: seal_desktop::view::OpenedFile) -> seal_desktop::view::EnvView {
    match opened {
        seal_desktop::view::OpenedFile::Env(view) => view,
        other => panic!("expected an editable env file, got {other:?}"),
    }
}

fn unlocked() -> Session {
    let mut session = Session::new();
    session
        .unlock(SecretString::from(PASSPHRASE.to_owned()))
        .unwrap();
    session
}

#[test]
fn opening_a_file_returns_structure_with_every_value_masked() {
    let fixture = fixture();
    let mut session = unlocked();

    let view = env_of(app::open_file(&mut session, &fixture.path, &fixture.state).unwrap());

    let keys: Vec<&str> = view.variables.iter().map(|v| v.key.as_str()).collect();
    assert_eq!(keys, vec!["DATABASE_URL", "API_KEY", "ENABLE_BETA"]);

    for variable in &view.variables {
        assert_eq!(
            variable.masked, MASK,
            "every value must be masked when a file is opened"
        );
    }
}

#[test]
fn no_secret_value_appears_anywhere_in_the_opened_view() {
    let fixture = fixture();
    let mut session = unlocked();

    let view = env_of(app::open_file(&mut session, &fixture.path, &fixture.state).unwrap());
    let serialized = serde_json::to_string(&view).unwrap();

    for secret in ["postgres://user:pw@host/db", "sk-live-42", "pw", "sk-live"] {
        assert!(
            !serialized.contains(secret),
            "opening a file must not carry {secret:?} across the boundary; got {serialized}"
        );
    }
}

#[test]
fn revealing_one_value_returns_that_value_and_nothing_else() {
    let fixture = fixture();
    let mut session = unlocked();
    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();

    let revealed = app::reveal(&mut session, &fixture.path, "API_KEY").unwrap();
    assert_eq!(String::from_utf8(revealed).unwrap(), "sk-live-42");

    let other = app::reveal(&mut session, &fixture.path, "DATABASE_URL").unwrap();
    assert_eq!(
        String::from_utf8(other).unwrap(),
        "postgres://user:pw@host/db",
        "each reveal returns exactly one value, so exposure is bounded per variable"
    );
}

#[test]
fn revealing_an_unknown_key_is_refused() {
    let fixture = fixture();
    let mut session = unlocked();
    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();

    let error = app::reveal(&mut session, &fixture.path, "NOT_THERE").unwrap_err();
    assert_eq!(error.kind, Kind::UnknownKey);
}

#[test]
fn a_locked_session_reveals_nothing() {
    let fixture = fixture();
    let mut session = unlocked();
    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();

    session.wipe();

    let error = app::reveal(&mut session, &fixture.path, "API_KEY").unwrap_err();
    assert_eq!(
        error.kind,
        Kind::Locked,
        "ending the session must make every held value unreachable"
    );
}

#[test]
fn opening_leaves_the_file_sealed_on_disk() {
    let fixture = fixture();
    let mut session = unlocked();

    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();

    let on_disk = std::fs::read(&fixture.path).unwrap();
    assert!(
        !on_disk.starts_with(b"# Production"),
        "unsealing in the application is a memory operation; the file stays sealed at its path"
    );
    assert!(matches!(
        seal_engine::operations::classify(&fixture.path).unwrap(),
        seal_engine::format::Classification::Sealed { .. }
    ));
}

#[test]
fn saving_an_edit_changes_one_value_and_preserves_the_rest() {
    let mut fixture = fixture();
    let mut session = unlocked();
    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();

    app::save(
        &mut session,
        &fixture.path,
        &[("API_KEY".to_owned(), "sk-live-rotated".to_owned())],
        &mut fixture.state,
    )
    .unwrap();

    let mut recovered = Vec::new();
    seal_engine::operations::unseal_to(
        &fixture.path,
        &mut recovered,
        &[SecretString::from(PASSPHRASE.to_owned())],
    )
    .unwrap();
    let recovered = String::from_utf8(recovered).unwrap();

    assert!(recovered.contains("API_KEY=sk-live-rotated"));
    assert!(
        recovered.contains("# Production configuration"),
        "saving must not strip the comments the user wrote"
    );
    assert!(recovered.contains("# Feature flags"));
    assert!(recovered.contains("DATABASE_URL=postgres://user:pw@host/db"));
    assert_eq!(
        recovered.lines().count(),
        CONTENT.lines().count(),
        "saving must not add or remove a line"
    );
}

#[test]
fn saving_leaves_the_file_sealed() {
    let mut fixture = fixture();
    let mut session = unlocked();
    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();

    app::save(
        &mut session,
        &fixture.path,
        &[("API_KEY".to_owned(), "rotated".to_owned())],
        &mut fixture.state,
    )
    .unwrap();

    assert!(matches!(
        seal_engine::operations::classify(&fixture.path).unwrap(),
        seal_engine::format::Classification::Sealed { .. }
    ));
}

#[test]
fn an_unmanaged_path_is_refused_rather_than_opened() {
    let fixture = fixture();
    let mut session = unlocked();
    let stranger = fixture.root.join("not-managed.env");
    std::fs::write(&stranger, "SECRET=1\n").unwrap();

    let error = app::open_file(&mut session, &stranger, &fixture.state).unwrap_err();
    assert_eq!(
        error.kind,
        Kind::NotManaged,
        "the command surface must be specific to managed files, never a general file reader"
    );
}

#[test]
fn sealing_closes_the_file_and_records_the_state() {
    let mut fixture = fixture();
    let mut session = unlocked();
    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();
    assert!(!session.open_paths().is_empty());

    app::seal_file(&mut session, &fixture.path, &mut fixture.state).unwrap();

    assert!(
        session.open_paths().is_empty(),
        "sealing must drop the plaintext it was holding"
    );
    assert_eq!(
        fixture.state.repos[0].files[0].last_known,
        SealedState::Sealed
    );
}

#[test]
fn a_wrong_passphrase_is_reported_as_such_without_echoing_it() {
    let fixture = fixture();
    let mut session = Session::new();
    session
        .unlock(SecretString::from("not-the-password".to_owned()))
        .unwrap();

    let error = app::open_file(&mut session, &fixture.path, &fixture.state).unwrap_err();
    assert_eq!(error.kind, Kind::WrongPassphrase);

    let serialized = serde_json::to_string(&error).unwrap();
    assert!(
        !serialized.contains("not-the-password"),
        "an error must never echo the passphrase; got {serialized}"
    );
}

#[test]
fn errors_crossing_the_boundary_carry_no_file_contents() {
    let fixture = fixture();
    let mut session = unlocked();

    let error = app::reveal(&mut session, &fixture.path, "API_KEY").unwrap_err();
    let serialized = serde_json::to_string(&error).unwrap();

    for secret in ["sk-live-42", "postgres://user:pw@host/db"] {
        assert!(
            !serialized.contains(secret),
            "an error must not carry secret material; got {serialized}"
        );
    }
}

#[test]
fn the_overview_reports_a_file_found_plaintext_as_an_alert() {
    let mut fixture = fixture();

    seal_engine::operations::unseal_to(
        &fixture.path,
        &mut Vec::new(),
        &[SecretString::from(PASSPHRASE.to_owned())],
    )
    .unwrap();
    std::fs::write(&fixture.path, CONTENT).unwrap();
    fixture.state.repos[0].files[0].last_known = SealedState::Sealed;

    let overview = app::overview(&fixture.state);

    assert!(
        overview[0].files[0].alert,
        "a file recorded as sealed but found in the clear must surface as an alert"
    );
}

#[test]
fn the_overview_reports_a_deleted_file_as_missing_rather_than_its_last_state() {
    let fixture = fixture();

    std::fs::remove_file(&fixture.path).unwrap();

    let overview = app::overview(&fixture.state);

    assert_eq!(
        overview[0].files[0].state,
        SealedState::Missing,
        "a managed file deleted on disk must read as missing, not as whatever it was last recorded as"
    );
}

#[test]
fn the_overview_reports_a_file_sealed_outside_seal_as_sealed() {
    let mut fixture = fixture();

    fixture.state.repos[0].files[0].last_known = SealedState::Plaintext;

    let overview = app::overview(&fixture.state);

    assert_eq!(
        overview[0].files[0].state,
        SealedState::Sealed,
        "a file that became sealed outside Seal must be reported as it actually is on disk"
    );
}

#[test]
fn the_overview_carries_no_secret_material() {
    let fixture = fixture();
    let overview = app::overview(&fixture.state);
    let serialized = serde_json::to_string(&overview).unwrap();

    for secret in ["sk-live-42", "postgres://user:pw@host/db"] {
        assert!(
            !serialized.contains(secret),
            "the cross-repo view must never carry file contents; got {serialized}"
        );
    }
}

#[test]
fn duplicate_keys_are_surfaced_to_the_interface() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join(".env");
    std::fs::write(&path, "A=first\nA=second\nB=ok\n").unwrap();

    let view = seal_desktop::view::env_view(Path::new(&path), b"A=first\nA=second\nB=ok\n");

    assert_eq!(view.duplicate_keys, vec!["A".to_owned()]);
}

#[test]
fn revealing_without_opening_the_file_first_is_refused() {
    let fixture = fixture();
    let mut session = unlocked();

    let error = app::reveal(&mut session, &fixture.path, "API_KEY").unwrap_err();
    assert_eq!(
        error.kind,
        Kind::NotOpen,
        "a value can only be revealed from plaintext already held, never fetched on demand"
    );
}

#[test]
fn wiping_held_state_locks_the_session_it_manages() {
    let dir = tempfile::tempdir().unwrap();
    let held = seal_desktop::commands::Held::new(
        seal_registry::store::Store::new(dir.path().to_path_buf()),
        State::default(),
    );

    {
        let mut session = held.session.lock().unwrap();
        session
            .unlock(SecretString::from(PASSPHRASE.to_owned()))
            .unwrap();
        assert!(session.is_unlocked());
    }

    held.wipe();

    let mut session = held.session.lock().unwrap();
    assert!(
        !session.is_unlocked(),
        "the wipe the exit handler calls must actually end the session"
    );
}

#[test]
fn sweeping_held_state_does_not_disturb_a_live_session() {
    let dir = tempfile::tempdir().unwrap();
    let held = seal_desktop::commands::Held::new(
        seal_registry::store::Store::new(dir.path().to_path_buf()),
        State::default(),
    );

    {
        let mut session = held.session.lock().unwrap();
        session
            .unlock(SecretString::from(PASSPHRASE.to_owned()))
            .unwrap();
    }

    held.sweep();

    let mut session = held.session.lock().unwrap();
    assert!(
        session.is_unlocked(),
        "the display sweep must not end a session that has not expired"
    );
}

#[test]
fn saving_persists_through_the_compare_and_retry_store() {
    let dir = tempfile::tempdir().unwrap();
    let store = seal_registry::store::Store::new(dir.path().to_path_buf());

    let fixture = fixture();
    store.store(&fixture.state).unwrap();

    let held = seal_desktop::commands::Held::new(store, fixture.state.clone());
    {
        let mut session = held.session.lock().unwrap();
        session
            .unlock(SecretString::from(PASSPHRASE.to_owned()))
            .unwrap();
    }

    let reloaded = held.store.load().unwrap();
    assert_eq!(
        reloaded.repos.len(),
        1,
        "the registry the interface reads must round-trip through the store"
    );
}

fn managed_non_env(name: &str, content: &[u8]) -> Fixture {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path().to_path_buf();
    let path = root.join(name);
    std::fs::write(&path, content).unwrap();

    seal_engine::operations::seal(
        &path,
        &SecretString::from(PASSPHRASE.to_owned()),
        seal_engine::format::MINIMUM_WORK_FACTOR,
    )
    .unwrap();

    let state = State {
        repos: vec![Repo {
            root: root.clone(),
            uses_override_passphrase: false,
            files: vec![ManagedFile {
                relative_path: PathBuf::from(name),
                last_known: SealedState::Sealed,
                fingerprint: None,
                unknown: Default::default(),
            }],
            unknown: Default::default(),
        }],
        acknowledged_irreversibility: true,
        ..Default::default()
    };

    Fixture {
        _dir: dir,
        root,
        path,
        state,
    }
}

const TFVARS: &[u8] = b"region = \"us-east-1\"\nsecret_key = \"AKIA-REAL-SECRET\"\n";

#[test]
fn a_managed_non_env_file_opens_as_opaque_rather_than_as_variables() {
    let fixture = managed_non_env("prod.tfvars", TFVARS);
    let mut session = unlocked();

    let opened = app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();

    match opened {
        seal_desktop::view::OpenedFile::Opaque { bytes, .. } => {
            assert_eq!(bytes, TFVARS.len());
        }
        other => {
            panic!("a non-env file must never be presented as editable variables, got {other:?}")
        }
    }
}

#[test]
fn saving_a_non_env_file_is_refused_rather_than_rewritten() {
    let mut fixture = managed_non_env("prod.tfvars", TFVARS);
    let mut session = unlocked();
    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();

    let error = app::save(
        &mut session,
        &fixture.path,
        &[("secret_key".to_owned(), "rotated".to_owned())],
        &mut fixture.state,
    )
    .unwrap_err();

    assert_eq!(
        error.kind,
        Kind::NotAnEnvFile,
        "a non-env file is stored as-is and never edited, so a save must be refused"
    );

    let mut recovered = Vec::new();
    seal_engine::operations::unseal_to(
        &fixture.path,
        &mut recovered,
        &[SecretString::from(PASSPHRASE.to_owned())],
    )
    .unwrap();
    assert_eq!(
        recovered, TFVARS,
        "the refused save must leave the file byte-for-byte unchanged"
    );
}

#[test]
fn revealing_from_a_non_env_file_is_refused() {
    let fixture = managed_non_env("credentials.json", br#"{"apiKey":"sk-live-42"}"#);
    let mut session = unlocked();
    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();

    let error = app::reveal(&mut session, &fixture.path, "apiKey").unwrap_err();
    assert_eq!(error.kind, Kind::NotAnEnvFile);
}

#[test]
fn an_envrc_is_managed_but_not_editable_since_it_is_a_shell_script() {
    let fixture = managed_non_env(".envrc", b"export FOO=bar\nsource_up\n");
    let mut session = unlocked();

    let opened = app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();
    assert!(
        matches!(opened, seal_desktop::view::OpenedFile::Opaque { .. }),
        "an .envrc is a shell script, not a key-value file, so editing it as one would corrupt it"
    );
}

#[test]
fn every_env_naming_variation_is_still_editable() {
    for name in [".env", ".env.production", ".env.local", "production.env"] {
        let fixture = managed_non_env(name, b"KEY=value\n");
        let mut session = unlocked();

        let opened = app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();
        assert!(
            matches!(opened, seal_desktop::view::OpenedFile::Env(_)),
            "{name} must remain editable"
        );
    }
}

fn plaintext_fixture(names: &[&str]) -> Fixture {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path().to_path_buf();

    let files = names
        .iter()
        .map(|name| {
            std::fs::write(root.join(name), CONTENT).unwrap();
            ManagedFile {
                relative_path: PathBuf::from(name),
                last_known: SealedState::Plaintext,
                fingerprint: None,
                unknown: Default::default(),
            }
        })
        .collect();

    let state = State {
        repos: vec![Repo {
            root: root.clone(),
            uses_override_passphrase: false,
            files,
            unknown: Default::default(),
        }],
        acknowledged_irreversibility: true,
        ..Default::default()
    };

    Fixture {
        path: root.join(names[0]),
        _dir: dir,
        root,
        state,
    }
}

#[test]
fn sealing_a_chosen_set_seals_exactly_those_files() {
    let mut fixture = plaintext_fixture(&[".env", ".env.staging", ".env.production"]);
    let mut session = unlocked();
    let chosen = vec![fixture.root.join(".env"), fixture.root.join(".env.staging")];

    let outcomes = app::seal_files(&mut session, &chosen, &mut fixture.state);

    assert!(outcomes.iter().all(|outcome| outcome.sealed));
    assert!(matches!(
        seal_engine::operations::classify(&fixture.root.join(".env")).unwrap(),
        seal_engine::format::Classification::Sealed { .. }
    ));
    assert!(
        !matches!(
            seal_engine::operations::classify(&fixture.root.join(".env.production")).unwrap(),
            seal_engine::format::Classification::Sealed { .. }
        ),
        "a file the user did not choose must be left readable"
    );
}

#[test]
fn one_failure_does_not_stop_the_rest_and_is_reported_per_path() {
    let mut fixture = plaintext_fixture(&[".env", ".env.staging"]);
    let mut session = unlocked();
    let stranger = fixture.root.join("not-managed.env");
    std::fs::write(&stranger, CONTENT).unwrap();

    let chosen = vec![
        stranger.clone(),
        fixture.root.join(".env"),
        fixture.root.join(".env.staging"),
    ];
    let outcomes = app::seal_files(&mut session, &chosen, &mut fixture.state);

    assert_eq!(outcomes[0].reason, Some(Kind::NotManaged));
    assert!(!outcomes[0].sealed);
    assert!(
        outcomes[1].sealed && outcomes[2].sealed,
        "a failure on one file must not abort the files after it"
    );
}

#[test]
fn a_batch_seal_is_refused_entirely_until_the_consequences_are_acknowledged() {
    let mut fixture = plaintext_fixture(&[".env", ".env.staging"]);
    fixture.state.acknowledged_irreversibility = false;
    let mut session = unlocked();
    let chosen = vec![fixture.root.join(".env"), fixture.root.join(".env.staging")];

    let outcomes = app::seal_files(&mut session, &chosen, &mut fixture.state);

    assert!(
        outcomes
            .iter()
            .all(|outcome| outcome.reason == Some(Kind::NotAcknowledged)),
        "the acknowledgement gate must hold for every file in a batch"
    );
    assert!(
        !matches!(
            seal_engine::operations::classify(&fixture.root.join(".env")).unwrap(),
            seal_engine::format::Classification::Sealed { .. }
        ),
        "nothing may be sealed before the acknowledgement"
    );
}

#[test]
fn a_batch_outcome_never_carries_secret_material() {
    let mut fixture = plaintext_fixture(&[".env"]);
    let mut session = unlocked();
    let chosen = vec![fixture.root.join(".env")];

    let outcomes = app::seal_files(&mut session, &chosen, &mut fixture.state);
    let serialized = serde_json::to_string(&outcomes).unwrap();

    assert!(!serialized.contains("sk-live-42"));
    assert!(!serialized.contains(PASSPHRASE));
}
