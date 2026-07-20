#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use std::fs;
use std::path::Path;

use seal_registry::scan::{self, Confidence};

fn write(root: &Path, relative: &str, contents: &str) {
    let path = root.join(relative);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, contents).unwrap();
}

fn realistic_repo() -> tempfile::TempDir {
    let dir = tempfile::tempdir().unwrap();
    let root = dir.path();

    write(
        root,
        ".gitignore",
        ".env\n.env.*\n!.env.example\nnode_modules/\n",
    );
    write(root, ".env", "SECRET=local\n");
    write(root, ".env.production", "SECRET=production\n");
    write(root, ".env.staging", "SECRET=staging\n");
    write(root, "services/api/.env.local", "SECRET=api\n");
    write(root, ".env.example", "SECRET=replace-me\n");
    write(root, "src/main.rs", "fn main() {}\n");
    write(root, "settings.toml", "[app]\n");
    write(root, "node_modules/pkg/.env", "SECRET=dependency\n");
    write(root, "target/debug/.env", "SECRET=build-output\n");
    write(root, ".git/config", "[core]\n");

    dir
}

fn names(candidates: &[scan::Candidate]) -> Vec<String> {
    candidates
        .iter()
        .map(|c| c.relative_path.to_string_lossy().into_owned())
        .collect()
}

#[test]
fn finds_the_secrets_a_gitignore_respecting_scan_would_hide() {
    let dir = realistic_repo();
    let found = scan::scan(dir.path());
    let listed = names(&found);

    for expected in [
        ".env",
        ".env.production",
        ".env.staging",
        "services/api/.env.local",
    ] {
        assert!(
            listed.iter().any(|name| name == expected),
            "the scan must find {expected}, which the repo's own gitignore hides \
             precisely because it is secret; found {listed:?}"
        );
    }
}

#[test]
fn the_committed_example_is_recognised_but_never_offered_as_a_secret() {
    let dir = realistic_repo();
    let found = scan::scan(dir.path());

    let example = found
        .iter()
        .find(|c| c.relative_path.to_string_lossy() == ".env.example")
        .expect("the example must be recognised rather than silently dropped");

    assert_eq!(example.confidence, Confidence::Template);
    assert!(
        !example.is_preselected(),
        "a file meant to be committed must never be pre-selected for sealing"
    );
}

#[test]
fn build_output_and_dependencies_are_pruned() {
    let dir = realistic_repo();
    let listed = names(&scan::scan(dir.path()));

    for excluded in ["node_modules/pkg/.env", "target/debug/.env", ".git/config"] {
        assert!(
            !listed.iter().any(|name| name == excluded),
            "{excluded} must be pruned; found {listed:?}"
        );
    }
}

#[test]
fn ordinary_source_files_are_not_proposed() {
    let dir = realistic_repo();
    let listed = names(&scan::scan(dir.path()));

    assert!(!listed.iter().any(|name| name == "src/main.rs"));
    assert!(!listed.iter().any(|name| name == "settings.toml"));
    assert!(!listed.iter().any(|name| name == ".gitignore"));
}

#[test]
fn env_files_are_preselected_and_templates_are_not() {
    let dir = realistic_repo();
    let found = scan::scan(dir.path());

    let secret = found
        .iter()
        .find(|c| c.relative_path.to_string_lossy() == ".env.production")
        .unwrap();
    assert!(secret.is_preselected());
    assert_eq!(secret.confidence, Confidence::Secret);
}

#[test]
fn classifies_the_names_that_matter() {
    let cases = [
        (".env", Some(Confidence::Secret)),
        (".env.production", Some(Confidence::Secret)),
        (".env.local", Some(Confidence::Secret)),
        ("production.env", Some(Confidence::Secret)),
        (".env.example", Some(Confidence::Template)),
        (".env.sample", Some(Confidence::Template)),
        (".env.template", Some(Confidence::Template)),
        (".env.dist", Some(Confidence::Template)),
        (".env.development", Some(Confidence::Ambiguous)),
        (".env.test", Some(Confidence::Ambiguous)),
        (".envrc", Some(Confidence::Ambiguous)),
        ("credentials.json", Some(Confidence::Secret)),
        ("service-account-prod.json", Some(Confidence::Secret)),
        ("server.pem", Some(Confidence::Secret)),
        ("id_rsa", Some(Confidence::Secret)),
        ("id_rsa.pub", None),
        ("id_ed25519.pub", None),
        ("main.rs", None),
        ("README.md", None),
        ("environment.yml", None),
    ];

    for (name, expected) in cases {
        let actual = scan::classify_name(name).map(|(confidence, _)| confidence);
        assert_eq!(
            actual, expected,
            "{name} must classify as {expected:?}, got {actual:?}"
        );
    }
}

#[test]
fn a_public_key_is_never_mistaken_for_a_private_one() {
    assert!(
        scan::classify_name("id_rsa.pub").is_none(),
        "proposing a public key as a secret teaches users the scan cannot be trusted"
    );
}

#[test]
fn an_empty_repository_yields_nothing_rather_than_failing() {
    let dir = tempfile::tempdir().unwrap();
    assert!(scan::scan(dir.path()).is_empty());
}
