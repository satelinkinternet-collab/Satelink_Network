#!/bin/bash
set -e

echo "Running syntax checks..."
node --check server.js
node --check app_factory.mjs
node --check core/schema.js
node --check core/security.js
node --check core/heartbeat.js
node --check core/routes.js

echo "Running unit/E2E tests..."
npm run test:e2e
