# /audit

Run the AUDIT capability from .claude/skills/satelink/SKILL.md

## Steps

1. Read agent/memory/PROGRESS.md and agent/memory/CURRENT_TASK.md first

2. Check for async/await bugs (P0 — silent data corruption):
   ```
   grep -rn "db\.query\|db\.run\|db\.get\|db\.all" --include="*.js" --include="*.mjs" src/ apps/ | grep -v "await"
   ```
   FAIL if any match found.

3. Check for SQLite references (migration complete):
   ```
   grep -rn "sqlite\|better-sqlite" --include="*.js" --include="*.mjs" src/ apps/
   ```
   FAIL if found — Satelink uses PostgreSQL only.

4. Check for hardcoded secrets:
   ```
   grep -rn "sk_live\|pk_live" --include="*.js" src/ apps/
   ```
   FAIL if real secrets found.

5. Run security gate scripts:
   - scripts/security/check-secrets.sh
   - scripts/security/check-test-endpoints.sh
   - scripts/security/check-sqlite.sh
   - scripts/security/check-auth-middleware.sh
   - scripts/security/check-hardcoded-keys.sh
   - scripts/security/check-jwt-fallback.sh

6. Report PASS/FAIL per check with file:line for failures.

## Anti-patterns (REJECT)
- Skipping PROGRESS.md read
- Deploying with any FAIL status
- Using --no-verify to bypass checks
