# Tauri & Rust practices

Read this before writing any Rust or Tauri code in this repo. It states how we build Tauri 2.x apps and idiomatic Rust; link targets at tauri.app are the source of depth.

## Project structure

- The repo root holds the frontend (`package.json`, `src/`, `index.html`); all Rust lives in `src-tauri/`. `src-tauri/` contains `Cargo.toml`, `tauri.conf.json`, `capabilities/`, `icons/`, `build.rs`, and `src/` with `main.rs` (a thin shim calling `app_lib::run()`) and `lib.rs` (the real entry: builder, plugin registration, command registration).
- `tauri.conf.json` declares app identity (`identifier`, `productName`, `version`), window defaults, the dev server URL and frontend build commands (`build.beforeDevCommand`, `build.frontendDist`), bundling (`bundle`, including `externalBin` for sidecars), and security settings (`app.security.csp`). Treat it as the single source of truth for app configuration; do not duplicate these values in code.
- Keep domain logic in dedicated Rust modules (or separate workspace crates once `src-tauri` grows) that do not depend on `tauri::*`; only the command layer and setup code import Tauri types. If a CLI companion is ever needed, a Cargo workspace with a shared core crate is the mechanism.
- Structure and setup reference: https://tauri.app/start/ and https://tauri.app/develop/

## IPC: commands, state, events, channels

- Expose backend functionality as `#[tauri::command]` functions registered in `tauri::generate_handler![...]`; the frontend calls them via `invoke()` from `@tauri-apps/api/core`. Docs: https://tauri.app/develop/calling-rust/
- Commands doing IO or anything non-trivial are `async fn`, so they run off the main thread and never freeze the UI. Async commands cannot take borrowed arguments like `&str`; take `String` and owned types.
- Keep command handlers thin: parse input, call a plain Rust function in a domain module, map the result. All logic lives in functions testable without a Tauri runtime.
- Shared state is registered with `app.manage(...)` (or `Builder::manage`) and injected as `tauri::State<'_, T>`. Wrap mutable state in `std::sync::Mutex` (or `RwLock` for read-heavy state) even inside async commands; use `tokio::sync::Mutex` only when a guard must be held across an `.await`. Never hold a std lock across an `.await`. Outside commands, reach state via `app_handle.state::<T>()`; note that requesting an unmanaged type panics at runtime, so use a single type alias for each managed state type. Docs: https://tauri.app/develop/state-management/
- Backend-to-frontend notifications use events: `app.emit()` / `emit_to()` in Rust, `listen()` from `@tauri-apps/api/event` in the frontend. Events are JSON-only, untyped, and fire-and-forget; use them for broadcasts, not request/response. Docs: https://tauri.app/develop/calling-frontend/
- For streaming ordered data from one command (progress, logs, chunked output), pass a `tauri::ipc::Channel<T>` argument and call `channel.send(...)`; channels are faster and better ordered than events.

```rust
#[tauri::command]
async fn decrypt_file(state: tauri::State<'_, AppState>, path: String) -> Result<FileContents, CommandError> {
    let vault = state.vault.lock().map_err(|_| CommandError::VaultLocked)?;
    vault::decrypt_file(&vault, Path::new(&path))
}
```

## Security model

- Every window's access to commands and plugin APIs is declared in capability files under `src-tauri/capabilities/` (JSON, e.g. `default.json`): an `identifier`, the `windows` it applies to, and a `permissions` list (`core:default`, `plugin-name:allow-xyz`, plus scoped entries). Grant the minimum set; add permissions one at a time as features need them. Docs: https://tauri.app/security/capabilities/
- Privileged logic stays in Rust. The webview gets a small, purpose-built command surface ("decrypt this file", not "read any path"); never expose generic filesystem/shell power to the frontend when a specific command will do. Command inputs are untrusted: validate paths and arguments in Rust.
- Set a strict CSP in `tauri.conf.json` (`app.security.csp`), e.g. `default-src 'self'`; Tauri injects nonces/hashes for its own scripts. Never load remote content in the app window — a remote page with capability grants is remote code with native powers, and on Linux/Android Tauri cannot distinguish iframe requests from window requests.
- Enable the isolation pattern (`app.security.pattern: "isolation"`) if the frontend ever includes third-party JS at scale; it interposes a sandboxed iframe that can verify/deny IPC calls. Docs: https://tauri.app/security/
- For an app handling secrets: keep plaintext secret material in Rust memory only, pass it to the webview solely for explicit display/editing, and never persist it unencrypted.
- Secrets at rest: prefer the OS keychain via the `keyring` crate (Keychain/DPAPI/Secret Service) for small items like master keys and tokens; `tauri-plugin-stronghold` offers an encrypted database alternative but pulls in the IOTA Stronghold engine, so adopt it only if keychain plus our own encrypted files is insufficient. `tauri-plugin-store` is plaintext key-value storage — never for secrets.

## Error handling across IPC

- Commands return `Result<T, E>` where `E: Serialize`. Define one error enum per command-facing module with `thiserror`, and implement `Serialize` (or serialize a `{ kind, message }` shape) so the frontend gets structured, stable error data instead of a stringified `Debug`.
- Use `thiserror` in all library-style code. `anyhow` is acceptable only in `main.rs`/setup glue, never in domain modules and never across the IPC boundary.
- Never send raw underlying error text (paths, key material, OS details) to the frontend when it could leak sensitive context; map to deliberate variants.
- `unwrap()`/`expect()` are banned in production paths; they are acceptable only in tests and for truly infallible invariants with an `expect` message stating the invariant. Poisoned mutexes, missing files, and bad input are all `Result`s.

