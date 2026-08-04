use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

use seal_engine::operations;
use seal_registry::scan;
use seal_registry::state::{ManagedFile, Repo, SealedState, State};
use serde::{Deserialize, Serialize};

use crate::error::{CommandError, Kind};

pub const RECENTLY_MODIFIED: Duration = Duration::from_secs(120);

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CandidateView {
    pub relative_path: PathBuf,
    pub confidence: String,
    pub reason: Option<&'static str>,
    pub preselected: bool,
    pub already_managed: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "kind")]
pub enum NodeView {
    #[serde(rename = "directory", rename_all = "camelCase")]
    Directory {
        name: String,
        relative_path: PathBuf,
        walked: bool,
        children: Vec<NodeView>,
    },
    #[serde(rename = "file", rename_all = "camelCase")]
    File {
        name: String,
        relative_path: PathBuf,
        confidence: Option<String>,
        reason: Option<&'static str>,
        preselected: bool,
        already_managed: bool,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanView {
    pub root: PathBuf,
    pub already_registered: bool,
    pub candidates: Vec<CandidateView>,
    pub tree: Vec<NodeView>,
}

fn to_view(node: scan::Node, managed: &[&PathBuf]) -> NodeView {
    match node {
        scan::Node::Directory {
            name,
            relative_path,
            walked,
            children,
        } => NodeView::Directory {
            name,
            relative_path,
            walked,
            children: children
                .into_iter()
                .map(|child| to_view(child, managed))
                .collect(),
        },
        scan::Node::File {
            name,
            relative_path,
            candidate,
        } => NodeView::File {
            already_managed: managed.contains(&&relative_path),
            preselected: candidate
                .is_some_and(|(confidence, _)| confidence == scan::Confidence::Secret),
            confidence: candidate.map(|(confidence, _)| format!("{confidence:?}").to_lowercase()),
            reason: candidate.and_then(|(_, reason)| reason),
            name,
            relative_path,
        },
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Release {
    RestorePlaintext,
    LeaveSealed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SealWarning {
    pub path: PathBuf,
    pub modified_seconds_ago: u64,
}

pub fn scan_folder(root: &Path, state: &State) -> Result<ScanView, CommandError> {
    if !root.is_dir() {
        return Err(CommandError::at(Kind::Absent, root));
    }

    let existing = state.repo(root);
    let managed: Vec<&PathBuf> = existing
        .map(|repo| repo.files.iter().map(|file| &file.relative_path).collect())
        .unwrap_or_default();

    let candidates = scan::scan(root)
        .into_iter()
        .map(|candidate| CandidateView {
            preselected: candidate.is_preselected(),
            already_managed: managed.contains(&&candidate.relative_path),
            confidence: format!("{:?}", candidate.confidence).to_lowercase(),
            reason: candidate.reason,
            relative_path: candidate.relative_path,
        })
        .collect();

    let tree = scan::tree(root)
        .into_iter()
        .map(|node| to_view(node, &managed))
        .collect();

    Ok(ScanView {
        root: root.to_path_buf(),
        already_registered: existing.is_some(),
        candidates,
        tree,
    })
}

pub fn manage(state: &mut State, root: &Path, selected: &[PathBuf]) -> Result<usize, CommandError> {
    if !root.is_dir() {
        return Err(CommandError::at(Kind::Absent, root));
    }

    let mut added = 0;
    let repo = match state.repo_mut(root) {
        Some(repo) => repo,
        None => {
            state.repos.push(Repo {
                root: root.to_path_buf(),
                uses_override_passphrase: false,
                files: Vec::new(),
                unknown: Default::default(),
            });
            state
                .repo_mut(root)
                .ok_or_else(|| CommandError::at(Kind::Registry, root))?
        }
    };

    for relative in selected {
        if relative.is_absolute() || relative.components().any(|c| c.as_os_str() == "..") {
            return Err(CommandError::at(Kind::NotManaged, relative));
        }
        if repo.files.iter().any(|f| &f.relative_path == relative) {
            continue;
        }
        let observed = observe(&root.join(relative));
        repo.files.push(ManagedFile {
            relative_path: relative.clone(),
            last_known: observed,
            fingerprint: None,
            unknown: Default::default(),
        });
        added += 1;
    }

    Ok(added)
}

pub fn release(
    state: &mut State,
    path: &Path,
    how: Release,
    passphrase: &age::secrecy::SecretString,
) -> Result<(), CommandError> {
    let (root, relative) = locate(state, path)?;

    if how == Release::RestorePlaintext {
        if let Ok(seal_engine::format::Classification::Sealed { .. }) = operations::classify(path) {
            operations::release_to_plaintext(path, std::slice::from_ref(passphrase))?;
        }
    }

    if let Some(repo) = state.repo_mut(&root) {
        repo.files.retain(|file| file.relative_path != relative);
        if repo.files.is_empty() {
            state.repos.retain(|repo| repo.root != root);
        }
    }

    Ok(())
}

pub fn seal_warning(path: &Path) -> Option<SealWarning> {
    let modified = std::fs::metadata(path)
        .and_then(|meta| meta.modified())
        .ok()?;
    let elapsed = SystemTime::now().duration_since(modified).ok()?;

    (elapsed < RECENTLY_MODIFIED).then(|| SealWarning {
        path: path.to_path_buf(),
        modified_seconds_ago: elapsed.as_secs(),
    })
}

pub fn require_acknowledgement(state: &State) -> Result<(), CommandError> {
    if state.acknowledged_irreversibility {
        Ok(())
    } else {
        Err(CommandError::new(Kind::NotAcknowledged))
    }
}

pub fn acknowledge(state: &mut State) {
    state.acknowledged_irreversibility = true;
}

fn locate(state: &State, path: &Path) -> Result<(PathBuf, PathBuf), CommandError> {
    state
        .repos
        .iter()
        .find_map(|repo| {
            repo.files
                .iter()
                .find(|file| repo.root.join(&file.relative_path) == path)
                .map(|file| (repo.root.clone(), file.relative_path.clone()))
        })
        .ok_or_else(|| CommandError::at(Kind::NotManaged, path))
}

fn observe(path: &Path) -> SealedState {
    match operations::classify(path) {
        Ok(seal_engine::format::Classification::Sealed { .. }) => SealedState::Sealed,
        Ok(_) => SealedState::Plaintext,
        Err(_) => SealedState::Missing,
    }
}
