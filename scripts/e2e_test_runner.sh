#!/usr/bin/env bash
set -euo pipefail

echo "== Syntax check =="
node --check app_factory.mjs

echo "== Export check =="
node --input-type=module -e "import('./app_factory.mjs').then(m=>console.log('exports:',Object.keys(m))).catch(e=>{console.error(e);process.exit(1)})"

echo "== Mocha tests =="
npx mocha --timeout 15000 test/Security.test.js
npx mocha --timeout 15000 test/Heartbeat.test.js
