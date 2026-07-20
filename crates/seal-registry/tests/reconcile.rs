#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use std::fs;
use std::path::PathBuf;

use age::secrecy::SecretString;
use seal_engine::format::MINIMUM_WORK_FACTOR;
use seal_engine::operations;
use seal_registry::reconcile::{self, Divergence};
use seal_registry::state::{Fingerprint, ManagedFile, Repo, SealedState, State};

const CONTENT: &[u8] = b"DATABASE_URL=postgres://user:secret@host/db\n";

fn pass(text: &str) -> SecretString {
    SecretString::from(text.to_owned())
}

struct Fixture {
    _dir: tempfile::TempDir,
    root: PathBuf,
    state: State,
}

impl Fixture {
    fn with_sealed_file(name: &str) -> Self {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().to_path_buf();
        let path = root.join(name);
        fs::write(&path, CONTENT).unwrap();

        let outcome = operations::seal(&path, &pass("pw"), MINIMUM_WORK_FACTOR).unwrap();

        let mut file = ManagedFile::new(PathBuf::from(name));
        file.last_known = SealedState::Sealed;
        file.fingerprint = Some(Fingerprint::from(outcome.identity));

        let mut repo = Repo::new(root.clone());
        repo.files.push(file);

        let mut state = State::default();
        state.repos.push(repo);

        Self {
            _dir: dir,
            root,
            state,
        }
    }

    fn path(&self, name: &str) -> PathBuf {
        self.root.join(name)
    }
}

#[test]
fn a_registry_matching_disk_reports_nothing() {
    let fixture = Fixture::with_sealed_file(".env.production");
    let result = reconcile::reconcile(&fixture.state);

    assert!(
        result.is_in_sync(),
        "unexpected findings: {:?}",
        result.findings
    );
    assert_eq!(result.checked, 1);
}

#[test]
fn a_sealed_file_overwritten_with_plaintext_is_reported_as_alarming() {
    let fixture = Fixture::with_sealed_file(".env.production");

    let path = fixture.path(".env.production");
    let temp = fixture.path(".env.production.editor-tmp");
    fs::write(&temp, b"DATABASE_URL=clobbered-by-an-editor\n").unwrap();
    fs::rename(&temp, &path).unwrap();

    let result = reconcile::reconcile(&fixture.state);

    assert_eq!(result.findings.len(), 1);
    let finding = &result.findings[0];
    assert_eq!(finding.recorded, SealedState::Sealed);
    assert_eq!(finding.observed, SealedState::Plaintext);
    assert!(
        finding.demands_attention(),
        "a secret sitting in the clear must demand attention, not be quietly recorded"
    );
    assert!(
        matches!(
            finding.divergence,
            Divergence::BecamePlaintext {
                fingerprint_changed: true
            }
        ),
        "the identity change must be detected, since that is the signature of an external \
         replacement rather than an in-place edit; got {:?}",
        finding.divergence
    );
    assert_eq!(result.alarming().count(), 1);
}

#[test]
fn a_missing_file_is_reported_without_alarm() {
    let fixture = Fixture::with_sealed_file(".env.production");
    fs::remove_file(fixture.path(".env.production")).unwrap();

    let result = reconcile::reconcile(&fixture.state);

    assert_eq!(result.findings.len(), 1);
    assert_eq!(result.findings[0].divergence, Divergence::Missing);
    assert!(
        !result.findings[0].demands_attention(),
        "a deleted file is not a leaked secret"
    );
}

#[test]
fn a_file_sealed_outside_seal_is_recognised() {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path().to_path_buf();
    let path = root.join(".env.production");
    fs::write(&path, CONTENT).unwrap();

    let mut file = ManagedFile::new(PathBuf::from(".env.production"));
    file.last_known = SealedState::Plaintext;
    let mut repo = Repo::new(root.clone());
    repo.files.push(file);
    let mut state = State::default();
    state.repos.push(repo);

    operations::seal(&path, &pass("pw"), MINIMUM_WORK_FACTOR).unwrap();

    let result = reconcile::reconcile(&state);
    assert_eq!(result.findings.len(), 1);
    assert_eq!(result.findings[0].divergence, Divergence::BecameSealed);
    assert!(!result.findings[0].demands_attention());
}

#[test]
fn applying_a_reconciliation_records_benign_changes_but_never_the_alarming_one() {
    let fixture = Fixture::with_sealed_file(".env.production");
    let mut state = fixture.state.clone();

    fs::remove_file(fixture.path(".env.production")).unwrap();
    let result = reconcile::reconcile(&state);
    reconcile::apply(&mut state, &result);

    assert_eq!(
        state.repos[0].files[0].last_known,
        SealedState::Missing,
        "a benign divergence may be absorbed into the record"
    );

    let clobbered = Fixture::with_sealed_file(".env.staging");
    let mut clobbered_state = clobbered.state.clone();
    fs::write(clobbered.path(".env.staging"), b"KEY=exposed\n").unwrap();

    let result = reconcile::reconcile(&clobbered_state);
    reconcile::apply(&mut clobbered_state, &result);

    assert_eq!(
        clobbered_state.repos[0].files[0].last_known,
        SealedState::Sealed,
        "an exposed secret must stay flagged as a divergence rather than being recorded away"
    );
}

#[test]
fn reconciliation_covers_every_managed_file_across_repos() {
    let first = Fixture::with_sealed_file(".env.a");
    let second = Fixture::with_sealed_file(".env.b");

    let mut state = State::default();
    state.repos.push(first.state.repos[0].clone());
    state.repos.push(second.state.repos[0].clone());

    let result = reconcile::reconcile(&state);
    assert_eq!(result.checked, 2);
    assert!(result.is_in_sync());
}
