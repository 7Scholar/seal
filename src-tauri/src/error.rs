use std::path::PathBuf;

use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Kind {
    Locked,
    WrongPassphrase,
    NotOpen,
    NotManaged,
    AlreadySealed,
    NotSealed,
    Absent,
    Busy,
    Damaged,
    SymlinkTarget,
    UnknownKey,
    NotAnEnvFile,
    Io,
    Registry,
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
#[error("{kind:?}")]
pub struct CommandError {
    pub kind: Kind,
    pub path: Option<PathBuf>,
}

impl CommandError {
    pub fn new(kind: Kind) -> Self {
        Self { kind, path: None }
    }

    pub fn at(kind: Kind, path: impl Into<PathBuf>) -> Self {
        Self {
            kind,
            path: Some(path.into()),
        }
    }
}

impl Serialize for CommandError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("CommandError", 2)?;
        state.serialize_field("kind", &self.kind)?;
        state.serialize_field("path", &self.path)?;
        state.end()
    }
}

impl From<seal_session::SessionError> for CommandError {
    fn from(error: seal_session::SessionError) -> Self {
        match error {
            seal_session::SessionError::Locked | seal_session::SessionError::UnreadableClock => {
                Self::new(Kind::Locked)
            }
            seal_session::SessionError::NotOpen { path } => Self::at(Kind::NotOpen, path),
            _ => Self::new(Kind::Locked),
        }
    }
}

impl From<seal_engine::operations::OperationError> for CommandError {
    fn from(error: seal_engine::operations::OperationError) -> Self {
        use seal_engine::operations::OperationError as Op;
        match error {
            Op::AlreadySealed { path } => Self::at(Kind::AlreadySealed, path),
            Op::NotSealed { path } => Self::at(Kind::NotSealed, path),
            Op::Absent { path } => Self::at(Kind::Absent, path),
            Op::Busy { path } => Self::at(Kind::Busy, path),
            Op::NoMatchingPassphrase { path } => Self::at(Kind::WrongPassphrase, path),
            Op::Damaged { path } => Self::at(Kind::Damaged, path),
            Op::UnacceptableWork { path } => Self::at(Kind::Damaged, path),
            Op::SymlinkTarget { path } => Self::at(Kind::SymlinkTarget, path),
            Op::Io { path, .. } => Self::at(Kind::Io, path),
            _ => Self::new(Kind::Io),
        }
    }
}

impl From<seal_registry::store::StoreError> for CommandError {
    fn from(_: seal_registry::store::StoreError) -> Self {
        Self::new(Kind::Registry)
    }
}

mod payload_safety {
    use super::CommandError;

    trait CarriesNoSecret {}

    impl CarriesNoSecret for super::Kind {}
    impl CarriesNoSecret for std::path::PathBuf {}
    impl<T: CarriesNoSecret> CarriesNoSecret for Option<T> {}

    fn assert_fields_carry_no_secret(error: CommandError) {
        let CommandError { kind, path } = error;
        accept(kind);
        accept(path);
    }

    fn accept<T: CarriesNoSecret>(_: T) {}

    #[allow(dead_code)]
    const ASSERTION: fn(CommandError) = assert_fields_carry_no_secret;
}
