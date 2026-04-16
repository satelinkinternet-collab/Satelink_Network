#!/usr/bin/env bash
# Gate 1: No hardcoded secrets or private keys in source
set -euo pipefail
FAIL=0
echo "🔒 [GATE 1] Scanning for hardcoded secrets..."

# Check for private key patterns
if grep -rn "0x[0-9a-fA-F]\{64\}" src/ contracts/ web/src/ --include="*.js" --include="*.ts" --include="*.sol" 2>/dev/null | grep -v "//\|test\|mock\|example\|placeholder"; then
  echo "❌ FAIL: Potential private key found in source code"
  FAIL=1
fi

# Check for literal JWT secrets
if grep -rn "jwt_secret\|JWT_SECRET\s*=\s*['\"][^'\"]\{8,\}" src/ web/src/ --include="*.js" --include="*.ts" 2>/dev/null | grep -v "process\.env"; then
  echo "❌ FAIL: Hardcoded JWT secret detected"
  FAIL=1
fi

# Check for token.txt in tracked files
if git ls-files | grep -i "token\.txt\|secret\.txt\|private\.key" 2>/dev/null; then
  echo "❌ FAIL: Sensitive file tracked in git"
  FAIL=1
fi

[ $FAIL -eq 0 ] && echo "✅ PASS: No hardcoded secrets found" || exit 1
