use std::path::PathBuf;
use std::process::{Command, Stdio};

pub enum Launch {
    Started,
    NotFound,
    Failed(String),
}

pub fn open() -> Launch {
    match locate() {
        Some(target) => spawn(target),
        None => Launch::NotFound,
    }
}

enum Target {
    Bundle(PathBuf),
    Binary(PathBuf),
    #[cfg(target_os = "macos")]
    Registered(&'static str),
}

fn locate() -> Option<Target> {
    let beside = beside_this_binary();
    if beside.is_some() || installed_search_is_disabled() {
        return beside;
    }

    registered().or_else(conventional)
}

fn installed_search_is_disabled() -> bool {
    std::env::var_os("SEAL_IGNORE_INSTALLED_APP").is_some()
}

fn beside_this_binary() -> Option<Target> {
    let exe = std::env::current_exe().ok()?;
    let mut directory = std::fs::canonicalize(&exe).unwrap_or(exe);
    directory.pop();

    if let Some(bundle) = enclosing_bundle(&directory) {
        return Some(Target::Bundle(bundle));
    }

    let sibling = directory.join(DESKTOP_BINARY);
    sibling.is_file().then_some(Target::Binary(sibling))
}

#[cfg(target_os = "macos")]
fn enclosing_bundle(directory: &std::path::Path) -> Option<PathBuf> {
    let bundle = directory.parent()?.parent()?;
    (bundle.extension()? == "app").then(|| bundle.to_path_buf())
}

#[cfg(not(target_os = "macos"))]
fn enclosing_bundle(_directory: &std::path::Path) -> Option<PathBuf> {
    None
}

#[cfg(target_os = "macos")]
fn registered() -> Option<Target> {
    Some(Target::Registered(APPLICATION_NAME))
}

#[cfg(not(target_os = "macos"))]
fn registered() -> Option<Target> {
    let path = std::env::var_os("PATH")?;
    std::env::split_paths(&path)
        .map(|directory| directory.join(DESKTOP_BINARY))
        .find(|candidate| candidate.is_file())
        .map(Target::Binary)
}

#[cfg(target_os = "macos")]
fn conventional() -> Option<Target> {
    let home = std::env::var_os("HOME").map(PathBuf::from);
    let bundle = format!("{APPLICATION_NAME}.app");

    [
        Some(PathBuf::from("/Applications")),
        home.map(|home| home.join("Applications")),
    ]
    .into_iter()
    .flatten()
    .map(|directory| directory.join(&bundle))
    .find(|candidate| candidate.is_dir())
    .map(Target::Bundle)
}

#[cfg(not(target_os = "macos"))]
fn conventional() -> Option<Target> {
    ["/usr/local/bin", "/usr/bin", "/opt/seal/bin"]
        .into_iter()
        .map(|directory| PathBuf::from(directory).join(DESKTOP_BINARY))
        .find(|candidate| candidate.is_file())
        .map(Target::Binary)
}

#[cfg(target_os = "macos")]
fn spawn(target: Target) -> Launch {
    let mut command = Command::new("/usr/bin/open");
    let located = match &target {
        Target::Bundle(path) => {
            command.arg(path);
            true
        }
        Target::Registered(name) => {
            command.arg("-a").arg(name);
            false
        }
        Target::Binary(path) => return detach(Command::new(path)),
    };

    match command.stdout(Stdio::null()).stderr(Stdio::null()).status() {
        Ok(status) if status.success() => Launch::Started,
        Ok(_) if located => Launch::Failed("the launcher refused to start it".to_owned()),
        Ok(_) => Launch::NotFound,
        Err(error) => Launch::Failed(error.to_string()),
    }
}

#[cfg(not(target_os = "macos"))]
fn spawn(target: Target) -> Launch {
    match target {
        Target::Binary(path) | Target::Bundle(path) => detach(Command::new(path)),
    }
}

fn detach(mut command: Command) -> Launch {
    match command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
    {
        Ok(_) => Launch::Started,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Launch::NotFound,
        Err(error) => Launch::Failed(error.to_string()),
    }
}

#[cfg(target_os = "macos")]
const APPLICATION_NAME: &str = "Seal";

#[cfg(windows)]
const DESKTOP_BINARY: &str = "seal-desktop.exe";

#[cfg(not(windows))]
const DESKTOP_BINARY: &str = "seal-desktop";
