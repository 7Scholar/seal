#!/usr/bin/env bash
set -euo pipefail

version="${1:-}"
directory="${2:-}"
repository="${SEAL_REPOSITORY:-7scholar/seal}"

if [ -z "$version" ] || [ -z "$directory" ]; then
  echo "usage: render-formula.sh <version> <directory-of-tarballs>" >&2
  exit 2
fi

checksum() {
  local triple="$1"
  local tarball="$directory/seal-$triple.tar.gz"

  if [ ! -f "$tarball" ]; then
    echo "missing tarball for $triple: $tarball" >&2
    exit 1
  fi

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$tarball" | cut -d' ' -f1
  else
    sha256sum "$tarball" | cut -d' ' -f1
  fi
}

url() {
  echo "https://github.com/$repository/releases/download/v$version/seal-$1.tar.gz"
}

cat <<FORMULA
class Seal < Formula
  desc "Encrypt the secret files in your repositories in place"
  homepage "https://github.com/$repository"
  license any_of: ["MIT", "Apache-2.0"]

  on_macos do
    on_arm do
      url "$(url aarch64-apple-darwin)"
      sha256 "$(checksum aarch64-apple-darwin)"
    end
    on_intel do
      url "$(url x86_64-apple-darwin)"
      sha256 "$(checksum x86_64-apple-darwin)"
    end
  end

  on_linux do
    on_arm do
      url "$(url aarch64-unknown-linux-gnu)"
      sha256 "$(checksum aarch64-unknown-linux-gnu)"
    end
    on_intel do
      url "$(url x86_64-unknown-linux-gnu)"
      sha256 "$(checksum x86_64-unknown-linux-gnu)"
    end
  end

  def install
    bin.install "seal"
  end

  test do
    plaintext = testpath/"secret.env"
    plaintext.write "TOKEN=value\n"
    assert_match "plaintext", shell_output("#{bin}/seal status #{plaintext}", 5)
  end
end
FORMULA
