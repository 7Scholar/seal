#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

say() {
  echo "seal: $1" >&2
}

say "building the interface"
bun run build

say "building the desktop binary"
cargo build --release --manifest-path src-tauri/Cargo.toml --features custom-protocol

say "building the command-line binary"
cargo build --release -p seal-cli

launcher="$(command -v seal || true)"
if [ -n "$launcher" ]; then
  resolved="$(readlink -f "$launcher" 2>/dev/null || python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$launcher")"
  beside="$(dirname "$resolved")/seal-desktop"
  if [ ! -f "$beside" ]; then
    say "warning: $launcher resolves to $resolved, which has no seal-desktop beside it."
    say "warning: 'seal open' will fall back to an installed copy, not this build."
  fi
fi

say "updated $("$root/target/release/seal" --version)"
