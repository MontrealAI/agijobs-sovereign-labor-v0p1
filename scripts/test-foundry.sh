#!/usr/bin/env bash
set -euo pipefail

FOUNDRY_BIN="$HOME/.foundry/bin"

if ! command -v forge >/dev/null 2>&1; then
  echo "forge not found; installing Foundry toolchain..." >&2
  curl -L https://foundry.paradigm.xyz | bash
fi

export PATH="$FOUNDRY_BIN:$PATH"

# Ensure the toolchain is available before running tests.
if [ -x "$FOUNDRY_BIN/foundryup" ]; then
  "$FOUNDRY_BIN/foundryup" --install stable
fi

forge --version
forge test "$@"
