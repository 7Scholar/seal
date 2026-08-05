use seal_dotenv::{ApplyError, EnvFile, Line, Op};

const SAMPLE: &str = "# Stripe keys\nSTRIPE_SECRET=sk_live_abc\nSTRIPE_WEBHOOK=whsec_xyz\n\nDATABASE_URL=postgres://localhost/dev\n";

fn keys(file: &EnvFile) -> Vec<String> {
    file.entries().map(|entry| entry.key.clone()).collect()
}

#[test]
fn a_commented_out_assignment_is_a_disabled_variable() {
    let file = EnvFile::parse("# DATABASE_URL=postgres://localhost/dev\n");

    let entries: Vec<_> = file.entries().collect();
    assert_eq!(entries.len(), 1, "the commented line must become a variable");
    assert_eq!(entries[0].key, "DATABASE_URL");
    assert_eq!(entries[0].value, "postgres://localhost/dev");
    assert!(entries[0].disabled(), "it must be marked disabled");
}

#[test]
fn the_comment_prefix_shape_does_not_matter() {
    for source in [
        "# FOO=bar",
        "#FOO=bar",
        "##  FOO=bar",
        "####FOO=bar",
        "#\tFOO=bar",
    ] {
        let file = EnvFile::parse(source);
        let entries: Vec<_> = file.entries().collect();
        assert_eq!(entries.len(), 1, "{source} must parse as a variable");
        assert_eq!(entries[0].key, "FOO", "{source}");
        assert_eq!(entries[0].value, "bar", "{source}");
        assert!(entries[0].disabled(), "{source}");
    }
}

#[test]
fn prose_containing_an_equals_sign_stays_a_comment() {
    for source in [
        "# Set DEBUG=true to enable verbose logging",
        "# TODO: rename API_KEY=... before launch",
        "# just prose",
        "# =novalue",
    ] {
        let file = EnvFile::parse(source);
        assert_eq!(
            file.entries().count(),
            0,
            "{source} must not become a variable"
        );
        assert!(
            matches!(file.lines().next(), Some(Line::Comment(_))),
            "{source} must stay a comment"
        );
    }
}

#[test]
fn an_untouched_disabled_variable_renders_verbatim() {
    let source = "##   FOO=bar\n";
    let file = EnvFile::parse(source);

    assert_eq!(
        file.render(),
        source,
        "an untouched disabled line keeps its original prefix"
    );
}

#[test]
fn enabling_a_disabled_variable_drops_the_comment_prefix() {
    let mut file = EnvFile::parse("# FOO=bar\n");
    let row = file.row_id("FOO").expect("FOO must exist");

    file.apply(&[Op::SetDisabled { row, disabled: false }])
        .expect("enabling must succeed");

    assert_eq!(file.render(), "FOO=bar\n");
}

#[test]
fn disabling_a_variable_comments_it_out() {
    let mut file = EnvFile::parse("FOO=bar\n");
    let row = file.row_id("FOO").expect("FOO must exist");

    file.apply(&[Op::SetDisabled { row, disabled: true }])
        .expect("disabling must succeed");

    assert_eq!(file.render(), "# FOO=bar\n");
}

#[test]
fn a_toggled_round_trip_settles_at_the_canonical_prefix() {
    let mut file = EnvFile::parse("##  FOO=bar\n");
    let row = file.row_id("FOO").expect("FOO must exist");

    file.apply(&[Op::SetDisabled { row, disabled: false }])
        .expect("enable");
    file.apply(&[Op::SetDisabled { row, disabled: true }])
        .expect("disable");

    assert_eq!(
        file.render(),
        "# FOO=bar\n",
        "the doubled prefix is not restored, by design"
    );
}

#[test]
fn renaming_preserves_the_value_and_the_position() {
    let mut file = EnvFile::parse(SAMPLE);
    let row = file.row_id("STRIPE_SECRET").expect("must exist");

    file.apply(&[Op::SetKey {
        row,
        key: "STRIPE_KEY".to_owned(),
    }])
    .expect("rename must succeed");

    assert_eq!(
        keys(&file),
        ["STRIPE_KEY", "STRIPE_WEBHOOK", "DATABASE_URL"],
        "the row keeps its position"
    );
    let renamed = file.entries().next().expect("first entry");
    assert_eq!(renamed.value, "sk_live_abc", "the value is preserved");
    assert!(file.render().contains("STRIPE_KEY=sk_live_abc"));
}

#[test]
fn renaming_a_disabled_variable_keeps_it_disabled() {
    let mut file = EnvFile::parse("# FOO=bar\n");
    let row = file.row_id("FOO").expect("must exist");

    file.apply(&[Op::SetKey {
        row,
        key: "BAZ".to_owned(),
    }])
    .expect("rename");

    assert_eq!(file.render(), "# BAZ=bar\n");
}

