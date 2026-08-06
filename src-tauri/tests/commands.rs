#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use std::path::{Path, PathBuf};

use age::secrecy::SecretString;
use seal_desktop::app;
use seal_desktop::error::Kind;
use seal_desktop::view::MASK;
use seal_dotenv::{Op, RowId};
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

fn row_of(session: &mut Session, path: &Path, state: &State, key: &str) -> RowId {
    let opened = app::open_file(session, path, state).unwrap();
    match opened {
        seal_desktop::view::OpenedFile::Env(view) => RowId::new(
            view.variables
                .iter()
                .find(|variable| variable.key == key)
                .unwrap_or_else(|| panic!("{key} must be in the file"))
                .id,
        ),
        _ => panic!("not an env file"),
    }
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
    let mut carried = serde_json::to_value(&view).unwrap();
    carried
        .as_object_mut()
        .expect("the view serializes as an object")
        .remove("path")
        .expect("the view carries the path it opened");
    let serialized = serde_json::to_string(&carried).unwrap();

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

    let row = row_of(&mut session, &fixture.path, &fixture.state, "API_KEY");
    let revealed = app::reveal(&mut session, &fixture.path, row).unwrap();
    assert_eq!(String::from_utf8(revealed).unwrap(), "sk-live-42");

    let row = row_of(&mut session, &fixture.path, &fixture.state, "DATABASE_URL");
    let other = app::reveal(&mut session, &fixture.path, row).unwrap();
    assert_eq!(
        String::from_utf8(other).unwrap(),
        "postgres://user:pw@host/db",
        "each reveal returns exactly one value, so exposure is bounded per variable"
    );
}

#[test]
fn revealing_a_row_the_file_does_not_hold_is_refused() {
    let fixture = fixture();
    let mut session = unlocked();
    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();

    let absent = RowId::new(9_999);
    let error = app::reveal(&mut session, &fixture.path, absent).unwrap_err();
    assert_eq!(error.kind, Kind::UnknownRow);
}

