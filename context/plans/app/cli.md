Part of [the root plan](README.md).

# Scope

The standalone CLI resolver: the command a bash script (or any external workflow) runs to obtain a sealed file's plaintext at the moment of use. Per the root Approach it prompts for the password in the terminal on every invocation, holds no session, depends on nothing running, and writes plaintext to stdout. It is also the terminal-side entry point to the desktop application, which it launches without otherwise knowing anything about it. Out of scope: sealing files as a management action (the desktop application's job through the engine), and any state beyond the invocation itself.

# What exists

The resolver, the status command and the launcher, implemented and verified against the contract below.

`seal resolve <path>` writes a sealed file's bytes to standard output and nothing else; `seal status <path>` reports sealed, plaintext or absent without a password; `seal open` launches the desktop application. The password is read from the controlling terminal, or from a numbered file descriptor when automation supplies one. Exit codes separate success, a wrong password, a missing file, a file that is not sealed, a busy file, a damaged file, no terminal available, and cancellation.

Verified by nine tests, several of which drive the real binary through a shell: the sealed bytes reproduced exactly across empty, unterminated, trailing-blank and multibyte content; nothing but the secret on standard output; every exit code provoked and asserted distinct; diagnostics on standard error; the status command answering without a prompt; an early-closing consumer exiting cleanly rather than failing on a broken pipe; the secret surviving command substitution; the documented capture-then-evaluate idiom loading an env file on the stock shell; and — under a genuine pseudo-terminal — the prompt appearing on the terminal while redirected standard output receives only the secret. That last test skips where the environment allows no pseudo-terminal to be allocated, since a sandbox can refuse one even with the driving tool installed; continuous integration sets the variable that turns the skip into a failure.

Three further tests cover the launcher against a stub application: an application sitting beside the running binary is the one launched even when the platform would have found an installed one; the same holds when the binary is reached through a symbolic link, where the search must follow the link to its target; and a launch that finds nothing exits non-zero naming what was missing, with standard output empty throughout. All three were confirmed non-vacuous by breaking them — dropping the sibling rule sends the first to the installed application, removing the path resolution sends the second to whatever sits beside the link, and returning success on a failed search fails the third.

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

`seal open` launches the desktop application and returns immediately.

## Opening the application from the terminal

The terminal is where a user of this product already is — editing a repo, running a deploy script — so the application needs an entry point that does not require leaving it to find an icon. `seal` is that entry point because it is the binary already on the user's path: a subcommand costs nothing to discover next to the two commands they know, whereas a second launcher binary would be one more thing to install and to explain.

**Launching is one-way and stateless.** `seal open` starts the application and exits without waiting for it, holding no handle on it and passing it nothing. The CLI's independence is a property of the design — it holds no session and depends on nothing running — and launching must not weaken it: `open` knows how to *start* the application and nothing else about it. Consequently a second `seal open` while the application is already running is the platform's business, not the CLI's; on macOS the launcher raises the existing instance rather than starting a second one.

**The application is found, never configured.** No path is stored, no environment variable is consulted, and nothing is written to disk — the search runs fresh on each invocation, in this order:

1. **A sibling of the running `seal` binary**, found after resolving that binary's own path to its real location. The command-line tool ships inside the application bundle (`packaging.md`), so a `seal` invoked from within an installation has the application it belongs to right beside it. Checking this first means the copy a user is running always opens its own application rather than a different installed one. Resolving the path is what makes that hold for a `seal` reached through a symbolic link — the ordinary way a developer puts a build on their path — where searching beside the link instead of beside its target finds a different, and typically staler, application.
2. **The platform's own application lookup**, which is what makes the command work for an ordinary installed application wherever it was put: the launch-services opener by application name on macOS, and the desktop binary on `PATH` elsewhere.
3. **The conventional install locations** for the platform, as the last resort.

The search deliberately reaches for the platform's opener before any hard-coded path, because a hard-coded path is wrong the moment a user installs somewhere else, while the opener is the same mechanism the desktop uses.

**Not finding it is a reported failure, never a silent one.** When no application is found the command exits non-zero with a message naming what it looked for and pointing at the install instructions. This follows the contract the rest of the CLI already holds — an outcome a script would act on differently gets its own exit code — and matters more here than elsewhere: a launcher that exits zero having launched nothing is indistinguishable from success at the moment the user is staring at an unchanged screen. `seal open` does not build the application from source, and does not offer to: the CLI knows nothing of a toolchain or a source tree, and a launcher that starts a multi-minute compile is not what the user asked for.

**Launch diagnostics go to standard error, and stdout stays empty.** The stdout-is-only-plaintext contract is a property of the whole binary rather than of `resolve` alone, so `open` writes nothing to stdout at all.

## Automation without a terminal

Where there is no controlling terminal — continuous integration, a detached process — the prompt cannot work, and Seal fails closed with a clear message rather than hanging. For deliberate automation the password may be supplied on a numbered file descriptor, which keeps it out of the process table, out of the environment, and off disk. An environment variable is not offered: it is the leakiest of the available mechanisms, readable from the process table on some systems and routinely captured by continuous-integration logs.

## What the documentation must say

The idiom for loading a whole env file is capture-then-evaluate, because the more obvious `source <(seal resolve ...)` **silently produces empty variables on the stock macOS shell** — a defect in that shell's handling of process substitution with `source`, unrelated to Seal, and one that would otherwise be reported as a Seal bug.

# Steps

- [x] Implement the resolver over the engine: terminal prompt, byte-exact stdout, distinguished exit codes, clean handling of a broken pipe.
- [x] Implement the status command, which needs no password.
- [x] Implement the file-descriptor password path for automation, and the fail-closed message when no terminal is available.
- [x] Tests: the stdout contract asserted byte-for-byte, every exit code provoked, the prompt reaching the terminal rather than stdout, and a driven end-to-end run under a real pseudo-terminal.
- [x] Implement `seal open`: the ordered search for the installed application, a one-way launch that does not wait, and the reported failure when nothing is found.
- [ ] Document the shell idioms in the published documentation, including the capture-then-evaluate substitute and why it exists — belongs with `publishing/`.

# Open threads

- Whether to refuse or merely warn when stdout is a terminal, which would put a secret in the user's scrollback. Measured: no surveyed tool refuses, so this would be a deliberate improvement rather than an inherited convention. Decide once the command exists and the friction is observable.
- Distribution: how the binary reaches the PATH, bundled with the application or installed separately. It is a separate binary in the same workspace regardless, so this is a packaging decision for `publishing/` rather than a design one here. `seal open` makes the choice more visible than it was — the copy of `seal` on the path decides which installation opens — but does not force it.