#[test]
fn an_implausible_key_is_refused() {
    let mut file = EnvFile::parse(SAMPLE);
    let row = file.row_id("STRIPE_SECRET").expect("must exist");
    let before = file.render();

    let outcome = file.apply(&[Op::SetKey {
        row,
        key: "not a key".to_owned(),
    }]);

    assert!(matches!(outcome, Err(ApplyError::InvalidKey(_))));
    assert_eq!(file.render(), before, "nothing changed");
}

#[test]
fn inserting_places_a_variable_after_the_named_row() {
    let mut file = EnvFile::parse(SAMPLE);
    let after = file.row_id("STRIPE_SECRET").expect("must exist");

    file.apply(&[Op::Insert {
        after: Some(after),
        key: "STRIPE_ACCOUNT".to_owned(),
        value: "acct_1".to_owned(),
        disabled: false,
    }])
    .expect("insert must succeed");

    assert_eq!(
        keys(&file),
        ["STRIPE_SECRET", "STRIPE_ACCOUNT", "STRIPE_WEBHOOK", "DATABASE_URL"]
    );
    assert!(file.render().contains("STRIPE_ACCOUNT=acct_1"));
}

#[test]
fn inserting_with_no_anchor_places_a_variable_at_the_top() {
    let mut file = EnvFile::parse(SAMPLE);

    file.apply(&[Op::Insert {
        after: None,
        key: "FIRST".to_owned(),
        value: "1".to_owned(),
        disabled: false,
    }])
    .expect("insert");

    assert!(file.render().starts_with("FIRST=1\n"));
}

#[test]
fn an_inserted_value_that_needs_quoting_gets_it() {
    let mut file = EnvFile::parse(SAMPLE);

    file.apply(&[Op::Insert {
        after: None,
        key: "NOTE".to_owned(),
        value: "has spaces # and a hash".to_owned(),
        disabled: false,
    }])
    .expect("insert");

    let rendered = file.render();
    assert!(
        rendered.starts_with("NOTE=\"has spaces # and a hash\""),
        "got {rendered}"
    );

    let reparsed = EnvFile::parse(&rendered);
    let note = reparsed
        .entries()
        .find(|entry| entry.key == "NOTE")
        .expect("NOTE survives a round trip");
    assert_eq!(note.value, "has spaces # and a hash");
}

#[test]
fn removing_takes_the_line_out_entirely() {
    let mut file = EnvFile::parse(SAMPLE);
    let row = file.row_id("STRIPE_WEBHOOK").expect("must exist");

    file.apply(&[Op::Remove { row }]).expect("remove");

    assert_eq!(keys(&file), ["STRIPE_SECRET", "DATABASE_URL"]);
    assert!(!file.render().contains("STRIPE_WEBHOOK"));
}

#[test]
fn removing_leaves_every_other_line_byte_identical() {
    let mut file = EnvFile::parse(SAMPLE);
    let row = file.row_id("STRIPE_WEBHOOK").expect("must exist");

    file.apply(&[Op::Remove { row }]).expect("remove");

    assert_eq!(
        file.render(),
        "# Stripe keys\nSTRIPE_SECRET=sk_live_abc\n\nDATABASE_URL=postgres://localhost/dev\n"
    );
}

#[test]
fn reordering_permutes_variables_and_leaves_furniture_in_place() {
    let mut file = EnvFile::parse(SAMPLE);
    let secret = file.row_id("STRIPE_SECRET").expect("must exist");
    let webhook = file.row_id("STRIPE_WEBHOOK").expect("must exist");
    let database = file.row_id("DATABASE_URL").expect("must exist");

    file.apply(&[Op::Reorder {
        rows: vec![database, webhook, secret],
    }])
    .expect("reorder");

    assert_eq!(
        file.render(),
        "# Stripe keys\nDATABASE_URL=postgres://localhost/dev\nSTRIPE_WEBHOOK=whsec_xyz\n\nSTRIPE_SECRET=sk_live_abc\n",
        "the comment and the blank line hold their own positions"
    );
}

#[test]
fn a_reorder_that_drops_a_row_is_refused() {
    let mut file = EnvFile::parse(SAMPLE);
    let secret = file.row_id("STRIPE_SECRET").expect("must exist");
    let webhook = file.row_id("STRIPE_WEBHOOK").expect("must exist");
    let before = file.render();

    let outcome = file.apply(&[Op::Reorder {
        rows: vec![webhook, secret],
    }]);

    assert!(
        matches!(outcome, Err(ApplyError::IncompleteOrder)),
        "omission must never be a way to delete"
    );
    assert_eq!(file.render(), before, "nothing changed");
}

