#!/usr/bin/env bash
# Gate 6: No JWT fallback values (env.js must hard-fail)
set -euo pipefail
FAIL=0
echo "🔒 [GATE 6] Verifying no JWT fallback values..."

# Check for fallback patterns like: JWT_SECRET || 'some-default'
if grep -rn "JWT_SECRET.*||.*['\"]" src/ --include="*.js" --include="*.ts" 2>/dev/null; then
  echo "❌ FAIL: JWT_SECRET fallback value detected — must hard-fail if missing"
  FAIL=1
fi

# Verify env.js throws on missing JWT_SECRET
if [ -f "src/config/env.js" ]; then
  if ! grep -q "throw\|process\.exit\|fatal\|FATAL" src/config/env.js 2>/dev/null; then
    echo "❌ FAIL: src/config/env.js does not hard-fail on missing JWT_SECRET"
    FAIL=1
  fi
fi

[ $FAIL -eq 0 ] && echo "✅ PASS: No JWT fallback values found" || exit 1
