use std::path::{Path, PathBuf};

use seal_dotenv::EnvFile;
use seal_registry::state::SealedState;
use serde::Serialize;

pub const MASK: &str = "••••••••";

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileView {
    pub relative_path: PathBuf,
    pub state: SealedState,
    pub alert: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoView {
    pub root: PathBuf,
    pub name: String,
    pub files: Vec<FileView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VariableView {
    pub key: String,
    pub masked: String,
    pub empty: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvView {
    pub path: PathBuf,
    pub variables: Vec<VariableView>,
    pub duplicate_keys: Vec<String>,
    pub unparseable_lines: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum OpenedFile {
    Env(EnvView),
    Opaque { path: PathBuf, bytes: usize },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SealOutcome {
    pub path: PathBuf,
    pub sealed: bool,
    pub reason: Option<crate::error::Kind>,
}

pub fn is_editable(path: &Path) -> bool {
    path.file_name()
        .map(|name| seal_registry::scan::is_editable_env_file(&name.to_string_lossy()))
        .unwrap_or(false)
}

pub fn repo_name(root: &Path) -> String {
    root.file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| root.to_string_lossy().into_owned())
}

pub fn env_view(path: &Path, plaintext: &[u8]) -> EnvView {
    let source = String::from_utf8_lossy(plaintext);
    let parsed = EnvFile::parse(&source);

    let variables = parsed
        .entries()
        .map(|entry| VariableView {
            key: entry.key.clone(),
            masked: MASK.to_owned(),
            empty: entry.value.is_empty(),
        })
        .collect();

    let unparseable_lines = parsed
        .lines()
        .iter()
        .filter(|line| matches!(line, seal_dotenv::Line::Unparseable(_)))
        .count();

    EnvView {
        path: path.to_path_buf(),
        variables,
        duplicate_keys: parsed.duplicate_keys(),
        unparseable_lines,
    }
}

pub fn value_of(plaintext: &[u8], key: &str) -> Option<String> {
    let source = String::from_utf8_lossy(plaintext);
    EnvFile::parse(&source)
        .entries()
        .find(|entry| entry.key == key)
        .map(|entry| entry.value.clone())
}

pub fn apply_edits(plaintext: &[u8], edits: &[(String, String)]) -> Option<Vec<u8>> {
    let source = String::from_utf8_lossy(plaintext);
    let mut parsed = EnvFile::parse(&source);

    for (key, value) in edits {
        parsed.entry_mut(key)?.set_value(value.clone());
    }

    Some(parsed.render().into_bytes())
}
