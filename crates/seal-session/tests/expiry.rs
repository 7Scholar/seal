#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use age::secrecy::{ExposeSecret, SecretString};
use seal_session::clock::{Clock, Reading};
use seal_session::{Plaintext, Session, SessionError};

#[derive(Default)]
struct TestClock {
    wall: AtomicU64,
    monotonic: AtomicU64,
    readable: AtomicBool,
}

impl TestClock {
    fn new() -> Arc<Self> {
        let clock = Arc::new(Self::default());
        clock.readable.store(true, Ordering::SeqCst);
        clock.wall.store(1_000_000, Ordering::SeqCst);
        clock.monotonic.store(1_000, Ordering::SeqCst);
        clock
    }

    fn advance_both(&self, seconds: u64) {
        self.wall.fetch_add(seconds, Ordering::SeqCst);
        self.monotonic.fetch_add(seconds, Ordering::SeqCst);
    }

    fn sleep_machine(&self, seconds: u64) {
        self.wall.fetch_add(seconds, Ordering::SeqCst);
    }

    fn advance_monotonic_only(&self, seconds: u64) {
        self.monotonic.fetch_add(seconds, Ordering::SeqCst);
    }

    fn rewind_wall(&self, seconds: u64) {
        self.wall.fetch_sub(seconds, Ordering::SeqCst);
    }

    fn break_clock(&self) {
        self.readable.store(false, Ordering::SeqCst);
    }
}

impl Clock for TestClock {
    fn read(&self) -> Option<Reading> {
        if !self.readable.load(Ordering::SeqCst) {
            return None;
        }
        Some(Reading {
            wall: Duration::from_secs(self.wall.load(Ordering::SeqCst)),
            monotonic: Duration::from_secs(self.monotonic.load(Ordering::SeqCst)),
        })
    }
}

const LIFETIME: Duration = Duration::from_secs(900);

fn session(clock: Arc<TestClock>) -> Session {
    Session::with_clock(clock, LIFETIME)
}

fn unlocked(clock: Arc<TestClock>) -> Session {
    let mut session = session(clock);
    session
        .unlock(SecretString::from("master".to_owned()))
        .unwrap();
    session
}

fn secret_of(session: &mut Session, path: &str) -> String {
    session
        .passphrase_for(Path::new(path))
        .unwrap()
        .expose_secret()
        .to_owned()
}

fn open_a_file(session: &mut Session) {
    session
        .open(
            Path::new("/repo/.env"),
            Plaintext::new(b"SECRET=1".to_vec()),
        )
        .unwrap();
}

#[test]
fn a_freshly_opened_file_is_readable() {
    let clock = TestClock::new();
    let mut session = unlocked(clock.clone());
    open_a_file(&mut session);

    assert_eq!(
        session.plaintext(Path::new("/repo/.env")).unwrap(),
        b"SECRET=1"
    );
}

#[test]
fn a_file_expires_when_the_machine_slept_past_the_deadline() {
    let clock = TestClock::new();
    let mut session = unlocked(clock.clone());
    open_a_file(&mut session);

    clock.sleep_machine(901);

    assert!(
        matches!(
            session.plaintext(Path::new("/repo/.env")),
            Err(SessionError::NotOpen { .. })
        ),
        "a closed lid must expire the plaintext even though the monotonic clock never advanced"
    );
}

#[test]
fn a_file_expires_on_the_monotonic_deadline_alone() {
    let clock = TestClock::new();
    let mut session = unlocked(clock.clone());
    open_a_file(&mut session);

    clock.advance_monotonic_only(901);

    assert!(
        matches!(
            session.plaintext(Path::new("/repo/.env")),
            Err(SessionError::NotOpen { .. })
        ),
        "the monotonic deadline must expire the plaintext even if the wall clock is frozen"
    );
}

#[test]
fn winding_the_wall_clock_backwards_does_not_extend_a_secret() {
    let clock = TestClock::new();
    let mut session = unlocked(clock.clone());
    open_a_file(&mut session);

    clock.advance_both(901);
    clock.rewind_wall(100_000);

    assert!(
        matches!(
            session.plaintext(Path::new("/repo/.env")),
            Err(SessionError::NotOpen { .. })
        ),
        "moving the wall clock backwards must not resurrect an expired secret"
    );
}

