use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

pub const CURRENT_VERSION: u32 = 1;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SealedState {
    Sealed,
    Plaintext,
    Missing,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Fingerprint {
    pub device: u64,
    pub inode: u64,
    pub size: u64,
    pub modified_secs: i64,
    pub modified_nanos: i64,
}

impl From<seal_engine::replace::Identity> for Fingerprint {
    fn from(identity: seal_engine::replace::Identity) -> Self {
        Self {
            device: identity.device,
            inode: identity.inode,
            size: identity.size,
            modified_secs: identity.modified_secs,
            modified_nanos: identity.modified_nanos,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ManagedFile {
    pub relative_path: PathBuf,
    #[serde(default = "unknown_state")]
    pub last_known: SealedState,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fingerprint: Option<Fingerprint>,
    #[serde(flatten, default, skip_serializing_if = "BTreeMap::is_empty")]
    pub unknown: BTreeMap<String, serde_json::Value>,
}

fn unknown_state() -> SealedState {
    SealedState::Unknown
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Repo {
    pub root: PathBuf,
    #[serde(default)]
    pub uses_override_passphrase: bool,
    #[serde(default)]
    pub files: Vec<ManagedFile>,
    #[serde(flatten, default, skip_serializing_if = "BTreeMap::is_empty")]
    pub unknown: BTreeMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct State {
    pub version: u32,
    #[serde(default)]
    pub revision: u64,
    #[serde(default)]
    pub repos: Vec<Repo>,
    #[serde(flatten, default, skip_serializing_if = "BTreeMap::is_empty")]
    pub unknown: BTreeMap<String, serde_json::Value>,
}

impl Default for State {
    fn default() -> Self {
        Self {
            version: CURRENT_VERSION,
            revision: 0,
            repos: Vec::new(),
            unknown: BTreeMap::new(),
        }
    }
}

impl State {
    pub fn repo(&self, root: &Path) -> Option<&Repo> {
        self.repos.iter().find(|repo| repo.root == root)
    }

    pub fn repo_mut(&mut self, root: &Path) -> Option<&mut Repo> {
        self.repos.iter_mut().find(|repo| repo.root == root)
    }

    pub fn managed_paths(&self) -> Vec<PathBuf> {
        self.repos
            .iter()
            .flat_map(|repo| {
                repo.files
                    .iter()
                    .map(|file| repo.root.join(&file.relative_path))
            })
            .collect()
    }
}

impl Repo {
    pub fn new(root: PathBuf) -> Self {
        Self {
            root,
            uses_override_passphrase: false,
            files: Vec::new(),
            unknown: BTreeMap::new(),
        }
    }

    pub fn file(&self, relative_path: &Path) -> Option<&ManagedFile> {
        self.files
            .iter()
            .find(|file| file.relative_path == relative_path)
    }
}

impl ManagedFile {
    pub fn new(relative_path: PathBuf) -> Self {
        Self {
            relative_path,
            last_known: SealedState::Unknown,
            fingerprint: None,
            unknown: BTreeMap::new(),
        }
    }
}
