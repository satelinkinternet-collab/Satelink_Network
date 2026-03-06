#!/bin/bash
set -e

# Load environment variable DB_URL if exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs -0) 2>/dev/null || true
fi

DB_URL=${DB_URL:-"sqlite"}

if [[ "$DB_URL" == *"postgres"* ]]; then
  echo "Resetting Postgres database..."
  # Depending on the application, we can use psql to recreate schema:
  # psql $DB_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  # Alternatively, try to run existing reset scripts:
  npm run db:reset:pg 2>/dev/null || echo "Ensure pg schema is dropped and recreated."
else
  echo "Resetting SQLite database..."
  rm -f satelink.db satelink.db-journal
  echo "SQLite DB removed."
fi
