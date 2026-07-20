Part of [the interface plan](README.md).

# Scope

The frontend's own shell: the page the webview loads, the build that produces it, and the typed module that wraps every command call. Out of scope: the screens themselves and their flows, which are the interface plan's other children.

# What exists

The Vite + React + TypeScript build, and the typed IPC module wrapping every command so the boundary is typed and greppable in one place rather than invoked inline from components.

Two shapes in that module were verified against the real serialised output rather than assumed, and both were wrong on the first pass: the opened-file discriminant is lower-cased by the serialiser, and a revealed value arrives as bytes. The wrapper therefore returns bytes and leaves decoding to the point of display, rather than eagerly producing a string that lingers in module scope.

`generate_context!` resolves the configured frontend directory **at compile time** and fails the build when it is missing, so the build must produce it before the Rust crate compiles — which is what the configured before-build command does.

# What is missing

Nothing on this plan. The screens themselves are the interface plan's remaining children.

# Steps

- [x] Stand up the frontend build and repoint the desktop configuration at its output, replacing the placeholder.
- [x] Write the typed command module mirroring the Rust surface, with the raw-bytes reveal handled distinctly from the JSON commands.
- [x] Confirm the strict content-security policy holds against the real build. Verified against a stock Vite React+TypeScript production build: it emits zero inline `<script>` and zero inline `<style>`, referencing external assets only, which `script-src 'self'` permits. A build configured to inline assets would break this, so inlining stays off.

# Open threads

None.
