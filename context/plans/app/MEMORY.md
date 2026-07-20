# Memory

## 2026-07-20 — Sealed format is standard age with an scrypt passphrase recipient

Sealed files are ordinary age v1 files with an scrypt passphrase stanza, and staying byte-compatible with standard age tooling is part of the design: any sealed file must remain recoverable with `age`/`rage` and the password alone, without Seal. **Why:** the format's value is that it is published, spec'd, and audited-in-practice, with a maintained Rust crate — not that its parameters are individually optimal. **Mistake it prevents:** "upgrading" the KDF to Argon2id (OWASP's first choice, which the landscape doc names) or adding custom header fields — either would silently fork the format and break standard-age recoverability; scrypt-not-Argon2id is deliberate, not an oversight.
