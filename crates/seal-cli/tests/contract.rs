#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use age::secrecy::SecretString;
use seal_engine::format::MINIMUM_WORK_FACTOR;
use seal_engine::operations;

const PASSPHRASE: &str = "correct horse battery staple";

fn binary() -> PathBuf {
    let mut path = std::env::current_exe().unwrap();
    path.pop();
    if path.ends_with("deps") {
        path.pop();
    }
    path.join("seal")
}

fn sealed_file(dir: &Path, name: &str, contents: &[u8]) -> PathBuf {
    let path = dir.join(name);
    fs::write(&path, contents).unwrap();
    operations::seal(
        &path,
        &SecretString::from(PASSPHRASE.to_owned()),
        MINIMUM_WORK_FACTOR,
    )
    .unwrap();
    path
}

struct Run {
    stdout: Vec<u8>,
    stderr: String,
    code: i32,
}

fn run_with_passphrase(args: &[&str], passphrase: &str) -> Run {
    let mut child = Command::new(binary())
        .args(args)
        .arg("--passphrase-fd")
        .arg("0")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("the seal binary must be built");

    child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(format!("{passphrase}\n").as_bytes())
        .unwrap();

    let output = child.wait_with_output().unwrap();
    Run {
        stdout: output.stdout,
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        code: output.status.code().unwrap_or(-1),
    }
}

fn run(args: &[&str]) -> Run {
    let output = Command::new(binary()).args(args).output().unwrap();
    Run {
        stdout: output.stdout,
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        code: output.status.code().unwrap_or(-1),
    }
}

#[test]
fn resolving_writes_the_exact_bytes_that_were_sealed() {
    let dir = tempfile::tempdir().unwrap();

    for contents in [
        &b"KEY=value\n"[..],
        &b"NO_TRAILING_NEWLINE"[..],
        &b"TRAILING_BLANKS\n\n\n"[..],
        &b""[..],
        "UNICODE=caf\u{e9} \u{2615}\n".as_bytes(),
    ] {
        let path = sealed_file(dir.path(), "secrets.env", contents);
        let result = run_with_passphrase(&["resolve", path.to_str().unwrap()], PASSPHRASE);

        assert_eq!(result.code, 0, "stderr was {}", result.stderr);
        assert_eq!(
            result.stdout, contents,
            "the resolver must reproduce the sealed bytes exactly, adding and stripping nothing"
        );
        fs::remove_file(&path).unwrap();
    }
}

#[test]
fn nothing_but_the_secret_ever_reaches_standard_output() {
    let dir = tempfile::tempdir().unwrap();
    let path = sealed_file(dir.path(), ".env.production", b"KEY=value\n");

    let result = run_with_passphrase(&["resolve", path.to_str().unwrap()], PASSPHRASE);

    assert_eq!(result.stdout, b"KEY=value\n");
    assert!(
        !String::from_utf8_lossy(&result.stdout).contains("Password"),
        "the prompt must never appear on standard output, which a script captures"
    );
}

#[test]
fn a_wrong_password_is_distinguishable_from_every_other_failure() {
    let dir = tempfile::tempdir().unwrap();
    let sealed = sealed_file(dir.path(), ".env.production", b"KEY=value\n");
    let plain = dir.path().join(".env.local");
    fs::write(&plain, b"KEY=plain\n").unwrap();
    let missing = dir.path().join("absent.env");

    let wrong = run_with_passphrase(&["resolve", sealed.to_str().unwrap()], "not the password");
    assert_eq!(
        wrong.code, 3,
        "a wrong password must have its own code so a script can retry"
    );
    assert!(wrong.stdout.is_empty(), "no output may escape on failure");

    let absent = run_with_passphrase(&["resolve", missing.to_str().unwrap()], PASSPHRASE);
    assert_eq!(absent.code, 4);

    let unsealed = run_with_passphrase(&["resolve", plain.to_str().unwrap()], PASSPHRASE);
    assert_eq!(unsealed.code, 5);

    assert_ne!(wrong.code, absent.code);
    assert_ne!(wrong.code, unsealed.code);
    assert_ne!(absent.code, unsealed.code);
}

#[test]
fn diagnostics_go_to_standard_error() {
    let dir = tempfile::tempdir().unwrap();
    let path = sealed_file(dir.path(), ".env.production", b"KEY=value\n");

    let result = run_with_passphrase(&["resolve", path.to_str().unwrap()], "wrong");

    assert!(result.stdout.is_empty());
    assert!(
        result.stderr.contains("did not open"),
        "the reason must be explained on standard error, got {:?}",
        result.stderr
    );
}

