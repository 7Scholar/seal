#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use std::path::Path;
use std::process::Command;

use age::secrecy::SecretString;
use seal_engine::format::{self, MINIMUM_WORK_FACTOR};

const PASSPHRASE: &str = "correct horse battery staple";
const CONTENT: &[u8] = b"DATABASE_URL=postgres://user:secret@host/db\nAPI_KEY=sk-live-42\n";

fn stock_age_available() -> bool {
    Command::new("age")
        .arg("--version")
        .output()
        .map(|out| out.status.success())
        .unwrap_or(false)
}

fn shell_quote(argument: &str) -> String {
    format!("'{}'", argument.replace('\'', r"'\''"))
}

fn tcl_brace(word: &str) -> String {
    format!("{{{word}}}")
}

fn expect_available() -> bool {
    Command::new("expect")
        .arg("-v")
        .output()
        .map(|out| out.status.success())
        .unwrap_or(false)
}

fn terminals_available() -> bool {
    let probe = drive_with_terminal(0, &["--version"]);

    !probe.terminal.contains("no more ptys") && !probe.diagnostics.contains("no more ptys")
}

fn skip_unless_available() -> bool {
    let required = std::env::var_os("SEAL_REQUIRE_INTEROP").is_some();

    if !stock_age_available() {
        assert!(
            !required,
            "the stock `age` binary is missing while SEAL_REQUIRE_INTEROP is set. \
             Continuous integration sets that variable so a broken install step fails loudly \
             instead of skipping these tests and reporting a green run that verified nothing."
        );

        eprintln!(
            "skipped: the stock `age` binary is not installed. \
             These tests prove interoperability with the reference implementation; \
             install age (for example `brew install age`) to run them."
        );
        return true;
    }

    if !expect_available() {
        assert!(
            !required,
            "`expect` is missing while SEAL_REQUIRE_INTEROP is set. These tests drive the \
             stock binary's passphrase prompt through it, so a run without it verifies \
             nothing and must not report success."
        );

        eprintln!(
            "skipped: `expect` is not installed. These tests need it to drive the stock \
             binary's passphrase prompt through a terminal."
        );
        return true;
    }

    if !terminals_available() {
        assert!(
            !required,
            "no pseudo-terminal could be allocated while SEAL_REQUIRE_INTEROP is set. \
             These tests must drive the stock binary through a terminal, so a run that \
             cannot allocate one verifies nothing and must not report success."
        );

        eprintln!(
            "skipped: this environment allocates no pseudo-terminals, which these tests \
             need in order to drive the stock binary's passphrase prompt."
        );
        return true;
    }

    false
}

struct Driven {
    terminal: String,
    diagnostics: String,
    captured: String,
    succeeded: bool,
}

fn drive_with_terminal(prompts: usize, args: &[&str]) -> Driven {
    let dir = tempfile::tempdir().unwrap();
    let captured = dir.path().join("captured.txt");
    let quoted: Vec<String> = args.iter().copied().map(shell_quote).collect();

    let script = format!(
        r#"
set timeout 60
log_user 1
set answered 0
set passphrase {{{PASSPHRASE}}}
spawn sh -c {command}
expect {{
    -re {{[Pp]assphrase[^:]*:}} {{
        if {{$answered < {prompts}}} {{
            incr answered
            send "$passphrase\r"
        }}
        exp_continue
    }}
    eof {{}}
}}
catch wait result
exit [lindex $result 3]
"#,
        command = tcl_brace(&format!(
            "age {} > {}",
            quoted.join(" "),
            captured.display()
        )),
    );

    let script_path = dir.path().join("drive.exp");
    std::fs::write(&script_path, script).unwrap();

    let output = Command::new("expect")
        .arg(&script_path)
        .output()
        .expect("expect must be available to drive the stock binary through a terminal");

    Driven {
        terminal: String::from_utf8_lossy(&output.stdout).into_owned(),
        diagnostics: String::from_utf8_lossy(&output.stderr).into_owned(),
        captured: std::fs::read_to_string(&captured).unwrap_or_default(),
        succeeded: output.status.success(),
    }
}

#[test]
fn a_file_seal_wrote_opens_with_the_reference_implementation() {
    if skip_unless_available() {
        return;
    }

    let dir = tempfile::tempdir().unwrap();
    let sealed_path = dir.path().join("sealed.age");

    let mut sealed = Vec::new();
    format::seal(
        CONTENT,
        &mut sealed,
        &SecretString::from(PASSPHRASE.to_owned()),
        MINIMUM_WORK_FACTOR,
    )
    .unwrap();
    std::fs::write(&sealed_path, &sealed).unwrap();

    let output = drive_with_terminal(1, &["-d", sealed_path.to_str().unwrap()]);
    assert!(
        output.succeeded,
        "the reference implementation must exit cleanly; terminal was {:?}",
        output.terminal
    );

    let recovered = output.captured;
    let expected = String::from_utf8_lossy(CONTENT);
    for line in expected.lines().filter(|line| !line.is_empty()) {
        assert!(
            recovered.contains(line),
            "the reference implementation must recover every line Seal sealed; \
             missing {line:?} from output {recovered:?}"
        );
    }
}

#[test]
fn a_file_the_reference_implementation_wrote_opens_with_seal() {
    if skip_unless_available() {
        return;
    }

    let dir = tempfile::tempdir().unwrap();
    let plain_path = dir.path().join("plain.env");
    let sealed_path = dir.path().join("stock.age");
    std::fs::write(&plain_path, CONTENT).unwrap();

    let output = drive_with_terminal(
        2,
        &[
            "-p",
            "-a",
            "-o",
            sealed_path.to_str().unwrap(),
            plain_path.to_str().unwrap(),
        ],
    );
    assert!(
        sealed_path.exists(),
        "the stock binary must produce a file; terminal was {:?}",
        output.terminal
    );

    let sealed = std::fs::File::open(&sealed_path).unwrap();
    let mut recovered = Vec::new();
    format::unseal(
        sealed,
        &mut recovered,
        &[SecretString::from(PASSPHRASE.to_owned())],
    )
    .expect("Seal must open a file written by the reference implementation");

    assert_eq!(recovered, CONTENT);
}

#[test]
fn the_committed_vectors_open_with_the_reference_implementation() {
    if skip_unless_available() {
        return;
    }

    let vectors = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/vectors");
    let armored = vectors.join("armored_env.age");

    let output = drive_with_terminal(1, &["-d", armored.to_str().unwrap()]);
    assert!(
        output.succeeded,
        "the corpus must decrypt cleanly; terminal was {:?}",
        output.terminal
    );

    let recovered = output.captured;
    assert!(
        recovered.contains("DATABASE_URL=postgres://user:pw@host/db"),
        "the committed corpus must be readable by the reference implementation, \
         which is what makes it evidence of interoperability rather than of self-consistency; \
         got {recovered:?}"
    );
}
