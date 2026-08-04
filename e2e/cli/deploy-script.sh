#!/bin/sh
set -eu

SEAL="${SEAL_BINARY:?SEAL_BINARY must point at the built seal binary}"
SECRET_FILE="${1:?a sealed file to resolve}"
PASSPHRASE_FILE="${2:?a file holding the password}"

API_KEY=""

# The capture-then-evaluate idiom the CLI plan documents. `source <(...)` is
# deliberately not used: it silently yields empty variables on the stock macOS
# shell, which would read as a Seal defect and is not one.
contents=$("$SEAL" resolve "$SECRET_FILE" --passphrase-fd 3 3<"$PASSPHRASE_FILE")
eval "$contents"

if [ -z "${API_KEY:-}" ]; then
  echo "the deploy script never received API_KEY" >&2
  exit 20
fi

printf 'deployed-with:%s' "$API_KEY"
