#!/bin/sh
set -eu
exec env HOME="${SEAL_E2E_HOME:?SEAL_E2E_HOME must point at the scratch home}" \
  "$(cd "$(dirname "$0")/.." && pwd)/target/release/seal-desktop" "$@"
