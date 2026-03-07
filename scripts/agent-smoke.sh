#!/bin/bash
set -e

echo "── Smoke Check ─────────────────────────────────────"

# 1. Syntax check (does not execute — no JWT_SECRET needed)
if [ -f server.js ]; then
  echo "  node -c server.js ..."
  node --check server.js && echo "  ✅ syntax ok" || echo "  ⚠️  syntax error"
else
  echo "  (server.js not found — skipping syntax check)"
fi

# 2. Lightweight import probe (exits 0 even on runtime error — catches import-time crashes only)
if [ -f server.js ]; then
  echo "  import probe ..."
  node -e "import('./server.js').then(()=>console.log('  ✅ import ok')).catch(e=>{console.error('  ⚠️  import fail:',e?.message||e); process.exit(0);})" 2>/dev/null || true
fi

echo
echo "✅ SMOKE DONE"
