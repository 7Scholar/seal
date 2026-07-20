#!/usr/bin/env bash
set -euo pipefail

triple="$(rustc -vV | sed -n 's/^host: //p')"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cargo build --release -p seal-cli
mkdir -p "$root/src-tauri/binaries"
cp "$root/target/release/seal" "$root/src-tauri/binaries/seal-$triple"

echo "sidecar ready: src-tauri/binaries/seal-$triple"