```rust
#[derive(Debug, thiserror::Error)]
pub enum CommandError {
    #[error("file not found: {0}")]
    NotFound(String),
    #[error("vault is locked")]
    VaultLocked,
}

impl serde::Serialize for CommandError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}
```

## Background and long-running work

- `async` commands already run on Tauri's async runtime (Tokio); that covers most needs. For fire-and-forget background tasks spawn with `tauri::async_runtime::spawn`, and for CPU-bound or blocking work (crypto KDFs, large file IO through sync APIs) use `tauri::async_runtime::spawn_blocking` so the runtime's worker threads stay free.
- Long-lived background tasks get an `AppHandle` clone (cheap by design) to emit events and read state; report progress via events or a stored `Channel`.

## Sidecars, CLI surface, and app lifecycle plugins

- Sidecar binaries: `bundle.externalBin` in `tauri.conf.json` bundles external executables (named with target-triple suffixes, e.g. `seal-cli-aarch64-apple-darwin`); spawn them via `tauri_plugin_shell`'s `app.shell().sidecar("name")`. This is how a companion CLI ships inside the app bundle. Docs: https://tauri.app/develop/sidecar/
- `tauri-plugin-cli`: parses command-line arguments passed to the app binary itself, letting the desktop app double as a CLI entry point.
- `tauri-plugin-single-instance`: guarantees one running instance and forwards the argv/cwd of subsequent launches to the running instance's callback — the standard way for a second invocation (or a CLI shim) to talk to the live app. Register it as the first plugin.
- `tauri-plugin-deep-link`: registers a custom URL scheme (`seal://...`) handled by the app; pairs with single-instance.
- `tauri-plugin-autostart`: launch at login. System tray: built into core (`tauri::tray::TrayIconBuilder`); combine with hiding the main window (and `ActivationPolicy::Accessory` on macOS) to run as a background/tray app — Tauri has no fully headless mode, but a tray app with no visible window is standard. Docs: https://tauri.app/learn/system-tray/
- A local API for external processes (editor plugins, CLIs) is plain Rust: bind an HTTP listener on `127.0.0.1` or a Unix domain socket from a `tauri::async_runtime::spawn` task inside `setup()` (e.g. with `axum`); Tauri imposes nothing here, so apply your own auth (token file, socket permissions). `tauri-plugin-localhost` exists only to serve the frontend over localhost and is a security downgrade — do not use it.

## Rust practices

- `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings` gate every merge; both run in CI and locally before commit. Fix lints, do not `#[allow]` them without a stated reason.
- Modules mirror domains (`vault`, `crypto`, `repo`, `ipc`), not layers-of-nothing (`utils`, `helpers`). One `mod.rs`-free style: `src/vault.rs` plus `src/vault/` submodules.
- Use newtypes for domain concepts (`struct RepoPath(PathBuf)`, `struct KeyId(String)`) instead of bare `String`/`PathBuf`, so signatures document themselves and mixups fail to compile.
- Function parameters borrow (`&str`, `&Path`, `&[u8]`); take owned `String`/`PathBuf` only when the function stores the value. Return owned types. Clone deliberately, not to silence the borrow checker; `Arc` shared read-mostly data.
- All secret material (passphrases, derived keys, decrypted plaintext) lives in `zeroize::Zeroizing<Vec<u8>>` or types deriving `ZeroizeOnDrop`, so buffers are wiped on drop; avoid copying secrets into `String`s, logs, or error messages.
- Logging goes through `tracing` (or `tauri-plugin-log`) with levels, never `println!`; log events and outcomes, never secret values or decrypted content, and treat log statements touching secret-adjacent code as review-blocking.
- Dependency hygiene: few, well-maintained, widely-used crates (serde, thiserror, tokio, zeroize, established crypto crates); every new dependency is justified in the PR. Pin via `Cargo.lock` (committed), and run `cargo audit`/`cargo deny` in CI. API design follows the Rust API Guidelines: https://rust-lang.github.io/api-guidelines/

## Testing

- Unit tests live next to the code in `#[cfg(test)] mod tests`; integration tests live in `src-tauri/tests/` and exercise the public API of domain modules.
- Because commands are thin wrappers, test the underlying functions directly — no Tauri runtime needed. When a test genuinely needs an app, use `tauri::test::mock_builder()` behind the `test` feature flag.
- On the frontend, `@tauri-apps/api/mocks` (`mockIPC`, `mockWindows`) fakes the IPC layer for component tests.
- E2E: `tauri-driver` provides WebDriver-based testing (Selenium/WebdriverIO) on Windows and Linux only — no macOS driver — so treat e2e as CI-on-Linux and keep coverage in Rust tests. Docs: https://tauri.app/develop/tests/

## Frontend conventions (Tauri-specific only)

- Never call `invoke()` inline in components. Wrap every command in one typed module (e.g. `src/lib/ipc.ts`) exporting `async function decryptFile(args: DecryptArgs): Promise<FileContents>`, with request/response types mirroring the Rust structs; the IPC surface is then greppable and typed in one place.
- The frontend holds secrets only transiently for display/editing, never in persistent stores (localStorage, IndexedDB, state persisted to disk); anything durable goes through a Rust command. Clipboard and logging of secret values are backend-mediated decisions, not frontend defaults.