#[test]
fn status_reports_without_asking_for_a_password() {
    let dir = tempfile::tempdir().unwrap();
    let sealed = sealed_file(dir.path(), ".env.production", b"KEY=value\n");
    let plain = dir.path().join(".env.local");
    fs::write(&plain, b"KEY=plain\n").unwrap();
    let missing = dir.path().join("absent.env");

    let result = run(&["status", sealed.to_str().unwrap()]);
    assert_eq!(result.code, 0);
    assert_eq!(String::from_utf8_lossy(&result.stdout).trim(), "sealed");

    let result = run(&["status", plain.to_str().unwrap()]);
    assert_eq!(result.code, 5);
    assert_eq!(String::from_utf8_lossy(&result.stdout).trim(), "plaintext");

    let result = run(&["status", missing.to_str().unwrap()]);
    assert_eq!(result.code, 4);
    assert_eq!(String::from_utf8_lossy(&result.stdout).trim(), "absent");
}

#[test]
fn a_consumer_that_stops_reading_does_not_produce_a_failure() {
    let dir = tempfile::tempdir().unwrap();
    let large: Vec<u8> = (0..200_000u32)
        .map(|i| b"ABCDEFGH"[(i % 8) as usize])
        .collect();
    let path = sealed_file(dir.path(), ".env.large", &large);

    let script = format!(
        "printf '{PASSPHRASE}\\n' | {} resolve {} --passphrase-fd 0 | head -c 16; exit ${{PIPESTATUS[0]}}",
        binary().display(),
        path.display()
    );

    let output = Command::new("bash")
        .arg("-c")
        .arg(&script)
        .output()
        .unwrap();

    assert_eq!(
        output.status.code(),
        Some(0),
        "an early-closing consumer must be a clean exit rather than a broken-pipe failure; \
         stderr was {}",
        String::from_utf8_lossy(&output.stderr)
    );
}

#[test]
fn the_secret_survives_command_substitution() {
    let dir = tempfile::tempdir().unwrap();
    let path = sealed_file(
        dir.path(),
        ".env.production",
        b"DATABASE_URL=postgres://x\n",
    );

    let script = format!(
        "value=$(printf '{PASSPHRASE}\\n' | {} resolve {} --passphrase-fd 0); printf '%s' \"$value\"",
        binary().display(),
        path.display()
    );

    let output = Command::new("bash")
        .arg("-c")
        .arg(&script)
        .output()
        .unwrap();

    assert_eq!(
        String::from_utf8_lossy(&output.stdout),
        "DATABASE_URL=postgres://x",
        "command substitution must yield the secret with its trailing newline stripped by the shell"
    );
}

#[test]
fn the_capture_then_evaluate_idiom_loads_an_env_file() {
    let dir = tempfile::tempdir().unwrap();
    let path = sealed_file(
        dir.path(),
        ".env.production",
        b"DATABASE_URL=postgres://host/db\nAPI_KEY=sk-live\n",
    );

    let script = format!(
        r#"
payload=$(printf '{PASSPHRASE}\n' | {} resolve {} --passphrase-fd 0)
set -a
eval "$payload"
set +a
printf '%s|%s' "$DATABASE_URL" "$API_KEY"
"#,
        binary().display(),
        path.display()
    );

    let output = Command::new("bash")
        .arg("-c")
        .arg(&script)
        .output()
        .unwrap();

    assert_eq!(
        String::from_utf8_lossy(&output.stdout),
        "postgres://host/db|sk-live",
        "the documented idiom must work on the stock shell; stderr was {}",
        String::from_utf8_lossy(&output.stderr)
    );
}

#[test]
fn the_prompt_reaches_the_terminal_while_stdout_carries_only_the_secret() {
    if Command::new("expect").arg("-v").output().is_err() {
        eprintln!("skipped: expect is needed to drive a real terminal");
        return;
    }

    let dir = tempfile::tempdir().unwrap();
    let path = sealed_file(
        dir.path(),
        ".env.production",
        b"DATABASE_URL=postgres://real\n",
    );
    let captured = dir.path().join("captured.txt");

    let script = format!(
        r#"
spawn sh -c "{binary} resolve {path} > {captured}"
expect "Password for"
send "{passphrase}\r"
expect eof
"#,
        binary = binary().display(),
        path = path.display(),
        captured = captured.display(),
        passphrase = PASSPHRASE,
    );
    let script_path = dir.path().join("drive.exp");
    fs::write(&script_path, script).unwrap();

    let output = Command::new("expect")
        .arg(&script_path)
        .output()
        .expect("expect must run");

    let terminal = String::from_utf8_lossy(&output.stdout);
    let diagnostics = String::from_utf8_lossy(&output.stderr);

    if terminal.contains("no more ptys") || diagnostics.contains("no more ptys") {
        if std::env::var_os("SEAL_REQUIRE_TERMINAL").is_some() {
            panic!("a terminal was required but no pty could be allocated: {terminal:?}");
        }
        eprintln!("skipped: the environment allocates no pseudo-terminals");
        return;
    }

    assert!(
        terminal.contains("Password for"),
        "the prompt must appear on the terminal; saw {terminal:?}"
    );

    let secret = fs::read(&captured).unwrap();
    assert_eq!(
        secret, b"DATABASE_URL=postgres://real\n",
        "redirected standard output must carry the secret and nothing else"
    );
    assert!(
        !String::from_utf8_lossy(&secret).contains("Password"),
        "the prompt must never leak into the captured output"
    );
}
