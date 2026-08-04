#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use std::path::Path;

use seal_engine::lock::{lock_path_for, FileLock, LockError};

fn target_named(dir: &Path, name: &str) -> std::path::PathBuf {
    let path = dir.join(name);
    std::fs::write(&path, b"value\n").unwrap();
    path
}

#[test]
fn a_second_acquisition_is_refused_while_the_first_is_held() {
    let dir = tempfile::tempdir().unwrap();
    let target = target_named(dir.path(), "second-acquisition.conf");

    let held = FileLock::acquire(&target).expect("the first acquisition must succeed");

    let error = FileLock::acquire(&target).expect_err("the second must be refused");
    assert!(
        matches!(error, LockError::Busy { .. }),
        "a held lock must report the file as busy, got {error:?}"
    );

    drop(held);
}

#[test]
fn the_lock_is_released_when_dropped() {
    let dir = tempfile::tempdir().unwrap();
    let target = target_named(dir.path(), "released-on-drop.conf");

    let held = FileLock::acquire(&target).unwrap();
    drop(held);

    FileLock::acquire(&target).expect("a released lock must be acquirable again");
}

#[test]
fn the_lock_file_survives_release_so_exclusion_cannot_be_broken() {
    let dir = tempfile::tempdir().unwrap();
    let target = target_named(dir.path(), "survives-release.conf");
    let lock_path = lock_path_for(&target);

    let held = FileLock::acquire(&target).unwrap();
    assert!(lock_path.exists(), "acquiring must create the lock file");
    drop(held);

    assert!(
        lock_path.exists(),
        "the lock file must NOT be removed on release: unlinking it while another process \
         holds the lock lets that process lock a fresh inode, so two writers proceed at once"
    );
}

#[test]
fn the_lock_sits_beside_its_target_as_a_hidden_file() {
    let dir = tempfile::tempdir().unwrap();
    let target = target_named(dir.path(), "beside-its-target.conf");
    let lock_path = lock_path_for(&target);

    assert_eq!(
        lock_path.parent(),
        target.parent(),
        "the lock must be a sibling of the file it guards"
    );
    let name = lock_path
        .file_name()
        .unwrap()
        .to_string_lossy()
        .into_owned();
    assert!(
        name.starts_with('.'),
        "the lock must be hidden so it does not clutter a repository, got {name}"
    );
    assert!(name.contains("beside-its-target.conf"), "got {name}");
}

#[test]
fn different_targets_do_not_block_each_other() {
    let dir = tempfile::tempdir().unwrap();
    let first = dir.path().join("first.conf");
    let second = dir.path().join("second.conf");
    std::fs::write(&first, b"a\n").unwrap();
    std::fs::write(&second, b"b\n").unwrap();

    let _held = FileLock::acquire(&first).unwrap();
    FileLock::acquire(&second).expect("an unrelated file must not be blocked");
}

#[test]
fn a_target_that_does_not_exist_can_still_be_locked() {
    let dir = tempfile::tempdir().unwrap();
    let absent = dir.path().join("not-yet-here.conf");

    FileLock::acquire(&absent)
        .expect("locking must not require the target to exist, since sealing may create it");
}

#[test]
fn the_lock_excludes_a_separate_process() {
    let dir = tempfile::tempdir().unwrap();
    let target = target_named(dir.path(), "excludes-a-process.conf");
    let lock_path = lock_path_for(&target);

    let held = FileLock::acquire(&target).unwrap();

    let script = format!(
        r#"
import fcntl, sys
f = open({path:?}, "a+")
try:
    fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    print("acquired")
except BlockingIOError:
    print("blocked")
"#,
        path = lock_path.to_string_lossy()
    );

    let while_held = match std::process::Command::new("python3")
        .arg("-c")
        .arg(&script)
        .output()
    {
        Ok(output) => output,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            eprintln!("skipped: python3 is needed to drive a second process");
            return;
        }
        Err(err) => panic!("could not start the second process: {err}"),
    };
    assert_eq!(
        String::from_utf8_lossy(&while_held.stdout).trim(),
        "blocked",
        "a separate process must not acquire a lock this process holds"
    );

    drop(held);

    let after_release = std::process::Command::new("python3")
        .arg("-c")
        .arg(&script)
        .output()
        .unwrap();
    assert_eq!(
        String::from_utf8_lossy(&after_release.stdout).trim(),
        "acquired",
        "a separate process must acquire the lock once it is released"
    );
}
