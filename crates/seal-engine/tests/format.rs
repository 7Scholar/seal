#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use age::secrecy::SecretString;
use seal_engine::format::{
    self, Classification, Encoding, FormatError, MINIMUM_WORK_FACTOR, WORK_FACTOR,
};

const TEST_WORK_FACTOR: u8 = MINIMUM_WORK_FACTOR;

fn pass(text: &str) -> SecretString {
    SecretString::from(text.to_owned())
}

fn seal_bytes(plaintext: &[u8], passphrase: &str, work_factor: u8) -> Vec<u8> {
    let mut sealed = Vec::new();
    format::seal(plaintext, &mut sealed, &pass(passphrase), work_factor).unwrap();
    sealed
}

#[test]
fn round_trips_through_the_sealed_format() {
    let plaintext = b"DATABASE_URL=postgres://user:secret@host/db\n";
    let sealed = seal_bytes(plaintext, "correct horse", TEST_WORK_FACTOR);

    let mut opened = Vec::new();
    let report = format::unseal(
        std::io::Cursor::new(&sealed[..]),
        &mut opened,
        &[pass("correct horse")],
    )
    .unwrap();

    assert_eq!(opened, plaintext);
    assert_eq!(report.candidate, 0);
    assert_eq!(report.work_factor, TEST_WORK_FACTOR);
}

#[test]
fn sealed_output_is_armored_text() {
    let sealed = seal_bytes(b"value\n", "pw", TEST_WORK_FACTOR);
    let text = String::from_utf8(sealed).expect("armored output must be valid text");

    assert!(
        text.starts_with("-----BEGIN AGE ENCRYPTED FILE-----"),
        "sealed files must be self-evidently sealed, got: {}",
        text.lines().next().unwrap_or_default()
    );
    assert!(text
        .trim_end()
        .ends_with("-----END AGE ENCRYPTED FILE-----"));
}

#[test]
fn reports_the_work_factor_the_file_actually_carries() {
    for factor in [MINIMUM_WORK_FACTOR, MINIMUM_WORK_FACTOR + 1] {
        let sealed = seal_bytes(b"value\n", "pw", factor);
        assert_eq!(
            format::work_factor_of(&sealed[..]).unwrap(),
            Some(factor),
            "the work factor must be readable from the file itself"
        );
    }
}

#[test]
fn round_trips_an_empty_file() {
    let sealed = seal_bytes(b"", "pw", TEST_WORK_FACTOR);
    let mut opened = Vec::new();
    format::unseal(
        std::io::Cursor::new(&sealed[..]),
        &mut opened,
        &[pass("pw")],
    )
    .unwrap();
    assert!(opened.is_empty());
}

#[test]
fn round_trips_content_larger_than_one_stream_chunk() {
    let plaintext: Vec<u8> = (0..200_000u32).map(|i| (i % 251) as u8).collect();
    let sealed = seal_bytes(&plaintext, "pw", TEST_WORK_FACTOR);

    let mut opened = Vec::new();
    format::unseal(
        std::io::Cursor::new(&sealed[..]),
        &mut opened,
        &[pass("pw")],
    )
    .unwrap();
    assert_eq!(opened, plaintext);
}

#[test]
fn reports_which_candidate_opened_the_file() {
    let sealed = seal_bytes(b"value\n", "second", TEST_WORK_FACTOR);

    let mut opened = Vec::new();
    let report = format::unseal(
        std::io::Cursor::new(&sealed[..]),
        &mut opened,
        &[pass("first"), pass("second"), pass("third")],
    )
    .unwrap();

    assert_eq!(
        report.candidate, 1,
        "the caller must learn which passphrase worked, not merely that one did"
    );
    assert_eq!(opened, b"value\n");
}

