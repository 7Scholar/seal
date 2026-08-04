# Running the application

How to launch and drive the real desktop application — the development loop, a real build, and the journey harness. The harness's design and its known defects live in [the harness plan](../context/plans/app/desktop/journey-harness.md); this document is the operating procedure.

## The rule that bites first

**A hand-built binary needs the `custom-protocol` cargo feature.** The framework decides dev-versus-production by that feature, not by the build profile: without it, the binary — debug *or* release — loads the dev-server URL from the config, and with no dev server running that is a permanently blank window with empty stderr and nothing to debug. The Tauri CLI passes the feature implicitly, which is why published instructions that assume `tauri build` never mention it. Every command below that produces a runnable binary passes it for you; if you invoke `cargo build` yourself, pass `--features custom-protocol` or you will build a blank window.

The frontend is embedded at compile time from `dist/`, so a frontend change reaches a real binary only by rebuilding both: `bun run build`, then the cargo build. A stale-looking app almost always means the cargo build ran against an old `dist/`.

## The development loop

Two processes: the dev server, and a debug binary that loads from it.

```
bun run dev
cargo run --manifest-path src-tauri/Cargo.toml
```

The debug binary is deliberately a dev-mode build — it loads `http://localhost:5173`, so frontend edits hot-reload. If the window is blank, the dev server is not running.

## A real build

```
bun run build
cargo build --release --manifest-path src-tauri/Cargo.toml --features custom-protocol
```

This produces `target/release/seal-desktop` (the workspace target directory sits at the repo root, not under `src-tauri/`), serving the embedded frontend. It contains no automation bridge — continuous integration proves that by scanning it.

To run it against a scratch profile instead of your real `~/.config/seal`:

```
SEAL_E2E_HOME=$(mktemp -d) ./e2e/launch-fresh.sh
```

The wrapper points `HOME` at the scratch directory, so the app starts from genuinely nothing — no registry, no master password — without touching your real state.

## Refreshing the application you open with `seal open`

```
bun run update-local
```

This rebuilds the interface, the desktop binary, and the command-line binary in the order the embedding rule above demands — the frontend first, so the cargo build embeds a current `dist/` rather than a stale one.

`seal open` finds the application by the search in [the CLI plan](../context/plans/app/cli.md), which checks beside the running `seal` binary before anything installed. A `seal` on your path that symlinks into `target/release/` therefore opens the build this command produces, and an installed copy is never reached. The command warns when the launcher it finds resolves somewhere with no desktop binary beside it, because that is the arrangement in which a rebuild changes nothing visible and a staler installed application opens instead.

Refreshing an installed application bundle is a separate act this command does not perform.

## Driving it with the journey harness

The harness launches the real release binary and drives it like a person: finds controls by their on-screen names, types, clicks, and asserts. It is how a change is confirmed working in the real webview, where unit tests cannot see (the defect class that motivated it: a control that passes every unit test and does nothing in the real app).

```
bun run e2e:build
bun run e2e
```

`e2e:build` builds the frontend and then the release binary with `--features e2e,custom-protocol` — the `e2e` feature is what compiles the embedded WebDriver bridge in, and the harness cannot start without it. `e2e` drives the `first-run` journey from a scratch profile; it takes several minutes and **a real Seal window opens on your screen and operates itself — leave it alone**; closing it mid-run fails the run.

`bun run e2e:extended` runs the returning-user scenario as well — all nine of its steps, ending with the supervised password change and the proof that the old password no longer opens Seal.

Two environment variables, both minted automatically by `e2e/wdio.conf.ts` and shared with the app: `SEAL_E2E_HOME` is the scratch home the app runs against, and `SEAL_E2E_PICK_FOLDER` is the folder the folder-pick command returns instead of showing the native dialog (harness builds only — the webview's IPC internals are readonly, so the dialog cannot be stubbed from the page).

## When it does not start

- **"Tauri app exited before the embedded WebDriver server became ready"** — the binary at `target/release/seal-desktop` was built without the `e2e` feature. Any plain `cargo build --release` — including the CI workflow's bridge-absence check run locally — silently overwrites the harness binary with a bridge-less one. Run `bun run e2e:build` again. Sanity check: `strings target/release/seal-desktop | grep -ci webdriver` — zero means no bridge.
- **The bridge never becomes ready but the app window appears and stays** — a leftover instance from an earlier run may be holding the bridge port. `pkill -x seal-desktop`, then rerun.
- **A blank window** — a dev-mode binary without the dev server: either build with `custom-protocol` or start `bun run dev` first.
- **The app looks like an older version** — the binary embedded a stale `dist/`; rebuild frontend then binary, which is what `e2e:build` and `update-local` both do in order.
- **`seal open` still shows the old interface after a rebuild** — the `seal` on your path resolves somewhere with no desktop binary beside it, so the launcher fell through to an installed copy that the rebuild never touched. `bun run update-local` reports this case; the search it fell through is in [the CLI plan](../context/plans/app/cli.md).
- **Every command takes five seconds and the run appears to hang** — the client's Tauri bridge global is missing. The runner's `before` hook installs it; if that hook is removed or fails, every element command pays a five-second timeout. See [the harness plan](../context/plans/app/desktop/journey-harness.md).
- **A step fails on a password being refused** — suspect the harness's typing before the product. Passwords go through the `typeInto`/`enterPassphrase` helper in `e2e/journeys/typing.ts`, which asserts what landed in the field; typing one with `browser.keys` instead silently drops its spaces, which establishes a vault under a password nobody intended. See [the harness plan](../context/plans/app/desktop/journey-harness.md).
