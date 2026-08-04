#![allow(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use std::time::Duration;

use seal_desktop::commands::held_lifetime;
use seal_session::DEFAULT_LIFETIME;

const VARIABLE: &str = "SEAL_E2E_PLAINTEXT_LIFETIME_SECONDS";

fn with_override(value: Option<&str>, check: impl FnOnce(Duration)) {
    match value {
        Some(value) => std::env::set_var(VARIABLE, value),
        None => std::env::remove_var(VARIABLE),
    }
    let observed = held_lifetime();
    std::env::remove_var(VARIABLE);
    check(observed);
}

#[test]
fn the_lifetime_seam_only_ever_shortens() {
    with_override(None, |lifetime| assert_eq!(lifetime, DEFAULT_LIFETIME));

    with_override(Some("2"), |lifetime| {
        if cfg!(feature = "e2e") {
            assert_eq!(lifetime, Duration::from_secs(2));
        } else {
            assert_eq!(lifetime, DEFAULT_LIFETIME);
        }
    });

    for refused in [
        "0",
        "901",
        "3600",
        "",
        "  ",
        "abc",
        "-1",
        "2.5",
        "18446744073709551616",
    ] {
        with_override(Some(refused), |lifetime| {
            assert_eq!(
                lifetime, DEFAULT_LIFETIME,
                "{refused:?} must leave the default standing"
            );
        });
    }
}
