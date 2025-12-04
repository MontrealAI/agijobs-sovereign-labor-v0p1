#!/usr/bin/env bash
set -euo pipefail

unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy NO_PROXY no_proxy

TRUFFLE_TELEMETRY_DISABLED=1 truffle test --network development --migrate-none --compile-none
