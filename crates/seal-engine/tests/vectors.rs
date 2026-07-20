#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use age::secrecy::SecretString;
use seal_engine::format::{self, Classification, Encoding, FormatError};

const VECTOR_PASSPHRASE: &str = "correct horse battery staple";

fn vector(name: &str) -> Vec<u8> {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/vectors")
        .join(name);
    std::fs::read(&path)
        .unwrap_or_else(|err| panic!("missing test vector {}: {err}", path.display()))
}

fn passphrase() -> SecretString {
    SecretString::from(VECTOR_PASSPHRASE.to_owned())
}

fn open(name: &str) -> Vec<u8> {
    let sealed = vector(name);
    let mut plaintext = Vec::new();
    format::unseal(&sealed[..], &mut plaintext, &[passphrase()])
        .unwrap_or_else(|err| panic!("vector {name} must open: {err}"));
    plaintext
}

#[test]
fn opens_an_armored_env_file() {
    assert_eq!(
        open("armored_env.age"),
        b"DATABASE_URL=postgres://user:pw@host/db\nAPI_KEY=sk-test\n"
    );
}

#[test]
fn opens_a_binary_file_seal_would_never_write() {
    assert_eq!(
        open("binary_env.age"),
        b"DATABASE_URL=postgres://user:pw@host/db\nAPI_KEY=sk-test\n",
        "Seal writes armored files but must read binary ones, since stock tooling writes them"
    );
}

#[test]
fn opens_an_empty_sealed_file() {
    assert!(open("armored_empty.age").is_empty());
}

#[test]
fn opens_a_file_spanning_several_stream_chunks() {
    let expected: Vec<u8> = (0..200_000u32).map(|i| (i % 251) as u8).collect();
    assert_eq!(open("armored_large.age"), expected);
}

#[test]
fn opens_a_file_containing_multibyte_text() {
    assert_eq!(
        String::from_utf8(open("armored_unicode.age")).unwrap(),
        "KEY=café ☕ naïve\n"
    );
}

#[test]
fn refuses_a_vector_sealed_below_the_minimum_work_factor() {
    let sealed = vector("armored_weak_work_factor.age");
    let mut sink = Vec::new();
    let error = format::unseal(&sealed[..], &mut sink, &[passphrase()]).unwrap_err();

    assert!(
        matches!(error, FormatError::InsufficientWork),
        "a file sealed weakly must be refused rather than silently accepted, got {error:?}"
    );
}

#[test]
fn classifies_both_encodings_from_the_corpus() {
    assert_eq!(
        format::classify(&vector("armored_env.age")[..]).unwrap(),
        Classification::Sealed {
            encoding: Encoding::Armored
        }
    );
    assert_eq!(
        format::classify(&vector("binary_env.age")[..]).unwrap(),
        Classification::Sealed {
            encoding: Encoding::Binary
        }
    );
}

#[test]
fn a_wrong_passphrase_against_a_stored_vector_is_reported_as_such() {
    let sealed = vector("armored_env.age");
    let mut sink = Vec::new();
    let error = format::unseal(
        &sealed[..],
        &mut sink,
        &[SecretString::from("not the passphrase".to_owned())],
    )
    .unwrap_err();

    assert!(matches!(error, FormatError::NoMatchingPassphrase));
}
