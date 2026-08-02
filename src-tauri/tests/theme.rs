#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use seal_desktop::theme::{self, Mode};

#[test]
fn defaults_to_system_when_nothing_is_stored() {
    let dir = tempfile::tempdir().unwrap();
    assert_eq!(theme::read(dir.path()), Mode::System);
}

#[test]
fn round_trips_each_mode() {
    let dir = tempfile::tempdir().unwrap();
    for mode in [Mode::Light, Mode::Dark, Mode::System] {
        theme::write(dir.path(), mode).unwrap();
        assert_eq!(theme::read(dir.path()), mode);
    }
}

#[test]
fn falls_back_to_system_on_an_unrecognised_value() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(theme::path(dir.path()), "chartreuse").unwrap();
    assert_eq!(theme::read(dir.path()), Mode::System);
}

#[test]
fn falls_back_to_system_when_the_stored_value_is_not_readable_text() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(theme::path(dir.path()), [0xff, 0xfe, 0x00]).unwrap();
    assert_eq!(theme::read(dir.path()), Mode::System);
}

#[test]
fn writing_creates_the_directory_when_it_is_absent() {
    let dir = tempfile::tempdir().unwrap();
    let nested = dir.path().join("not-yet");
    theme::write(&nested, Mode::Dark).unwrap();
    assert_eq!(theme::read(&nested), Mode::Dark);
}

#[test]
fn a_stored_mode_survives_independently_of_the_registry() {
    let dir = tempfile::tempdir().unwrap();
    theme::write(dir.path(), Mode::Light).unwrap();
    assert!(!theme::path(dir.path()).to_string_lossy().ends_with(".json"));
    assert_eq!(theme::read(dir.path()), Mode::Light);
}
