use std::path::{Path, PathBuf};

use ignore::WalkBuilder;

const PRUNED_DIRECTORIES: &[&str] = &[
    ".git",
    "node_modules",
    "target",
    "dist",
    "build",
    "vendor",
    ".venv",
    "venv",
    "__pycache__",
    ".next",
    ".nuxt",
    ".svelte-kit",
];

const TEMPLATE_SUFFIXES: &[&str] = &[
    ".example",
    ".sample",
    ".template",
    ".dist",
    ".defaults",
    ".tpl",
];

const CREDENTIAL_NAMES: &[&str] = &[
    "credentials.json",
    "master.key",
    ".npmrc",
    ".netrc",
    ".pypirc",
    ".htpasswd",
    "kubeconfig",
    "terraform.tfvars",
];

const CREDENTIAL_EXTENSIONS: &[&str] = &["pem", "key", "p12", "pfx", "tfstate"];

const AMBIGUOUS_ENV_NAMES: &[&str] = &[".env.development", ".env.test", ".envrc"];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum Confidence {
    Secret,
    Ambiguous,
    Template,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Candidate {
    pub relative_path: PathBuf,
    pub confidence: Confidence,
    pub reason: &'static str,
}

impl Candidate {
    pub fn is_preselected(&self) -> bool {
        self.confidence == Confidence::Secret
    }
}

pub fn scan(root: &Path) -> Vec<Candidate> {
    let mut candidates = Vec::new();

    let walker = WalkBuilder::new(root)
        .standard_filters(false)
        .hidden(false)
        .parents(false)
        .filter_entry(|entry| {
            if entry.file_type().is_some_and(|kind| kind.is_dir()) {
                let name = entry.file_name().to_string_lossy();
                return !PRUNED_DIRECTORIES.contains(&name.as_ref());
            }
            true
        })
        .build();

    for entry in walker.flatten() {
        if !entry.file_type().is_some_and(|kind| kind.is_file()) {
            continue;
        }

        let Ok(relative) = entry.path().strip_prefix(root) else {
            continue;
        };
        let name = entry.file_name().to_string_lossy().into_owned();

        if let Some((confidence, reason)) = classify_name(&name) {
            candidates.push(Candidate {
                relative_path: relative.to_path_buf(),
                confidence,
                reason,
            });
        }
    }

    candidates.sort_by(|a, b| a.relative_path.cmp(&b.relative_path));
    candidates
}

pub fn classify_name(name: &str) -> Option<(Confidence, &'static str)> {
    let lower = name.to_ascii_lowercase();

    if is_env_like(&lower) {
        if TEMPLATE_SUFFIXES
            .iter()
            .any(|suffix| lower.ends_with(suffix))
            || lower.contains(".example.")
            || lower.contains(".sample.")
        {
            return Some((
                Confidence::Template,
                "conventionally committed as an example rather than holding real values",
            ));
        }

        if AMBIGUOUS_ENV_NAMES.contains(&lower.as_str()) {
            return Some((
                Confidence::Ambiguous,
                "some projects commit this and some do not",
            ));
        }

        return Some((Confidence::Secret, "an environment file"));
    }

    if CREDENTIAL_NAMES.contains(&lower.as_str()) {
        return Some((Confidence::Secret, "a well-known credential file"));
    }

    if lower.starts_with("id_rsa") || lower.starts_with("id_ed25519") {
        if lower.ends_with(".pub") {
            return None;
        }
        return Some((Confidence::Secret, "a private key"));
    }

    if lower.starts_with("service-account") && lower.ends_with(".json") {
        return Some((Confidence::Secret, "a service account key"));
    }

    let extension = Path::new(&lower)
        .extension()
        .map(|ext| ext.to_string_lossy().into_owned());
    if let Some(extension) = extension {
        if CREDENTIAL_EXTENSIONS.contains(&extension.as_str()) {
            return Some((Confidence::Secret, "a key or credential file"));
        }
    }

    None
}

fn is_env_like(lower: &str) -> bool {
    lower == ".env" || lower.starts_with(".env.") || lower.ends_with(".env") || lower == ".envrc"
}

pub fn is_editable_env_file(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower != ".envrc" && is_env_like(&lower)
}
