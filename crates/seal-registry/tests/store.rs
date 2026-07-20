#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use std::path::PathBuf;

use seal_registry::state::{ManagedFile, Repo, State, CURRENT_VERSION};
use seal_registry::store::{Store, StoreError};

fn store_in(dir: &tempfile::TempDir) -> Store {
    Store::new(dir.path().join("seal"))
}

fn repo_with(root: &str, files: &[&str]) -> Repo {
    let mut repo = Repo::new(PathBuf::from(root));
    for file in files {
        repo.files.push(ManagedFile::new(PathBuf::from(file)));
    }
    repo
}

#[test]
fn an_absent_registry_loads_as_empty_rather_than_failing() {
    let dir = tempfile::tempdir().unwrap();
    let state = store_in(&dir).load().unwrap();

    assert_eq!(state.version, CURRENT_VERSION);
    assert!(state.repos.is_empty());
    assert_eq!(state.revision, 0);
}

#[test]
fn state_round_trips_through_the_store() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_in(&dir);

    let mut state = State::default();
    state
        .repos
        .push(repo_with("/work/api", &[".env.production", ".env.staging"]));
    state.repos.push(repo_with("/work/web", &[".env.local"]));
    state.repos[1].uses_override_passphrase = true;

    store.store(&state).unwrap();
    let loaded = store.load().unwrap();

    assert_eq!(loaded, state);
    assert!(loaded.repos[1].uses_override_passphrase);
}

#[test]
fn the_registry_is_readable_only_by_its_owner() {
    use std::os::unix::fs::PermissionsExt;

    let dir = tempfile::tempdir().unwrap();
    let store = store_in(&dir);
    store.store(&State::default()).unwrap();

    let file_mode = std::fs::metadata(store.path())
        .unwrap()
        .permissions()
        .mode()
        & 0o777;
    assert_eq!(
        file_mode, 0o600,
        "the registry names every secret file on the machine and must not be world-readable"
    );

    let dir_mode = std::fs::metadata(store.path().parent().unwrap())
        .unwrap()
        .permissions()
        .mode()
        & 0o777;
    assert_eq!(dir_mode, 0o700, "its directory must be owner-only too");
}

#[test]
fn a_previous_good_copy_is_kept() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_in(&dir);

    let mut first = State::default();
    first.repos.push(repo_with("/work/api", &[".env"]));
    store.store(&first).unwrap();

    let mut second = first.clone();
    second.repos.push(repo_with("/work/web", &[".env"]));
    store.store(&second).unwrap();

    let backup = store.path().with_extension("json.previous");
    assert!(
        backup.exists(),
        "a corrupt registry must be recoverable from the last good copy"
    );
    let recovered: State = serde_json::from_slice(&std::fs::read(&backup).unwrap()).unwrap();
    assert_eq!(recovered.repos.len(), 1);
}

#[test]
fn unknown_fields_survive_a_load_and_store_cycle() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_in(&dir);
    std::fs::create_dir_all(store.path().parent().unwrap()).unwrap();

    let written = serde_json::json!({
        "version": CURRENT_VERSION,
        "revision": 3,
        "repos": [{
            "root": "/work/api",
            "uses_override_passphrase": false,
            "files": [{
                "relative_path": ".env.production",
                "last_known": "sealed",
                "future_per_file_field": "keep me"
            }],
            "future_per_repo_field": {"nested": true}
        }],
        "future_top_level_field": [1, 2, 3]
    });
    std::fs::write(store.path(), serde_json::to_vec_pretty(&written).unwrap()).unwrap();

    let loaded = store.load().unwrap();
    store.store(&loaded).unwrap();

    let reread: serde_json::Value =
        serde_json::from_slice(&std::fs::read(store.path()).unwrap()).unwrap();

    assert_eq!(
        reread["future_top_level_field"],
        serde_json::json!([1, 2, 3]),
        "an older Seal must not destroy fields a newer one wrote"
    );
    assert_eq!(reread["repos"][0]["future_per_repo_field"]["nested"], true);
    assert_eq!(
        reread["repos"][0]["files"][0]["future_per_file_field"],
        "keep me"
    );
}

