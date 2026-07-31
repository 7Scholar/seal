use std::collections::BTreeMap;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use age::secrecy::SecretString;
use seal_engine::reseal;
use serde::{Deserialize, Serialize};

use crate::error::{CommandError, Kind};

pub const MANIFEST_FILE: &str = "rekey.json";
pub const ATTEMPTS: u8 = 3;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Standing {
    Pending,
    Converted,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub path: PathBuf,
    pub standing: Standing,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub work_factor: u8,
    pub entries: Vec<Entry>,
    #[serde(flatten, default, skip_serializing_if = "BTreeMap::is_empty")]
    pub unknown: BTreeMap<String, serde_json::Value>,
}

impl Manifest {
    pub fn planned(paths: Vec<PathBuf>, work_factor: u8) -> Self {
        Self {
            work_factor,
            entries: paths
                .into_iter()
                .map(|path| Entry {
                    path,
                    standing: Standing::Pending,
                    reason: None,
                })
                .collect(),
            unknown: BTreeMap::new(),
        }
    }

    pub fn outstanding(&self) -> Vec<PathBuf> {
        self.entries
            .iter()
            .filter(|entry| entry.standing != Standing::Converted)
            .map(|entry| entry.path.clone())
            .collect()
    }

    pub fn is_complete(&self) -> bool {
        self.entries
            .iter()
            .all(|entry| entry.standing == Standing::Converted)
    }

    pub fn counts(&self) -> (usize, usize) {
        let converted = self
            .entries
            .iter()
            .filter(|entry| entry.standing == Standing::Converted)
            .count();
        (converted, self.entries.len())
    }

    fn record(&mut self, report: &reseal::Report) {
        for converted in &report.converted {
            if let Some(entry) = self.entry_mut(&converted.path) {
                entry.standing = Standing::Converted;
                entry.reason = None;
            }
        }
        for unfinished in &report.unfinished {
            if let Some(entry) = self.entry_mut(&unfinished.path) {
                entry.standing = Standing::Failed;
                entry.reason = Some(format!("{:?}", CommandError::kind_of(&unfinished.reason)));
            }
        }
    }

    fn fail(&mut self, path: &Path, kind: Kind) {
        if let Some(entry) = self.entry_mut(path) {
            entry.standing = Standing::Failed;
            entry.reason = Some(format!("{kind:?}"));
        }
    }

    fn entry_mut(&mut self, path: &Path) -> Option<&mut Entry> {
        self.entries.iter_mut().find(|entry| entry.path == path)
    }
}

#[derive(Debug, Clone)]
pub struct Ledger {
    path: PathBuf,
}

impl Ledger {
    pub fn new(directory: &Path) -> Self {
        Self {
            path: directory.join(MANIFEST_FILE),
        }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn read(&self) -> Result<Option<Manifest>, CommandError> {
        match fs::read(&self.path) {
            Ok(bytes) => serde_json::from_slice(&bytes)
                .map(Some)
                .map_err(|_| CommandError::at(Kind::Registry, &self.path)),
            Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
            Err(_) => Err(CommandError::at(Kind::Io, &self.path)),
        }
    }

    pub fn write(&self, manifest: &Manifest) -> Result<(), CommandError> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).map_err(|_| CommandError::at(Kind::Io, parent))?;
        }
        let bytes = serde_json::to_vec_pretty(manifest)
            .map_err(|_| CommandError::at(Kind::Registry, &self.path))?;
        fs::write(&self.path, bytes).map_err(|_| CommandError::at(Kind::Io, &self.path))
    }

    pub fn clear(&self) -> Result<(), CommandError> {
        match fs::remove_file(&self.path) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
            Err(_) => Err(CommandError::at(Kind::Io, &self.path)),
        }
    }
}

pub fn begin(ledger: &Ledger, paths: Vec<PathBuf>, work_factor: u8) -> Result<Manifest, CommandError> {
    if ledger.read()?.is_some() {
        return Err(CommandError::new(Kind::RekeyInFlight));
    }

    let manifest = Manifest::planned(paths, work_factor);
    ledger.write(&manifest)?;
    Ok(manifest)
}

pub fn run(
    ledger: &Ledger,
    from: &SecretString,
    to: &SecretString,
) -> Result<Manifest, CommandError> {
    let mut manifest = ledger.read()?.ok_or(CommandError::new(Kind::NoRekey))?;

    let outstanding = manifest.outstanding();
    if outstanding.is_empty() {
        ledger.clear()?;
        return Ok(manifest);
    }

    let report = match reseal::reseal(&outstanding, from, to, manifest.work_factor, ATTEMPTS) {
        Ok(report) => report,
        Err(reseal::PlanError::Unusable { path, reason }) => {
            manifest.fail(&path, CommandError::kind_of(&reason));
            ledger.write(&manifest)?;
            return Ok(manifest);
        }
        Err(reseal::PlanError::NewPassphraseUnusable) => {
            return Err(CommandError::new(Kind::WrongPassphrase));
        }
        Err(_) => return Err(CommandError::new(Kind::Io)),
    };

    manifest.record(&report);
    ledger.write(&manifest)?;

    if manifest.is_complete() {
        ledger.clear()?;
    }

    Ok(manifest)
}