#[test]
fn a_locked_session_reveals_nothing() {
    let fixture = fixture();
    let mut session = unlocked();
    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();
    let row = row_of(&mut session, &fixture.path, &fixture.state, "API_KEY");

    session.wipe();

    let error = app::reveal(&mut session, &fixture.path, row).unwrap_err();
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

    let row = row_of(&mut session, &fixture.path, &fixture.state, "API_KEY");
    app::save(
        &mut session,
        &fixture.path,
        &[Op::SetValue {
            row,
            value: "sk-live-rotated".to_owned(),
        }],
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

    let row = row_of(&mut session, &fixture.path, &fixture.state, "API_KEY");
    app::save(
        &mut session,
        &fixture.path,
        &[Op::SetValue {
            row,
            value: "rotated".to_owned(),
        }],
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

    let error = app::reveal(&mut session, &fixture.path, RowId::new(1)).unwrap_err();
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
fn each_duplicate_row_reveals_its_own_value() {
    let source = b"A=first\nA=second\nB=ok\n";
    let view = seal_desktop::view::env_view(Path::new(".env"), source);

    let rows: Vec<_> = view
        .variables
        .iter()
        .filter(|variable| variable.key == "A")
        .collect();
    assert_eq!(rows.len(), 2, "both duplicate rows are shown");

    assert_eq!(
        seal_desktop::view::value_of(source, RowId::new(rows[0].id)).as_deref(),
        Some("first")
    );
    assert_eq!(
        seal_desktop::view::value_of(source, RowId::new(rows[1].id)).as_deref(),
        Some("second"),
        "the second row must reveal its own value, not the first row's"
    );
}

#[test]
fn a_disabled_variable_reaches_the_interface_as_a_row() {
    let source = b"LIVE=yes\n# PAUSED=no\n";
    let view = seal_desktop::view::env_view(Path::new(".env"), source);

    assert_eq!(view.variables.len(), 2);
    assert!(!view.variables[0].disabled);
    assert_eq!(view.variables[1].key, "PAUSED");
    assert!(view.variables[1].disabled);
    assert_eq!(
        view.variables[1].masked, MASK,
        "a disabled variable's value is still a secret and stays masked"
    );
}

#[test]
fn malformed_lines_reach_the_interface_as_rows_rather_than_a_count() {
    let source = b"GOOD=1\nthis line makes no sense\n";
    let view = seal_desktop::view::env_view(Path::new(".env"), source);

    assert_eq!(view.malformed.len(), 1);
    assert_eq!(view.malformed[0].text, "this line makes no sense");
    assert_eq!(
        view.unparseable_lines, 1,
        "the count stays consistent with the rows it counts"
    );
}

#[test]
fn saving_returns_the_reparsed_view_so_new_rows_are_addressable() {
    let mut fixture = fixture();
    let mut session = unlocked();
    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();

    let refreshed = app::save(
        &mut session,
        &fixture.path,
        &[Op::Insert {
            after: None,
            key: "ADDED".to_owned(),
            value: "new".to_owned(),
            disabled: false,
        }],
        &mut fixture.state,
    )
    .unwrap();

    let added = refreshed
        .variables
        .iter()
        .find(|variable| variable.key == "ADDED")
        .expect("the created row is in the returned view");

    let revealed = app::reveal(&mut session, &fixture.path, RowId::new(added.id)).unwrap();
    assert_eq!(
        String::from_utf8(revealed).unwrap(),
        "new",
        "the id the save returned addresses the row it created"
    );
}

#[test]
fn an_edit_naming_a_row_the_file_lost_is_refused_without_writing() {
    let mut fixture = fixture();
    let mut session = unlocked();
    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();
    let before = std::fs::read(&fixture.path).unwrap();

    let error = app::save(
        &mut session,
        &fixture.path,
        &[Op::SetValue {
            row: RowId::new(9_999),
            value: "nope".to_owned(),
        }],
        &mut fixture.state,
    )
    .unwrap_err();

    assert_eq!(error.kind, Kind::UnknownRow);
    assert_eq!(
        std::fs::read(&fixture.path).unwrap(),
        before,
        "a refused edit list leaves the file untouched"
    );
}

#[test]
fn a_created_key_that_is_not_plausible_is_refused() {
    let mut fixture = fixture();
    let mut session = unlocked();
    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();

    let error = app::save(
        &mut session,
        &fixture.path,
        &[Op::Insert {
            after: None,
            key: "not a key".to_owned(),
            value: "x".to_owned(),
            disabled: false,
        }],
        &mut fixture.state,
    )
    .unwrap_err();

    assert_eq!(error.kind, Kind::InvalidKey);
}

#[test]
fn correcting_a_malformed_row_with_text_that_still_fails_is_refused() {
    let mut fixture = managed_non_env(".env", b"GOOD=1\nnonsense here\n");
    let path = fixture.path.clone();
    let mut session = unlocked();
    let before = std::fs::read(&path).unwrap();

    let opened = app::open_file(&mut session, &path, &fixture.state).unwrap();
    let row = match opened {
        seal_desktop::view::OpenedFile::Env(view) => RowId::new(view.malformed[0].id),
        _ => panic!("env file"),
    };

    let error = app::save(
        &mut session,
        &path,
        &[Op::ReplaceMalformed {
            row,
            text: "still nonsense".to_owned(),
        }],
        &mut fixture.state,
    )
    .unwrap_err();

    assert_eq!(error.kind, Kind::StillMalformed);
    assert_eq!(
        std::fs::read(&path).unwrap(),
        before,
        "Correct refuses rather than guessing, and writes nothing"
    );
}

#[test]
fn revealing_without_opening_the_file_first_is_refused() {
    let fixture = fixture();
    let mut session = unlocked();

    let error = app::reveal(&mut session, &fixture.path, RowId::new(1)).unwrap_err();
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
        &[Op::SetValue {
            row: RowId::new(0),
            value: "rotated".to_owned(),
        }],
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

    let error = app::reveal(&mut session, &fixture.path, RowId::new(0)).unwrap_err();
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

    assert!(outcomes.iter().all(|outcome| outcome.ok));
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
    assert!(!outcomes[0].ok);
    assert!(
        outcomes[1].ok && outcomes[2].ok,
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

#[test]
fn a_readable_managed_file_opens_for_editing_like_a_sealed_one() {
    let fixture = plaintext_fixture(&[".env"]);
    let mut session = unlocked();

    let view = env_of(app::open_file(&mut session, &fixture.path, &fixture.state).unwrap());

    let keys: Vec<&str> = view.variables.iter().map(|v| v.key.as_str()).collect();
    assert_eq!(
        keys,
        vec!["DATABASE_URL", "API_KEY", "ENABLE_BETA"],
        "a managed file that is readable on disk must open in the application"
    );
    for variable in &view.variables {
        assert_eq!(
            variable.masked, MASK,
            "a readable file's values are masked exactly as a sealed file's are"
        );
    }
}

#[test]
fn opening_a_readable_file_leaves_it_readable_on_disk() {
    let fixture = plaintext_fixture(&[".env"]);
    let mut session = unlocked();

    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();

    assert!(
        !matches!(
            seal_engine::operations::classify(&fixture.path).unwrap(),
            seal_engine::format::Classification::Sealed { .. }
        ),
        "opening a file must never change what is on disk"
    );
}

#[test]
fn saving_a_readable_file_leaves_it_readable() {
    let mut fixture = plaintext_fixture(&[".env"]);
    let mut session = unlocked();

    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();
    let row = row_of(&mut session, &fixture.path, &fixture.state, "API_KEY");
    app::save(
        &mut session,
        &fixture.path,
        &[Op::SetValue {
            row,
            value: "sk-live-99".to_owned(),
        }],
        &mut fixture.state,
    )
    .unwrap();

    let on_disk = std::fs::read_to_string(&fixture.path).unwrap();
    assert!(
        !on_disk.starts_with("-----BEGIN AGE"),
        "saving must honour the state the user chose, not seal a file they deliberately unsealed"
    );
    assert!(
        on_disk.contains("sk-live-99"),
        "the edit must reach the file"
    );
    assert!(
        on_disk.contains("# Production configuration"),
        "the rest of the file is preserved exactly"
    );
}

#[test]
fn saving_a_sealed_file_leaves_it_sealed() {
    let mut fixture = fixture();
    let mut session = unlocked();

    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();
    let row = row_of(&mut session, &fixture.path, &fixture.state, "API_KEY");
    app::save(
        &mut session,
        &fixture.path,
        &[Op::SetValue {
            row,
            value: "sk-live-99".to_owned(),
        }],
        &mut fixture.state,
    )
    .unwrap();

    assert!(
        matches!(
            seal_engine::operations::classify(&fixture.path).unwrap(),
            seal_engine::format::Classification::Sealed { .. }
        ),
        "a sealed file stays sealed across a save"
    );

    let mut plaintext = Vec::new();
    seal_engine::operations::unseal_to(
        &fixture.path,
        &mut plaintext,
        &[SecretString::from(PASSPHRASE.to_owned())],
    )
    .unwrap();
    assert!(String::from_utf8_lossy(&plaintext).contains("sk-live-99"));
}

#[test]
fn writing_plaintext_refuses_a_sealed_file() {
    let fixture = fixture();

    let error =
        seal_engine::operations::write_plaintext(&fixture.path, b"OVERWRITTEN=yes\n").unwrap_err();

    assert!(
        matches!(
            error,
            seal_engine::operations::OperationError::AlreadySealed { .. }
        ),
        "the plaintext writer must never overwrite a sealed file, whatever the caller believes"
    );
    let on_disk = std::fs::read_to_string(&fixture.path).unwrap();
    assert!(on_disk.starts_with("-----BEGIN AGE"));
    assert!(!on_disk.contains("OVERWRITTEN"));
}

#[test]
fn unsealing_makes_the_file_readable_and_keeps_managing_it() {
    let mut fixture = fixture();
    let mut session = unlocked();

    app::unseal_file(&mut session, &fixture.path, &mut fixture.state).unwrap();

    assert_eq!(
        std::fs::read_to_string(&fixture.path).unwrap(),
        CONTENT,
        "unsealing restores the original plaintext at the file's own path"
    );
    assert!(
        fixture.state.repos.iter().any(|repo| repo
            .files
            .iter()
            .any(|file| repo.root.join(&file.relative_path) == fixture.path)),
        "unsealing must not remove the file from management — that is what releasing does"
    );
}

#[test]
fn an_unsealed_file_is_recorded_readable_so_it_raises_no_exposure_alert() {
    let mut fixture = fixture();
    let mut session = unlocked();

    app::unseal_file(&mut session, &fixture.path, &mut fixture.state).unwrap();
    let view = app::overview(&fixture.state);
    let file = &view[0].files[0];

    assert_eq!(file.state, SealedState::Plaintext);
    assert!(
        !file.alert,
        "a deliberately unsealed file is not the recorded-sealed-found-readable regression, \
         and alerting on it would make the alert meaningless"
    );
}

#[test]
fn a_file_unsealed_outside_seal_still_raises_the_alert() {
    let mut fixture = fixture();
    std::fs::write(&fixture.path, CONTENT).unwrap();

    let view = app::overview(&fixture.state);
    let file = &view[0].files[0];

    assert!(
        file.alert,
        "the alert must still fire for a file Seal recorded as sealed and found readable"
    );
    let _ = &mut fixture.state;
}

#[test]
fn unsealing_drops_any_plaintext_the_session_was_holding() {
    let mut fixture = fixture();
    let mut session = unlocked();

    app::open_file(&mut session, &fixture.path, &fixture.state).unwrap();
    app::unseal_file(&mut session, &fixture.path, &mut fixture.state).unwrap();

    assert!(
        !session.holds(&fixture.path),
        "unsealing closes the file, so no held plaintext outlives the state change"
    );
}

#[test]
fn unsealing_an_unmanaged_path_is_refused() {
    let mut fixture = fixture();
    let mut session = unlocked();
    let stranger = fixture.root.join("not-managed.env");
    std::fs::write(&stranger, CONTENT).unwrap();

    let error = app::unseal_file(&mut session, &stranger, &mut fixture.state).unwrap_err();

    assert_eq!(error.kind, Kind::NotManaged);
    assert_eq!(
        std::fs::read_to_string(&stranger).unwrap(),
        CONTENT,
        "a refused unseal leaves the file exactly as it was"
    );
}

#[test]
fn unsealing_several_reports_each_one_by_path() {
    let mut fixture = plaintext_fixture(&[".env", ".env.staging"]);
    let mut session = unlocked();
    let paths: Vec<PathBuf> = [".env", ".env.staging"]
        .iter()
        .map(|name| fixture.root.join(name))
        .collect();

    for path in &paths {
        seal_engine::operations::seal(
            path,
            &SecretString::from(PASSPHRASE.to_owned()),
            seal_engine::format::MINIMUM_WORK_FACTOR,
        )
        .unwrap();
    }

    let outcomes = app::unseal_files(&mut session, &paths, &mut fixture.state);

    assert_eq!(outcomes.len(), 2);
    assert!(outcomes.iter().all(|outcome| outcome.ok));
    for path in &paths {
        assert_eq!(std::fs::read_to_string(path).unwrap(), CONTENT);
    }
}

#[test]
fn an_unseal_outcome_never_carries_secret_material() {
    let mut fixture = fixture();
    let mut session = unlocked();
    let paths = vec![fixture.path.clone()];

    let outcomes = app::unseal_files(&mut session, &paths, &mut fixture.state);
    let serialized = serde_json::to_string(&outcomes).unwrap();

    assert!(!serialized.contains("sk-live-42"));
    assert!(!serialized.contains(PASSPHRASE));
}

#[test]
fn a_whole_session_of_interface_edits_applies_as_one_batch() {
    let source =
        b"# Stripe\nSTRIPE_SECRET=sk_live\nSTRIPE_HOOK=whsec\n\n# DISABLED_ONE=paused\nDATABASE_URL=postgres://x\nthis line is broken\n";
    let view = seal_desktop::view::env_view(Path::new(".env"), source);

    let id = |key: &str| {
        view.variables
            .iter()
            .find(|variable| variable.key == key)
            .unwrap_or_else(|| panic!("{key} must be in the view"))
            .id
    };
    let broken = view.malformed[0].id;

    assert!(
        view.variables
            .iter()
            .any(|variable| variable.key == "DISABLED_ONE" && variable.disabled),
        "the commented-out line reaches the interface as a disabled variable"
    );

    let ops = vec![
        Op::Reorder {
            rows: vec![
                RowId::new(id("DATABASE_URL")),
                RowId::new(id("STRIPE_SECRET")),
                RowId::new(id("STRIPE_HOOK")),
                RowId::new(id("DISABLED_ONE")),
                RowId::new(broken),
            ],
        },
        Op::SetKey {
            row: RowId::new(id("STRIPE_SECRET")),
            key: "STRIPE_KEY".to_owned(),
        },
        Op::SetDisabled {
            row: RowId::new(id("DISABLED_ONE")),
            disabled: false,
        },
        Op::ReplaceMalformed {
            row: RowId::new(broken),
            text: "FIXED=now".to_owned(),
        },
        Op::Insert {
            after: Some(RowId::new(id("DATABASE_URL"))),
            key: "REDIS_URL".to_owned(),
            value: "redis://y".to_owned(),
            disabled: false,
        },
        Op::Remove {
            row: RowId::new(id("STRIPE_HOOK")),
        },
    ];

    let written = seal_desktop::view::apply_ops(source, &ops).expect("the batch applies");
    let text = String::from_utf8(written).expect("utf8");

    assert_eq!(
        text,
        "# Stripe\nDATABASE_URL=postgres://x\nREDIS_URL=redis://y\nSTRIPE_KEY=sk_live\n\nDISABLED_ONE=paused\nFIXED=now\n"
    );
}
