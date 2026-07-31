use std::io::{self, Write};
use std::path::PathBuf;
use std::process::ExitCode;

use age::secrecy::SecretString;
use clap::{Parser, Subcommand};
use seal_engine::format::Classification;
use seal_engine::operations::{self, OperationError};

mod open;

mod exit {
    pub const SUCCESS: u8 = 0;
    pub const FAILED: u8 = 1;
    pub const WRONG_PASSPHRASE: u8 = 3;
    pub const NOT_FOUND: u8 = 4;
    pub const NOT_SEALED: u8 = 5;
    pub const BUSY: u8 = 6;
    pub const DAMAGED: u8 = 7;
    pub const NO_TERMINAL: u8 = 8;
    pub const NO_APPLICATION: u8 = 9;
    pub const CANCELLED: u8 = 130;
}

#[derive(Parser)]
#[command(
    name = "seal",
    version,
    about = "Resolve sealed files at the moment of use",
    long_about = None
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Write a sealed file's contents to standard output
    Resolve {
        /// The sealed file to resolve
        path: PathBuf,
        /// Read the password from this file descriptor instead of the terminal
        #[arg(long, value_name = "FD")]
        passphrase_fd: Option<i32>,
    },
    /// Report whether a path is sealed, without needing a password
    Status {
        /// The path to inspect
        path: PathBuf,
    },
    /// Launch the Seal desktop application
    Open,
}

fn main() -> ExitCode {
    let cli = Cli::parse();

    let code = match cli.command {
        Command::Resolve {
            path,
            passphrase_fd,
        } => resolve(&path, passphrase_fd),
        Command::Status { path } => status(&path),
        Command::Open => launch(),
    };

    ExitCode::from(code)
}

fn resolve(path: &std::path::Path, passphrase_fd: Option<i32>) -> u8 {
    let passphrase = match read_passphrase(path, passphrase_fd) {
        Ok(passphrase) => passphrase,
        Err(code) => return code,
    };

    let stdout = io::stdout();
    let mut handle = stdout.lock();

    match operations::unseal_to(path, &mut handle, &[passphrase]) {
        Ok(_) => match handle.flush() {
            Ok(()) => exit::SUCCESS,
            Err(err) if err.kind() == io::ErrorKind::BrokenPipe => exit::SUCCESS,
            Err(err) => {
                report(&format!("could not write the contents: {err}"));
                exit::FAILED
            }
        },
        Err(error) => {
            report(&describe(&error));
            code_for(&error)
        }
    }
}

fn status(path: &std::path::Path) -> u8 {
    match operations::classify(path) {
        Ok(Classification::Sealed { .. }) => {
            println!("sealed");
            exit::SUCCESS
        }
        Ok(_) => {
            println!("plaintext");
            exit::NOT_SEALED
        }
        Err(OperationError::Absent { .. }) => {
            println!("absent");
            exit::NOT_FOUND
        }
        Err(error) => {
            report(&describe(&error));
            code_for(&error)
        }
    }
}

fn launch() -> u8 {
    match open::open() {
        open::Launch::Started => exit::SUCCESS,
        open::Launch::NotFound => {
            report("could not find the Seal application.");
            report("       Build it from a checkout with `cargo build --release`, or see");
            report("       https://github.com/7scholar/seal for installation instructions.");
            exit::NO_APPLICATION
        }
        open::Launch::Failed(reason) => {
            report(&format!("could not start the Seal application: {reason}"));
            exit::FAILED
        }
    }
}

fn read_passphrase(path: &std::path::Path, fd: Option<i32>) -> Result<SecretString, u8> {
    if let Some(fd) = fd {
        return read_from_descriptor(fd);
    }

    let prompt = format!("Password for {}: ", path.display());
    match rpassword::prompt_password(&prompt) {
        Ok(passphrase) => Ok(SecretString::from(passphrase)),
        Err(err) => match err.kind() {
            io::ErrorKind::Interrupted => Err(exit::CANCELLED),
            io::ErrorKind::UnexpectedEof => {
                report("no password was entered");
                Err(exit::CANCELLED)
            }
            _ => {
                report(
                    "no terminal is available to ask for the password. \
                     Supply it on a file descriptor with --passphrase-fd instead.",
                );
                Err(exit::NO_TERMINAL)
            }
        },
    }
}

#[cfg(unix)]
fn read_from_descriptor(fd: i32) -> Result<SecretString, u8> {
    use std::io::Read;
    use std::os::fd::FromRawFd;

    let mut file = unsafe { std::fs::File::from_raw_fd(fd) };
    let mut buffer = String::new();
    match file.read_to_string(&mut buffer) {
        Ok(_) => {
            let trimmed = buffer.trim_end_matches(['\n', '\r']).to_owned();
            Ok(SecretString::from(trimmed))
        }
        Err(err) => {
            report(&format!(
                "could not read the password from descriptor {fd}: {err}"
            ));
            Err(exit::FAILED)
        }
    }
}

#[cfg(not(unix))]
fn read_from_descriptor(_fd: i32) -> Result<SecretString, u8> {
    report("reading a password from a file descriptor is not supported on this platform");
    Err(exit::FAILED)
}

fn describe(error: &OperationError) -> String {
    match error {
        OperationError::NoMatchingPassphrase { .. } => "the password did not open this file".into(),
        OperationError::NotSealed { path } => format!("{} is not sealed", path.display()),
        OperationError::Absent { path } => format!("{} does not exist", path.display()),
        OperationError::Busy { path } => {
            format!("{} is in use by another operation", path.display())
        }
        OperationError::Damaged { path } => {
            format!("{} is damaged or truncated", path.display())
        }
        OperationError::UnacceptableWork { path } => format!(
            "{} was sealed with a work factor outside the accepted range",
            path.display()
        ),
        other => other.to_string(),
    }
}

fn code_for(error: &OperationError) -> u8 {
    match error {
        OperationError::NoMatchingPassphrase { .. } => exit::WRONG_PASSPHRASE,
        OperationError::Absent { .. } => exit::NOT_FOUND,
        OperationError::NotSealed { .. } => exit::NOT_SEALED,
        OperationError::Busy { .. } => exit::BUSY,
        OperationError::Damaged { .. } | OperationError::UnacceptableWork { .. } => exit::DAMAGED,
        _ => exit::FAILED,
    }
}

fn report(message: &str) {
    let _ = writeln!(io::stderr(), "seal: {message}");
}