#[test]
fn a_wrong_passphrase_is_distinct_from_a_damaged_file() {
    let sealed = seal_bytes(b"value\n", "right", TEST_WORK_FACTOR);

    let mut sink = Vec::new();
    let error = format::unseal(
        std::io::Cursor::new(&sealed[..]),
        &mut sink,
        &[pass("wrong")],
    )
    .unwrap_err();
    assert!(
        matches!(error, FormatError::NoMatchingPassphrase),
        "expected a passphrase failure, got {error:?}"
    );

    let text = String::from_utf8(sealed.clone()).unwrap();
    let mut lines: Vec<String> = text.lines().map(str::to_owned).collect();
    let payload = lines
        .len()
        .checked_sub(2)
        .expect("an armored file has a header, a payload and a footer");
    let corrupted: String = lines[payload]
        .chars()
        .map(|c| match c {
            'A'..='Y' => ((c as u8) + 1) as char,
            'Z' => 'A',
            other => other,
        })
        .collect();
    lines[payload] = corrupted;
    let damaged = format!("{}\n", lines.join("\n"));

    let mut sink = Vec::new();
    let error = format::unseal(
        std::io::Cursor::new(damaged.as_bytes()),
        &mut sink,
        &[pass("right")],
    )
    .unwrap_err();
    assert!(
        matches!(error, FormatError::Damaged),
        "a corrupted payload must be reported as damage, not as a wrong passphrase, got {error:?}"
    );
}

#[test]
fn refuses_to_write_a_file_outside_the_accepted_work_range() {
    for factor in [0, MINIMUM_WORK_FACTOR - 1, 64, 200] {
        let mut sink = Vec::new();
        let error = format::seal(b"value\n".as_slice(), &mut sink, &pass("pw"), factor)
            .expect_err("a work factor outside the range must be refused");

        assert!(
            matches!(error, FormatError::UnsupportedWorkFactor { .. }),
            "work factor {factor} must be refused rather than reaching the library, got {error:?}"
        );
        assert!(
            sink.is_empty(),
            "nothing may be written for a refused factor"
        );
    }
}

#[test]
fn plaintext_input_is_not_mistaken_for_a_sealed_file() {
    let mut sink = Vec::new();
    let error = format::unseal(
        std::io::Cursor::new(b"DATABASE_URL=plain\n"),
        &mut sink,
        &[pass("pw")],
    )
    .unwrap_err();

    assert!(
        matches!(error, FormatError::NotSealed),
        "expected a not-sealed report, got {error:?}"
    );
}

#[test]
fn classifies_every_input_shape() {
    let armored = seal_bytes(b"value\n", "pw", TEST_WORK_FACTOR);
    assert_eq!(
        format::classify(&armored[..]).unwrap(),
        Classification::Sealed {
            encoding: Encoding::Armored
        }
    );

    assert_eq!(
        format::classify(b"age-encryption.org/v1\n-> scrypt abc 18\n".as_slice()).unwrap(),
        Classification::Sealed {
            encoding: Encoding::Binary
        },
        "a binary age file written by stock tooling must still be recognised as sealed"
    );

    assert_eq!(
        format::classify(b"DATABASE_URL=postgres://host\n".as_slice()).unwrap(),
        Classification::Plaintext
    );

    assert_eq!(
        format::classify(b"".as_slice()).unwrap(),
        Classification::Plaintext,
        "an empty file is plaintext, not sealed"
    );
}

#[test]
fn a_file_that_merely_mentions_the_marker_is_plaintext() {
    let deceptive = b"# see -----BEGIN AGE ENCRYPTED FILE----- for the format\nKEY=value\n";
    assert_eq!(
        format::classify(deceptive.as_slice()).unwrap(),
        Classification::Plaintext,
        "the marker only counts at the very start of the file"
    );
}

const _: () = assert!(
    WORK_FACTOR >= MINIMUM_WORK_FACTOR,
    "files Seal writes must not be rejected by Seal's own floor"
);

#[test]
fn unsealing_streams_rather_than_buffering_the_whole_file() {
    struct CountingSink {
        largest_write: usize,
        total: usize,
    }

    impl std::io::Write for CountingSink {
        fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
            self.largest_write = self.largest_write.max(buf.len());
            self.total += buf.len();
            Ok(buf.len())
        }
        fn flush(&mut self) -> std::io::Result<()> {
            Ok(())
        }
    }

    let plaintext: Vec<u8> = (0..2_000_000u32).map(|i| (i % 251) as u8).collect();
    let sealed = seal_bytes(&plaintext, "pw", TEST_WORK_FACTOR);

    let mut sink = CountingSink {
        largest_write: 0,
        total: 0,
    };
    format::unseal(std::io::Cursor::new(&sealed[..]), &mut sink, &[pass("pw")]).unwrap();

    assert_eq!(
        sink.total,
        plaintext.len(),
        "all content must reach the sink"
    );
    assert!(
        sink.largest_write < plaintext.len() / 4,
        "plaintext must arrive in chunks rather than one buffer holding the whole file; \
         largest single write was {} of {} bytes",
        sink.largest_write,
        plaintext.len()
    );
}
