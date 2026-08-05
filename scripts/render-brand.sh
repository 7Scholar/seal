#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_svg="$root/site/public/favicon.svg"
icons="$root/src-tauri/icons"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

if [[ ! -f "$source_svg" ]]; then
  echo "missing $source_svg" >&2
  exit 1
fi

if ! command -v qlmanage >/dev/null 2>&1; then
  echo "render-brand.sh needs qlmanage, which exists only on macOS." >&2
  echo "The rendered icons are committed, so this is only needed when the mark changes." >&2
  exit 1
fi

cp "$source_svg" "$work/icon.svg"

render() {
  local size="$1" out="$2"
  rm -f "$work/icon.svg.png"
  qlmanage -t -s "$size" -o "$work" "$work/icon.svg" >/dev/null 2>&1
  if [[ ! -f "$work/icon.svg.png" ]]; then
    echo "render failed at ${size}px" >&2
    exit 1
  fi
  mv "$work/icon.svg.png" "$out"
}

render 32 "$icons/32x32.png"
render 128 "$icons/128x128.png"
render 256 "$icons/128x128@2x.png"
cp "$icons/128x128@2x.png" "$icons/256x256.png"
render 512 "$icons/512x512.png"
cp "$icons/512x512.png" "$icons/icon.png"

echo "rendered $icons from ${source_svg#"$root"/}"
