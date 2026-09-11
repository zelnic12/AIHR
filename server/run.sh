#!/usr/bin/env bash
# Launch helper — clears the sandbox NODE_OPTIONS preload before starting.
unset NODE_OPTIONS
export PORT="${PORT:-3000}"
cd "$(dirname "$0")"
exec node src/index.js
