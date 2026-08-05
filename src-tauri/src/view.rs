use std::path::{Path, PathBuf};

use seal_dotenv::{ApplyError, EnvFile, Line, Op, RowId};
use seal_registry::state::SealedState;
use serde::{Deserialize, Serialize};

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
pub struct Observation {
    pub repos: Vec<RepoView>,
    pub still_held: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VariableView {
    pub id: u32,
    pub key: String,
    pub masked: String,
    pub empty: bool,
    pub disabled: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MalformedView {
    pub id: u32,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvView {
    pub path: PathBuf,
    pub variables: Vec<VariableView>,
    pub malformed: Vec<MalformedView>,
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
    pub ok: bool,
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

    let mut variables = Vec::new();
    let mut malformed = Vec::new();

    for row in parsed.rows() {
        match &row.line {
            Line::Entry(entry) => variables.push(VariableView {
                id: row.id.raw(),
                key: entry.key.clone(),
                masked: MASK.to_owned(),
                empty: entry.value.is_empty(),
                disabled: entry.disabled(),
            }),
            Line::Malformed(text) => malformed.push(MalformedView {
                id: row.id.raw(),
                text: text.clone(),
            }),
            _ => {}
        }
    }

    EnvView {
        path: path.to_path_buf(),
        unparseable_lines: malformed.len(),
        variables,
        malformed,
        duplicate_keys: parsed.duplicate_keys(),
    }
}

pub fn value_of(plaintext: &[u8], row: RowId) -> Option<String> {
    let source = String::from_utf8_lossy(plaintext);
    EnvFile::parse(&source)
        .rows()
        .iter()
        .find(|candidate| candidate.id == row)
        .and_then(|candidate| match &candidate.line {
            Line::Entry(entry) => Some(entry.value.clone()),
            _ => None,
        })
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum EditOp {
    SetValue {
        row: u32,
        value: String,
    },
    SetKey {
        row: u32,
        key: String,
    },
    SetDisabled {
        row: u32,
        disabled: bool,
    },
    Insert {
        after: Option<u32>,
        key: String,
        value: String,
        disabled: bool,
    },
    Remove {
        row: u32,
    },
    ReplaceMalformed {
        row: u32,
        text: String,
    },
    Reorder {
        rows: Vec<u32>,
    },
}

impl From<EditOp> for Op {
    fn from(op: EditOp) -> Self {
        match op {
            EditOp::SetValue { row, value } => Op::SetValue {
                row: RowId::new(row),
                value,
            },
            EditOp::SetKey { row, key } => Op::SetKey {
                row: RowId::new(row),
                key,
            },
            EditOp::SetDisabled { row, disabled } => Op::SetDisabled {
                row: RowId::new(row),
                disabled,
            },
            EditOp::Insert {
                after,
                key,
                value,
                disabled,
            } => Op::Insert {
                after: after.map(RowId::new),
                key,
                value,
                disabled,
            },
            EditOp::Remove { row } => Op::Remove {
                row: RowId::new(row),
            },
            EditOp::ReplaceMalformed { row, text } => Op::ReplaceMalformed {
                row: RowId::new(row),
                text,
            },
            EditOp::Reorder { rows } => Op::Reorder {
                rows: rows.into_iter().map(RowId::new).collect(),
            },
        }
    }
}

pub fn apply_ops(plaintext: &[u8], ops: &[Op]) -> Result<Vec<u8>, ApplyError> {
    let source = String::from_utf8_lossy(plaintext);
    let mut parsed = EnvFile::parse(&source);
    parsed.apply(ops)?;
    Ok(parsed.render().into_bytes())
}
