#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use seal_dotenv::{EnvFile, Line, Newline, Quote};

const REALISTIC: &str = "\
# Production configuration
# Do not commit real values

DATABASE_URL=postgres://user:pw@host/db
API_KEY='sk-live-single-quoted'
SECRET=\"has \\\"escaped\\\" quotes\"

# Feature flags
export ENABLE_BETA=true
EMPTY=
SPACED = padded
WITH_HASH=\"value#not-a-comment\"
TRAILING=value # a trailing comment
DUPLICATE=first
DUPLICATE=second
this line makes no sense
";

fn assert_exact_roundtrip(source: &str) {
    let parsed = EnvFile::parse(source);
    assert_eq!(
        parsed.render(),
        source,
        "an untouched file must render byte-for-byte as it was read"
    );
}

#[test]
fn an_untouched_realistic_file_round_trips_exactly() {
    assert_exact_roundtrip(REALISTIC);
}

#[test]
fn every_shape_round_trips_exactly() {
    for source in [
        "",
        "\n",
        "KEY=value",
        "KEY=value\n",
        "\n\n\n",
        "# only a comment\n",
        "   # indented comment\n",
        "KEY=value\n\n# trailing comment\n",
        "NO_NEWLINE_AT_END=value",
        "KEY='single'\n",
        "KEY=\"double\"\n",
        "export KEY=value\n",
        "  INDENTED=value\n",
        "KEY=\n",
        "KEY==double-equals\n",
        "KEY=value with spaces\n",
        "URL=https://example.com/path?a=1&b=2\n",
        "JSON={\"nested\": \"json\"}\n",
    ] {
        assert_exact_roundtrip(source);
    }
}

#[test]
fn windows_line_endings_survive() {
    let source = "# comment\r\nKEY=value\r\nOTHER=thing\r\n";
    assert_exact_roundtrip(source);

    let parsed = EnvFile::parse(source);
    assert_eq!(parsed.newline(), Newline::Crlf);
}

#[test]
fn parsing_reads_the_values_correctly() {
    let parsed = EnvFile::parse(REALISTIC);

    let value = |key: &str| {
        parsed
            .entries()
            .find(|entry| entry.key == key)
            .unwrap_or_else(|| panic!("{key} must parse"))
            .value
            .clone()
    };

    assert_eq!(value("DATABASE_URL"), "postgres://user:pw@host/db");
    assert_eq!(value("API_KEY"), "sk-live-single-quoted");
    assert_eq!(value("SECRET"), "has \"escaped\" quotes");
    assert_eq!(value("ENABLE_BETA"), "true");
    assert_eq!(value("EMPTY"), "");
    assert_eq!(value("SPACED"), "padded");
    assert_eq!(
        value("WITH_HASH"),
        "value#not-a-comment",
        "a hash inside quotes is part of the value, not a comment"
    );
    assert_eq!(
        value("TRAILING"),
        "value",
        "a hash after whitespace outside quotes starts a comment"
    );
}

#[test]
fn editing_one_variable_changes_exactly_one_line() {
    let mut parsed = EnvFile::parse(REALISTIC);
    parsed
        .entry_mut("DATABASE_URL")
        .expect("the key must exist")
        .set_value("postgres://user:rotated@host/db");

    let rendered = parsed.render();

    let before: Vec<&str> = REALISTIC.lines().collect();
    let after: Vec<&str> = rendered.lines().collect();
    assert_eq!(before.len(), after.len(), "no line may be added or removed");

    let differing: Vec<usize> = before
        .iter()
        .zip(&after)
        .enumerate()
        .filter(|(_, (a, b))| a != b)
        .map(|(index, _)| index)
        .collect();

    assert_eq!(
        differing.len(),
        1,
        "exactly one line may change; changed lines were {differing:?}"
    );
    assert!(after[differing[0]].contains("rotated"));
}

#[test]
fn comments_and_blank_lines_survive_an_edit() {
    let mut parsed = EnvFile::parse(REALISTIC);
    parsed.entry_mut("EMPTY").unwrap().set_value("now-set");
    let rendered = parsed.render();

    assert!(rendered.contains("# Production configuration"));
    assert!(rendered.contains("# Do not commit real values"));
    assert!(rendered.contains("# Feature flags"));
    assert!(
        rendered.contains("\n\n"),
        "blank lines must survive an edit"
    );
}

