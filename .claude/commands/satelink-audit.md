# /satelink-audit
Runs all 6 security gate scripts and reports pass/fail.

Steps:
1. Run scripts/security/check-secrets.sh
2. Run scripts/security/check-test-endpoints.sh
3. Run scripts/security/check-sqlite.sh
4. Run scripts/security/check-auth-middleware.sh
5. Run scripts/security/check-hardcoded-keys.sh
6. Run scripts/security/check-jwt-fallback.sh
7. Print PASS/FAIL per check and overall result
8. If any FAIL: print exact file + line, do NOT proceed with deployment
