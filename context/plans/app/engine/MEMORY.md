# Memory

## 2026-07-20 — The scrypt work factor is pinned explicitly, never left to the crate default

Sealing always calls `age::scrypt::Recipient::set_work_factor` with an explicit value rather than using `Encryptor::with_user_passphrase` or an unset recipient. **Why:** the crate's default work factor is not a constant — it is auto-calibrated at runtime by timing scrypt to hit roughly one second, so it varies with the machine, its load, and the build profile (a debug build calibrates far lower than release). A sealed file's cost would then be an accident of the machine that produced it. **Mistake it prevents:** dropping the explicit call as redundant, which silently makes the format's security parameter machine-dependent and lets a slow or loaded machine seal a file at a weak work factor. Unsealing separately caps accepted work with `Identity::set_max_work_factor` so a hostile file cannot force an enormous derivation.

## 2026-07-20 — The replace temp file lives in the target's own directory, never in a temp dir

The scratch file a seal or unseal writes before renaming is created in the same directory as the target file, not in `/tmp` or any system temp location. **Why:** `rename` fails with `EXDEV` across filesystems, so a temp file elsewhere cannot atomically replace the target. This passes local testing on machines where the temp dir happens to share the target's volume — verified here that `/private/tmp` and the working tree sit on the same APFS volume — and then fails for any user whose repo is on an external drive, a separate volume, or a network mount. **Mistake it prevents:** "tidying" the temp file into the system temp directory, which looks cleaner, tests green locally, and breaks in the field.

## 2026-07-20 — Metadata is captured and restored explicitly across the replace

Seal and unseal capture the target's mode and xattrs before writing and restore them onto the replacement before the rename, and the temp file is created mode `0600`. **Why:** `rename` installs a new inode, so everything inode-resident is replaced by the temp file's own attributes. Measured: a `0600` secrets file came out `0644` after a naive replace, with its xattrs gone — sealing a secret would silently widen it to world-readable. **Mistake it prevents:** treating the metadata capture/restore as incidental bookkeeping and dropping it during a refactor, which reintroduces a permission-widening security regression that no test of the file's *contents* would catch. ACLs and birthtime are known **not** to survive this sequence and are out of scope.

## 2026-07-20 — Unsealing wraps input in `ArmoredReader` regardless of format

The unseal path always constructs the decryptor over `age::armor::ArmoredReader`, never over the raw reader. **Why:** `ArmoredReader` passes binary age files through transparently, so the single wrapped path reads both armored and binary input; a decryptor constructed on raw bytes rejects armored input with `DecryptError::InvalidHeader`. **Mistake it prevents:** removing the wrap as unnecessary when sealing happens to emit binary, which breaks reading any armored file — including files produced by standard `age`/`rage`, which Seal must stay compatible with.
