#!/bin/sh
set -eu

REPOSITORY="${SEAL_REPOSITORY:-7scholar/seal}"
VERSION="${SEAL_VERSION:-latest}"
INSTALL_DIR="${SEAL_INSTALL_DIR:-}"

say() {
  echo "seal: $1" >&2
}

die() {
  say "$1"
  exit 1
}

need() {
  command -v "$1" >/dev/null 2>&1 || die "this installer needs $1, which is not on your path."
}

detect_triple() {
  os="$(uname -s)"
  arch="$(uname -m)"

  case "$os" in
    Darwin)
      case "$arch" in
        arm64) echo "aarch64-apple-darwin" ;;
        x86_64) echo "x86_64-apple-darwin" ;;
        *) die "unsupported macOS architecture: $arch" ;;
      esac
      ;;
    Linux)
      case "$arch" in
        aarch64 | arm64) echo "aarch64-unknown-linux-gnu" ;;
        x86_64) echo "x86_64-unknown-linux-gnu" ;;
        *) die "unsupported Linux architecture: $arch" ;;
      esac
      ;;
    *)
      die "unsupported operating system: $os. Build from source instead — see https://github.com/$REPOSITORY"
      ;;
  esac
}

choose_directory() {
  if [ -n "$INSTALL_DIR" ]; then
    echo "$INSTALL_DIR"
    return
  fi

  for candidate in "$HOME/.local/bin" "/usr/local/bin"; do
    if [ -d "$candidate" ] && [ -w "$candidate" ]; then
      echo "$candidate"
      return
    fi
  done

  echo "$HOME/.local/bin"
}

verify() {
  tarball="$1"
  expected="$2"

  if command -v shasum >/dev/null 2>&1; then
    actual="$(shasum -a 256 "$tarball" | cut -d' ' -f1)"
  elif command -v sha256sum >/dev/null 2>&1; then
    actual="$(sha256sum "$tarball" | cut -d' ' -f1)"
  else
    say "warning: no checksum tool is available, so the download was not verified."
    return
  fi

  [ "$actual" = "$expected" ] || die "the download does not match its published checksum. Refusing to install."
}

need curl
need tar

triple="$(detect_triple)"

if [ "$VERSION" = "latest" ]; then
  base="https://github.com/$REPOSITORY/releases/latest/download"
else
  base="https://github.com/$REPOSITORY/releases/download/v${VERSION#v}"
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

say "downloading seal for $triple"
curl -fsL "$base/seal-$triple.tar.gz" -o "$work/seal.tar.gz" 2>/dev/null \
  || die "could not download seal for $triple. Check that a release exists at https://github.com/$REPOSITORY/releases"

if curl -fsSL "$base/SHA256SUMS" -o "$work/SHA256SUMS" 2>/dev/null; then
  expected="$(grep " seal-$triple.tar.gz\$" "$work/SHA256SUMS" | cut -d' ' -f1 || true)"
  if [ -n "$expected" ]; then
    verify "$work/seal.tar.gz" "$expected"
    say "checksum verified"
  else
    say "warning: the checksum file lists no entry for $triple; skipping verification."
  fi
else
  say "warning: no checksum file was published; skipping verification."
fi

tar xzf "$work/seal.tar.gz" -C "$work"
[ -f "$work/seal" ] || die "the downloaded archive did not contain a seal binary."
chmod +x "$work/seal"

directory="$(choose_directory)"
mkdir -p "$directory" || die "could not create $directory"

if [ ! -w "$directory" ]; then
  die "$directory is not writable. Re-run with SEAL_INSTALL_DIR set to somewhere you can write, or use sudo."
fi

mv "$work/seal" "$directory/seal"

say "installed $("$directory/seal" --version) to $directory/seal"

case ":$PATH:" in
  *":$directory:"*) ;;
  *)
    say ""
    say "$directory is not on your PATH. Add this to your shell profile:"
    say ""
    say "    export PATH=\"$directory:\$PATH\""
    ;;
esac