#[test]
fn an_unreadable_clock_is_treated_as_expiry() {
    let clock = TestClock::new();
    let mut session = unlocked(clock.clone());
    open_a_file(&mut session);

    clock.break_clock();

    assert!(
        matches!(
            session.plaintext(Path::new("/repo/.env")),
            Err(SessionError::UnreadableClock)
        ),
        "a clock that cannot be read must fail closed, never hand out the secret"
    );
}

#[test]
fn reading_a_file_before_its_deadline_refreshes_it() {
    let clock = TestClock::new();
    let mut session = unlocked(clock.clone());
    open_a_file(&mut session);

    for _ in 0..5 {
        clock.advance_both(800);
        assert!(
            session.plaintext(Path::new("/repo/.env")).is_ok(),
            "active use must keep a file open rather than expiring it mid-edit"
        );
    }

    clock.advance_both(901);
    assert!(
        session.plaintext(Path::new("/repo/.env")).is_err(),
        "once use stops, the file must still expire"
    );
}

#[test]
fn expiry_is_decided_on_access_without_any_sweep_running() {
    let clock = TestClock::new();
    let mut session = unlocked(clock.clone());
    open_a_file(&mut session);

    clock.sleep_machine(901);

    assert!(
        session.plaintext(Path::new("/repo/.env")).is_err(),
        "the read path alone must enforce the deadline, with no timer or sweep involved"
    );
}

#[test]
fn the_sweep_drops_expired_files_so_the_display_stays_honest() {
    let clock = TestClock::new();
    let mut session = unlocked(clock.clone());
    open_a_file(&mut session);
    session
        .open(Path::new("/repo/b.env"), Plaintext::new(b"B=2".to_vec()))
        .unwrap();

    assert_eq!(session.open_paths().len(), 2);

    clock.sleep_machine(901);
    session.sweep();

    assert!(
        session.open_paths().is_empty(),
        "the sweep must clear expired files from what the interface would display"
    );
}

#[test]
fn the_session_survives_a_files_expiry() {
    let clock = TestClock::new();
    let mut session = unlocked(clock.clone());
    open_a_file(&mut session);

    clock.sleep_machine(901);

    assert!(session.plaintext(Path::new("/repo/.env")).is_err());
    assert!(
        session.is_unlocked(),
        "a file expiring must not end the session, which ends on seal or quit"
    );
}

#[test]
fn wiping_locks_the_session_and_drops_every_open_file() {
    let clock = TestClock::new();
    let mut session = unlocked(clock.clone());
    open_a_file(&mut session);

    session.wipe();

    assert!(!session.is_unlocked(), "the session must be locked");
    assert!(session.open_paths().is_empty());
    assert!(matches!(session.passphrase(), Err(SessionError::Locked)));
    assert!(matches!(
        session.plaintext(Path::new("/repo/.env")),
        Err(SessionError::Locked)
    ));
}

#[test]
fn a_locked_session_refuses_everything() {
    let clock = TestClock::new();
    let mut session = session(clock);

    assert!(matches!(session.passphrase(), Err(SessionError::Locked)));
    assert!(matches!(
        session.plaintext(Path::new("/repo/.env")),
        Err(SessionError::Locked)
    ));
    assert!(matches!(
        session.open(Path::new("/repo/.env"), Plaintext::new(vec![1])),
        Err(SessionError::Locked)
    ));
}

#[test]
fn a_per_file_override_is_used_in_place_of_the_master_password() {
    let clock = TestClock::new();
    let mut session = unlocked(clock);

    session
        .set_repo_override(
            Path::new("/repo/legacy.env"),
            SecretString::from("older".to_owned()),
        )
        .unwrap();

    assert_eq!(secret_of(&mut session, "/repo/legacy.env"), "older");
    assert_eq!(
        secret_of(&mut session, "/repo/.env"),
        "master",
        "a file without an override falls back to the master password"
    );
}