#[test]
fn an_unparseable_line_is_preserved_rather_than_dropped() {
    let parsed = EnvFile::parse(REALISTIC);

    let unparseable: Vec<&Line> = parsed
        .lines()
        .iter()
        .filter(|line| matches!(line, Line::Unparseable(_)))
        .collect();

    assert_eq!(unparseable.len(), 1, "the nonsense line must be recognised");
    assert!(parsed.render().contains("this line makes no sense"));
}

#[test]
fn duplicate_keys_are_kept_and_reported() {
    let parsed = EnvFile::parse(REALISTIC);

    assert_eq!(
        parsed.duplicate_keys(),
        vec!["DUPLICATE".to_owned()],
        "duplicates must be surfaced rather than silently resolved, since implementations \
         disagree on whether the first or the last wins"
    );

    let values: Vec<String> = parsed
        .entries()
        .filter(|entry| entry.key == "DUPLICATE")
        .map(|entry| entry.value.clone())
        .collect();
    assert_eq!(values, vec!["first".to_owned(), "second".to_owned()]);
}

#[test]
fn quoting_is_preserved_when_a_value_changes() {
    let mut parsed = EnvFile::parse("SINGLE='old'\nDOUBLE=\"old\"\nBARE=old\n");

    parsed.entry_mut("SINGLE").unwrap().set_value("new");
    parsed.entry_mut("DOUBLE").unwrap().set_value("new");
    parsed.entry_mut("BARE").unwrap().set_value("new");

    assert_eq!(parsed.render(), "SINGLE='new'\nDOUBLE=\"new\"\nBARE=new\n");
}

#[test]
fn a_value_that_needs_quoting_gets_it() {
    let mut parsed = EnvFile::parse("BARE=old\n");
    parsed
        .entry_mut("BARE")
        .unwrap()
        .set_value("now has spaces and a # hash");

    let rendered = parsed.render();
    assert_eq!(rendered, "BARE=\"now has spaces and a # hash\"\n");

    let reparsed = EnvFile::parse(&rendered);
    assert_eq!(
        reparsed.entries().next().unwrap().value,
        "now has spaces and a # hash",
        "a value that needed quoting must survive a second parse"
    );
}

#[test]
fn a_value_containing_quotes_round_trips_through_an_edit() {
    let mut parsed = EnvFile::parse("KEY=old\n");
    parsed
        .entry_mut("KEY")
        .unwrap()
        .set_value("has \"double\" and 'single' quotes");

    let rendered = parsed.render();
    let reparsed = EnvFile::parse(&rendered);

    assert_eq!(
        reparsed.entries().next().unwrap().value,
        "has \"double\" and 'single' quotes"
    );
}

#[test]
fn a_single_quoted_value_gaining_an_apostrophe_changes_style_safely() {
    let mut parsed = EnvFile::parse("KEY='plain'\n");
    parsed.entry_mut("KEY").unwrap().set_value("it's got one");

    let rendered = parsed.render();
    let reparsed = EnvFile::parse(&rendered);

    assert_eq!(
        reparsed.entries().next().unwrap().value,
        "it's got one",
        "the renderer must change quoting rather than emit a broken line"
    );
    assert_eq!(reparsed.entries().next().unwrap().quote(), Quote::Double);
}

#[test]
fn the_export_prefix_survives_an_edit() {
    let mut parsed = EnvFile::parse("export KEY=old\n");
    parsed.entry_mut("KEY").unwrap().set_value("new");

    assert_eq!(parsed.render(), "export KEY=new\n");
}

#[test]
fn a_trailing_comment_survives_an_edit() {
    let mut parsed = EnvFile::parse("KEY=old # keep me\n");
    parsed.entry_mut("KEY").unwrap().set_value("new");

    let rendered = parsed.render();
    assert!(
        rendered.contains("# keep me"),
        "an edit must not discard the comment beside it, got {rendered:?}"
    );
}