#[test]
fn a_registry_from_the_future_is_readable_but_never_rewritten() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_in(&dir);
    std::fs::create_dir_all(store.path().parent().unwrap()).unwrap();

    let future = serde_json::json!({
        "version": CURRENT_VERSION + 5,
        "revision": 1,
        "repos": [{"root": "/work/api", "files": []}]
    });
    std::fs::write(store.path(), serde_json::to_vec_pretty(&future).unwrap()).unwrap();

    let loaded = store
        .load()
        .expect("an older Seal must still be able to read");
    assert_eq!(
        loaded.repos.len(),
        1,
        "reading must work so the user can be told what is going on"
    );

    let error = store.store(&loaded).unwrap_err();
    assert!(
        matches!(error, StoreError::FromTheFuture { .. }),
        "writing must be refused rather than silently downgrading the file, got {error:?}"
    );
}

#[test]
fn an_update_bumps_the_revision() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_in(&dir);

    let first = store
        .update(3, |state| {
            state.repos.push(repo_with("/work/api", &[".env"]))
        })
        .unwrap();
    assert_eq!(first.revision, 1);

    let second = store
        .update(3, |state| {
            state.repos.push(repo_with("/work/web", &[".env"]))
        })
        .unwrap();
    assert_eq!(second.revision, 2);
    assert_eq!(second.repos.len(), 2);
}

#[test]
fn an_update_refuses_to_overwrite_a_change_made_underneath_it() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_in(&dir);
    store.store(&State::default()).unwrap();

    let interloper = store.clone();
    let mut interfered = false;

    let result = store.update(1, |state| {
        if !interfered {
            interfered = true;
            interloper
                .update(1, |other| {
                    other.repos.push(repo_with("/work/theirs", &[".env"]));
                })
                .expect("the interloping write must land first");
        }
        state.repos.push(repo_with("/work/ours", &[".env"]));
    });

    assert!(
        matches!(result, Err(StoreError::Contended { .. })),
        "a single attempt that finds the registry changed must refuse rather than clobber, got {result:?}"
    );

    let final_state = store.load().unwrap();
    let roots: Vec<String> = final_state
        .repos
        .iter()
        .map(|repo| repo.root.to_string_lossy().into_owned())
        .collect();
    assert_eq!(
        roots,
        vec!["/work/theirs".to_owned()],
        "the other writer's change must survive intact"
    );
}

#[test]
fn a_contended_update_succeeds_when_allowed_to_retry() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_in(&dir);
    store.store(&State::default()).unwrap();

    let interloper = store.clone();
    let mut interfered = false;

    let outcome = store
        .update(5, |state| {
            if !interfered {
                interfered = true;
                interloper
                    .update(1, |other| {
                        other.repos.push(repo_with("/work/theirs", &[".env"]));
                    })
                    .expect("the interloping write must land first");
            }
            state.repos.push(repo_with("/work/ours", &[".env"]));
        })
        .expect("a retry must resolve the contention");

    let roots: Vec<String> = outcome
        .repos
        .iter()
        .map(|repo| repo.root.to_string_lossy().into_owned())
        .collect();
    assert_eq!(
        roots,
        vec!["/work/theirs".to_owned(), "/work/ours".to_owned()],
        "the retry must re-read the other writer's change and add to it rather than replace it"
    );
}

#[test]
fn a_registry_written_before_the_acknowledgement_existed_still_loads() {
    let dir = tempfile::tempdir().unwrap();
    let store = Store::new(dir.path().to_path_buf());

    std::fs::write(
        store.path(),
        r#"{"version":1,"revision":3,"repos":[{"root":"/repos/app","files":[]}]}"#,
    )
    .unwrap();

    let loaded = store.load().unwrap();

    assert_eq!(loaded.revision, 3);
    assert_eq!(loaded.repos.len(), 1);
    assert!(
        !loaded.acknowledged_irreversibility,
        "a registry predating the acknowledgement must default to not acknowledged, \
         so an existing user is asked once rather than silently treated as having agreed"
    );
}