#[test]
fn unlocking_again_discards_everything_held_under_the_previous_unlock() {
    let clock = TestClock::new();
    let mut session = unlocked(clock);
    open_a_file(&mut session);
    session
        .set_repo_override(
            Path::new("/repo/legacy.env"),
            SecretString::from("older".to_owned()),
        )
        .unwrap();

    session
        .unlock(SecretString::from("rotated".to_owned()))
        .unwrap();

    assert!(
        session.open_paths().is_empty(),
        "a new unlock must not inherit plaintext held under the old password"
    );
    assert_eq!(
        secret_of(&mut session, "/repo/legacy.env"),
        "rotated",
        "overrides from the previous session must not survive"
    );
}

#[test]
fn closing_a_file_drops_it_but_leaves_the_session() {
    let clock = TestClock::new();
    let mut session = unlocked(clock);
    open_a_file(&mut session);

    session.close(Path::new("/repo/.env")).unwrap();

    assert!(session.plaintext(Path::new("/repo/.env")).is_err());
    assert!(session.is_unlocked());
}

#[test]
fn an_unreadable_clock_locks_the_whole_session() {
    let clock = TestClock::new();
    let mut session = unlocked(clock.clone());
    open_a_file(&mut session);

    clock.break_clock();

    assert!(
        !session.is_unlocked(),
        "if time cannot be established the session must fail closed rather than stay open"
    );
    assert!(session.open_paths().is_empty());
}

#[test]
fn wiping_plaintext_clears_the_bytes_it_held() {
    let mut plaintext = Plaintext::new(b"SUPER_SECRET_VALUE".to_vec());
    assert_eq!(plaintext.as_bytes(), b"SUPER_SECRET_VALUE");

    plaintext.wipe();

    assert!(
        plaintext.as_bytes().is_empty(),
        "wiping must leave nothing readable behind, found {:?}",
        plaintext.as_bytes()
    );
}

#[test]
fn a_repo_override_applies_to_every_file_beneath_it() {
    let clock = TestClock::new();
    let mut session = unlocked(clock);

    session
        .set_repo_override(
            Path::new("/repos/legacy"),
            SecretString::from("older".to_owned()),
        )
        .unwrap();

    assert_eq!(
        secret_of(&mut session, "/repos/legacy/.env.production"),
        "older",
        "an override is set on a repo, so it must reach the files inside that repo"
    );
    assert_eq!(
        secret_of(&mut session, "/repos/legacy/services/api/.env"),
        "older",
        "a file nested at any depth is still inside the repo"
    );
    assert_eq!(
        secret_of(&mut session, "/repos/other/.env"),
        "master",
        "a repo without an override falls back to the master password"
    );
}

#[test]
fn the_most_specific_override_wins_for_a_nested_repo() {
    let clock = TestClock::new();
    let mut session = unlocked(clock);

    session
        .set_repo_override(Path::new("/repos"), SecretString::from("outer".to_owned()))
        .unwrap();
    session
        .set_repo_override(
            Path::new("/repos/inner"),
            SecretString::from("inner".to_owned()),
        )
        .unwrap();

    assert_eq!(
        secret_of(&mut session, "/repos/inner/.env"),
        "inner",
        "the nearest enclosing override must win, never an ancestor's"
    );
    assert_eq!(secret_of(&mut session, "/repos/elsewhere/.env"), "outer");
}

#[test]
fn a_sibling_path_sharing_a_name_prefix_is_not_covered() {
    let clock = TestClock::new();
    let mut session = unlocked(clock);

    session
        .set_repo_override(
            Path::new("/repos/app"),
            SecretString::from("app".to_owned()),
        )
        .unwrap();

    assert_eq!(
        secret_of(&mut session, "/repos/app-staging/.env"),
        "master",
        "a prefix match on the path string must not leak an override into a sibling repo"
    );
}

#[test]
fn clearing_a_repo_override_returns_it_to_the_master_password() {
    let clock = TestClock::new();
    let mut session = unlocked(clock);

    session
        .set_repo_override(
            Path::new("/repos/legacy"),
            SecretString::from("older".to_owned()),
        )
        .unwrap();
    session
        .clear_repo_override(Path::new("/repos/legacy"))
        .unwrap();

    assert_eq!(secret_of(&mut session, "/repos/legacy/.env"), "master");
}