#[test]
fn a_reorder_that_repeats_a_row_is_refused() {
    let mut file = EnvFile::parse(SAMPLE);
    let secret = file.row_id("STRIPE_SECRET").expect("must exist");
    let webhook = file.row_id("STRIPE_WEBHOOK").expect("must exist");
    let before = file.render();

    let outcome = file.apply(&[Op::Reorder {
        rows: vec![secret, secret, webhook],
    }]);

    assert!(matches!(outcome, Err(ApplyError::IncompleteOrder)));
    assert_eq!(file.render(), before, "nothing changed");
}

#[test]
fn a_malformed_line_is_a_row_that_can_be_corrected() {
    let mut file = EnvFile::parse("GOOD=1\nthis line makes no sense\n");
    let row = file
        .rows()
        .iter()
        .find(|row| matches!(row.line, Line::Malformed(_)))
        .expect("the malformed line is a row")
        .id;

    file.apply(&[Op::ReplaceMalformed {
        row,
        text: "FIXED=2".to_owned(),
    }])
    .expect("correcting must succeed");

    assert_eq!(file.render(), "GOOD=1\nFIXED=2\n");
}

#[test]
fn correcting_refuses_text_that_still_does_not_parse() {
    let source = "GOOD=1\nthis line makes no sense\n";
    let mut file = EnvFile::parse(source);
    let row = file
        .rows()
        .iter()
        .find(|row| matches!(row.line, Line::Malformed(_)))
        .expect("malformed row")
        .id;

    let outcome = file.apply(&[Op::ReplaceMalformed {
        row,
        text: "still nonsense".to_owned(),
    }]);

    assert!(
        matches!(outcome, Err(ApplyError::StillMalformed(_))),
        "Correct refuses rather than guessing"
    );
    assert_eq!(file.render(), source, "the row is left exactly as it was");
}

#[test]
fn an_edit_list_naming_an_absent_row_changes_nothing() {
    let mut file = EnvFile::parse(SAMPLE);
    let secret = file.row_id("STRIPE_SECRET").expect("must exist");
    let webhook = file.row_id("STRIPE_WEBHOOK").expect("must exist");
    let before = file.render();

    file.apply(&[Op::Remove { row: webhook }]).expect("remove");
    let after_removal = file.render();

    let outcome = file.apply(&[
        Op::SetValue {
            row: secret,
            value: "changed".to_owned(),
        },
        Op::SetValue {
            row: webhook,
            value: "gone".to_owned(),
        },
    ]);

    assert!(matches!(outcome, Err(ApplyError::UnknownRow(_))));
    assert_eq!(
        file.render(),
        after_removal,
        "a list is all-or-nothing: the first op must not have landed"
    );
    assert_ne!(before, after_removal);
}

#[test]
fn ids_survive_operations_on_other_rows() {
    let mut file = EnvFile::parse(SAMPLE);
    let secret = file.row_id("STRIPE_SECRET").expect("must exist");
    let database = file.row_id("DATABASE_URL").expect("must exist");

    file.apply(&[Op::Remove { row: secret }]).expect("remove");

    file.apply(&[Op::SetValue {
        row: database,
        value: "postgres://elsewhere".to_owned(),
    }])
    .expect("the surviving row is still addressable by its original id");

    assert!(file.render().contains("DATABASE_URL=postgres://elsewhere"));
}

#[test]
fn an_inserted_row_is_addressable_by_its_returned_id() {
    let mut file = EnvFile::parse(SAMPLE);

    let created = file
        .apply(&[Op::Insert {
            after: None,
            key: "NEW".to_owned(),
            value: "one".to_owned(),
            disabled: false,
        }])
        .expect("insert");

    assert_eq!(created.len(), 1);
    file.apply(&[Op::SetValue {
        row: created[0],
        value: "two".to_owned(),
    }])
    .expect("the new row is addressable");

    assert!(file.render().contains("NEW=two"));
}

#[test]
fn a_whole_session_of_edits_touches_only_what_it_named() {
    let mut file = EnvFile::parse(SAMPLE);
    let secret = file.row_id("STRIPE_SECRET").expect("must exist");
    let webhook = file.row_id("STRIPE_WEBHOOK").expect("must exist");
    let database = file.row_id("DATABASE_URL").expect("must exist");

    file.apply(&[
        Op::SetValue {
            row: secret,
            value: "sk_live_rotated".to_owned(),
        },
        Op::SetDisabled {
            row: webhook,
            disabled: true,
        },
        Op::Insert {
            after: Some(database),
            key: "REDIS_URL".to_owned(),
            value: "redis://localhost".to_owned(),
            disabled: false,
        },
    ])
    .expect("the batch applies");

    assert_eq!(
        file.render(),
        "# Stripe keys\nSTRIPE_SECRET=sk_live_rotated\n# STRIPE_WEBHOOK=whsec_xyz\n\nDATABASE_URL=postgres://localhost/dev\nREDIS_URL=redis://localhost\n"
    );
}
