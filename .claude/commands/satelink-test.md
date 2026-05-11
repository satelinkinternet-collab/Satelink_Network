# /satelink-test
Runs all test suites and reports results.

Steps:
1. forge test -vv (smart contracts)
2. npm test (backend)
3. cd web && npm run build (frontend build check)
4. bash scripts/smoke_test.sh (if server is running)
5. Print summary: X passed, Y failed per suite
