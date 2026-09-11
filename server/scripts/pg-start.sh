#!/usr/bin/env bash
# Start a local PostgreSQL 15 cluster for development/testing in this sandbox.
# Idempotent: initialises the cluster on first run, then starts it if not running.
set -e
PGDATA=/var/lib/pgsql/15/data
SOCK=/var/run/postgresql

mkdir -p "$SOCK" && chown postgres:postgres "$SOCK" 2>/dev/null || true

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  su postgres -c "/usr/bin/initdb -D $PGDATA -U postgres --auth=trust -E UTF8" >/dev/null
fi

if ! su postgres -c "/usr/bin/pg_ctl -D $PGDATA status" >/dev/null 2>&1; then
  su postgres -c "/usr/bin/pg_ctl -D $PGDATA -l $PGDATA/log/manual.log \
    -o '-p 5432 -k $SOCK -c listen_addresses=127.0.0.1' -w -t 30 start" >/dev/null
fi

# Ensure the app database exists.
su postgres -c "psql -h 127.0.0.1 -U postgres -tc \"SELECT 1 FROM pg_database WHERE datname='voltedge'\"" \
  | grep -q 1 || su postgres -c "psql -h 127.0.0.1 -U postgres -c 'CREATE DATABASE voltedge'" >/dev/null

echo "PostgreSQL is up on 127.0.0.1:5432 (db: voltedge)"
