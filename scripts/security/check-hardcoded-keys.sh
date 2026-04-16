#!/usr/bin/env bash
# Gate 5: No hardcoded API keys
set -euo pipefail
FAIL=0
echo "🔒 [GATE 5] Scanning for hardcoded API keys..."

# Common API key patterns
PATTERNS=(
  "sk_live_[a-zA-Z0-9]"
  "sk_test_[a-zA-Z0-9]"
  "AKIA[0-9A-Z]{16}"
  "moonpay_sk_"
  "nodeops_key_"
)

for pattern in "${PATTERNS[@]}"; do
  if grep -rn "$pattern" src/ web/src/ --include="*.js" --include="*.ts" 2>/dev/null | grep -v "process\.env\|//\|example"; then
    echo "❌ FAIL: Hardcoded API key pattern '$pattern' found"
    FAIL=1
  fi
done

[ $FAIL -eq 0 ] && echo "✅ PASS: No hardcoded API keys found" || exit 1
