#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# load env file
set -a
source .env.live
set +a

# ensure defaults
: "${PORT:=8080}"
