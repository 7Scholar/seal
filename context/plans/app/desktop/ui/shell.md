Part of [the interface plan](README.md).

# Scope

The frontend's own shell: the page the webview loads, the build that produces it, and the typed module that wraps every command call. Out of scope: the screens themselves and their flows, which are the interface plan's other children.

# What exists

A placeholder page and nothing else. It exists for one reason: `generate_context!` resolves the configured frontend directory **at compile time** and fails the build when it is missing, so without something committed there a fresh clone cannot build the desktop crate at all. Verified by removing it — the build fails naming the missing path — and by cloning the repository clean and building successfully with it present.

# What is missing

Everything real: the Vite + React + TypeScript build, and the typed IPC module that wraps each command so the boundary is greppable and typed in one place rather than called inline from components.

# Steps

- [ ] Stand up the frontend build and repoint the desktop configuration at its output, replacing the placeholder.
- [ ] Write the typed command module mirroring the Rust surface, with the raw-bytes reveal handled distinctly from the JSON commands.
- [x] Confirm the strict content-security policy holds against the real build. Verified against a stock Vite React+TypeScript production build: it emits zero inline `<script>` and zero inline `<style>`, referencing external assets only, which `script-src 'self'` permits. A build configured to inline assets would break this, so inlining stays off.

# Open threads

- The reveal command returns raw bytes rather than JSON. The typed wrapper needs to expose that difference honestly rather than eagerly turning it into a string that lingers in interface memory.
