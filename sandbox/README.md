# Satelink MVP - Hardening Sandbox

This directory contains a mirrored environment for testing production hardening changes without affecting the root codebase.

## Workflow

1.  **Modify**: Apply changes to files in `sandbox/`.
2.  **Test**: Run `npm run self:test` to verify changes.
3.  **Heal**: Run `npm run self:heal` for remediation guidance.
4.  **Promote**: Once satisfied, apply changes to the root directory.

## Tools

-   `tools/self_test.js`: Static and runtime verification.
-   `tools/self_heal.js`: Diagnostic and auto-remediation guidance.
-   `src/ops-agent/triage.js`: Rules-based incident triage.
