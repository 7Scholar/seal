Part of [the root plan](README.md).

# Scope

The standalone CLI resolver: the command a bash script (or any external workflow) runs to obtain a sealed file's plaintext at the moment of use. Per the root Approach it prompts for the password in the terminal on every invocation, holds no session, depends on nothing running, and writes plaintext to stdout. Out of scope: sealing files as a management action (the desktop application's job through the engine), and any state beyond the invocation itself.

# What exists

The resolver and the status command, implemented and verified against the contract below.

`seal resolve <path>` writes a sealed file's bytes to standard output and nothing else; `seal status <path>` reports sealed, plaintext or absent without a password. The password is read from the controlling terminal, or from a numbered file descriptor when automation supplies one. Exit codes separate success, a wrong password, a missing file, a file that is not sealed, a busy file, a damaged file, no terminal available, and cancellation.

Verified by nine tests, several of which drive the real binary through a shell: the sealed bytes reproduced exactly across empty, unterminated, trailing-blank and multibyte content; nothing but the secret on standard output; every exit code provoked and asserted distinct; diagnostics on standard error; the status command answering without a prompt; an early-closing consumer exiting cleanly rather than failing on a broken pipe; the secret surviving command substitution; the documented capture-then-evaluate idiom loading an env file on the stock shell; and — under a genuine pseudo-terminal — the prompt appearing on the terminal while redirected standard output receives only the secret.

Byte-exactness and the distinguished exit codes were both confirmed non-vacuous by breaking them: appending a trailing newline, as the secret-lookup tools do, fails the exactness test, and flattening the codes fails the retry-distinction test.

# Approach

## The contract a script depends on

**Plaintext goes to stdout and nothing else ever does.** No progress, no warnings, no framing — a script capturing the output receives exactly the file's bytes. Diagnostics and the password prompt go elsewhere, so `value=$(seal resolve .env.production)` is safe by construction.

**The output is byte-exact.** No trailing newline is added and none is stripped: what was sealed is what emerges. This follows the file-oriented tools rather than the secret-lookup ones, which append a newline for readability and then need a flag to undo it. Seal resolves whole files, where a fabricated byte is a corruption rather than a nicety, and command substitution strips trailing newlines anyway.

**The prompt is written to the terminal directly, not to standard error.** Both keep stdout clean, but a prompt on standard error disappears under the `2>/dev/null` that deploy scripts routinely apply, leaving the command blocked on input with nothing on screen to explain why. Writing to the controlling terminal is immune to every redirection of the three standard streams. Measured: this works inside command substitution, inside pipelines, when stdin is redirected from elsewhere, and inside process substitution — the terminal is reached independently of the standard streams.

**Exit codes distinguish what a script would act on differently.** A wrong password is retryable and must be distinguishable from a missing file, a file that is not sealed, and a cancelled prompt. This is a deliberate improvement on the reference tools: one of them returns the same code for a wrong passphrase, a missing file and malformed input, which makes a retry loop impossible to write correctly.

**A broken pipe is a clean exit, not a crash.** A consumer that stops reading early — the common `--env-file -` shape, or any `head`-like truncation — must not produce a stack trace or a failure the script has to special-case.

## Commands

`seal resolve <path>` writes the plaintext of a sealed file to stdout. `seal status <path>` reports whether a path is sealed, plaintext, or absent without needing a password, so a script can branch without prompting. Both operate on any sealed file the password opens, whether or not it is registered: the CLI is a resolver, not a manager, and requiring registration would make a deploy script depend on the desktop application's state for no security benefit.

## Automation without a terminal

Where there is no controlling terminal — continuous integration, a detached process — the prompt cannot work, and Seal fails closed with a clear message rather than hanging. For deliberate automation the password may be supplied on a numbered file descriptor, which keeps it out of the process table, out of the environment, and off disk. An environment variable is not offered: it is the leakiest of the available mechanisms, readable from the process table on some systems and routinely captured by continuous-integration logs.

## What the documentation must say

The idiom for loading a whole env file is capture-then-evaluate, because the more obvious `source <(seal resolve ...)` **silently produces empty variables on the stock macOS shell** — a defect in that shell's handling of process substitution with `source`, unrelated to Seal, and one that would otherwise be reported as a Seal bug.

# Steps

- [x] Implement the resolver over the engine: terminal prompt, byte-exact stdout, distinguished exit codes, clean handling of a broken pipe.
- [x] Implement the status command, which needs no password.
- [x] Implement the file-descriptor password path for automation, and the fail-closed message when no terminal is available.
- [x] Tests: the stdout contract asserted byte-for-byte, every exit code provoked, the prompt reaching the terminal rather than stdout, and a driven end-to-end run under a real pseudo-terminal.
- [ ] Document the shell idioms in the published documentation, including the capture-then-evaluate substitute and why it exists — belongs with `publishing/`.

# Open threads

- Whether to refuse or merely warn when stdout is a terminal, which would put a secret in the user's scrollback. Measured: no surveyed tool refuses, so this would be a deliberate improvement rather than an inherited convention. Decide once the command exists and the friction is observable.
- Distribution: how the binary reaches the PATH, bundled with the application or installed separately. It is a separate binary in the same workspace regardless, so this is a packaging decision for `publishing/` rather than a design one here.
