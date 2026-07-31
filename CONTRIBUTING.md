# Contributing

Thank you for looking. This project has a few conventions that are unusual enough to be worth reading before you write code — they are what keep it trustworthy rather than merely working.

## The short version

```bash
bun install                 # exactly what the lockfile pins
cargo test             # the Rust suite
bun run test               # the interface suite
cargo clippy --all-targets --all-features -- -D warnings
cargo fmt --all --check
bun run typecheck
```

All of these run in continuous integration and must pass.

## The plans are the documentation

The founding intent, every design decision, and the current state of all work live in the plan tree at [context/plans/app/](context/plans/app/README.md). A finished plan is meant to be a complete enough specification that someone could rebuild the concern from it without reading the code.

Start at [AGENTS.md](AGENTS.md), which points into the operating manual. If you are changing behaviour, the plan that owns it changes in the same commit.

## Code carries no comments

None — not even docstrings. Everything a reader might want explained lives in the plans, where it can be read as a whole and kept honest. The single exception is a decision so counterintuitive that a reader would otherwise "correct" it on sight, and such a decision usually also belongs in the relevant `MEMORY.md`.

If a comment would explain *what* code does, the fix is clearer code.

## Prove your guards are real

The convention that matters most here. **Every load-bearing guard is confirmed non-vacuous**: break it deliberately, watch the matching test fail, restore it, and say so in the commit message.

This is not ceremony. Several tests in this repository once passed with the code they were guarding entirely removed, and each was caught only by trying to break it. A test that passes whether or not the behaviour holds is worse than no test, because it is trusted.

## Record the traps

A decision a later reader would reasonably try to simplify away belongs in the relevant `MEMORY.md`, stated as the mistake it prevents rather than as history. Several entries in this repository exist because a plausible "improvement" would silently reintroduce a security regression or a data-loss bug.

## Security

Please do not open a public issue for a vulnerability. See [SECURITY.md](SECURITY.md).

## Licence

Contributions are dual-licensed under MIT and Apache-2.0, matching the project.
