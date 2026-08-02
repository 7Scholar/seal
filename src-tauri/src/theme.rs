use std::fs;
use std::path::{Path, PathBuf};

pub const FILE_NAME: &str = "theme";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    System,
    Light,
    Dark,
}

impl Mode {
    pub fn as_str(self) -> &'static str {
        match self {
            Mode::System => "system",
            Mode::Light => "light",
            Mode::Dark => "dark",
        }
    }

    pub fn parse(value: &str) -> Mode {
        match value.trim() {
            "light" => Mode::Light,
            "dark" => Mode::Dark,
            _ => Mode::System,
        }
    }
}

pub fn path(directory: &Path) -> PathBuf {
    directory.join(FILE_NAME)
}

pub fn read(directory: &Path) -> Mode {
    fs::read_to_string(path(directory))
        .map(|value| Mode::parse(&value))
        .unwrap_or(Mode::System)
}

pub fn write(directory: &Path, mode: Mode) -> std::io::Result<()> {
    fs::create_dir_all(directory)?;
    fs::write(path(directory), mode.as_str())
}
