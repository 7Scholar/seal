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

fn find<'a>(nodes: &'a [scan::Node], name: &str) -> Option<&'a scan::Node> {
    nodes.iter().find(|node| node.name() == name)
}

fn children<'a>(nodes: &'a [scan::Node], name: &str) -> &'a [scan::Node] {
    match find(nodes, name) {
        Some(scan::Node::Directory { children, .. }) => children,
        other => panic!("{name} is not a walked directory: {other:?}"),
    }
}

#[test]
fn the_tree_carries_files_the_scan_would_never_propose() {
    let dir = realistic_repo();
    let tree = scan::tree(dir.path());

    let src = children(&tree, "src");
    assert!(
        matches!(find(src, "main.rs"), Some(scan::Node::File { candidate: None, .. })),
        "an ordinary source file must appear in the tree, carrying no candidate: {src:?}"
    );
    assert!(
        matches!(find(&tree, "settings.toml"), Some(scan::Node::File { candidate: None, .. })),
        "the tree is the repository, not the candidate list: {tree:?}"
    );
}

#[test]
fn the_tree_annotates_a_candidate_where_it_lives() {
    let dir = realistic_repo();
    let tree = scan::tree(dir.path());

    let api = children(children(&tree, "services"), "api");
    let Some(scan::Node::File { candidate: Some((confidence, _)), relative_path, .. }) =
        find(api, ".env.local")
    else {
        panic!("a nested secret must be annotated in place: {api:?}");
    };
    assert_eq!(*confidence, Confidence::Secret);
    assert_eq!(relative_path, Path::new("services/api/.env.local"));
}

#[test]
fn a_pruned_directory_is_present_but_marked_unwalked_and_childless() {
    let dir = realistic_repo();
    let tree = scan::tree(dir.path());

    for pruned in ["node_modules", "target", ".git"] {
        let Some(scan::Node::Directory { walked, children, .. }) = find(&tree, pruned) else {
            panic!("{pruned} must appear in the tree rather than vanish from it: {tree:?}");
        };
        assert!(!walked, "{pruned} must be marked as not looked in");
        assert!(
            children.is_empty(),
            "{pruned} must carry no children, so nothing invites expanding it"
        );
    }
}

#[test]
fn an_empty_directory_is_distinguishable_from_an_unwalked_one() {
    let dir = realistic_repo();
    fs::create_dir_all(dir.path().join("empty")).unwrap();
    let tree = scan::tree(dir.path());

    let Some(scan::Node::Directory { walked: empty_walked, children: empty, .. }) =
        find(&tree, "empty")
    else {
        panic!("the empty directory must appear");
    };
    let Some(scan::Node::Directory { walked: pruned_walked, .. }) = find(&tree, "node_modules")
    else {
        panic!("the pruned directory must appear");
    };

    assert!(empty.is_empty() && *empty_walked);
    assert!(!*pruned_walked);
    assert_ne!(
        empty_walked, pruned_walked,
        "a consumer must never have to guess which kind of childless directory it holds"
    );
}

#[test]
fn the_tree_surfaces_the_secrets_a_gitignore_respecting_walk_would_hide() {
    let dir = realistic_repo();
    let tree = scan::tree(dir.path());

    for hidden in [".env", ".env.production", ".env.staging"] {
        assert!(
            matches!(find(&tree, hidden), Some(scan::Node::File { candidate: Some(_), .. })),
            "{hidden} is gitignored precisely because it is secret, so the tree must annotate it"
        );
    }
}
