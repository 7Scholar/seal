Part of [the root plan](README.md).

# Scope

The standalone CLI resolver: the command a bash script (or any external workflow) runs to obtain a sealed file's plaintext at the moment of use. Per the root Approach it prompts for the password in the terminal on every invocation, holds no session, depends on nothing running, and writes plaintext to stdout. Out of scope: sealing/unsealing files in place as a management action (the app's job through the engine), and any state beyond the invocation itself.

# What exists

Nothing; no code exists yet anywhere in the project.

# What is missing

Everything: the command surface, the prompt and error UX (wrong password, not-a-sealed-file, missing file), how the binary is named, built, and installed alongside the app, and its exact stdout/stderr/exit-code contract so scripts can rely on it.

# Steps

TBD — first: research and design the command contract; the Approach lands here before any implementation.

# Open threads

- Distribution: how the CLI reaches the PATH (bundled sidecar exposed by the app, separate install, or both); settle during design.
- Whether resolving requires the file to be a registered managed file or works on any age file the password opens; settle during design.
