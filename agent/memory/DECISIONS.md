# DECISIONS

## 2026-02-22 — Agent scaffold implementation

### D-001: Shell scripts over Node for agent scripts
**Decision**: Use bash shell scripts for `agent-*.sh` instead of Node.js scripts.
**Reason**: Keeps tooling lightweight, no runtime required, readable in any terminal.
**Trade-off**: Less cross-platform (Windows), but repo targets Linux/macOS dev environments.

### D-002: Husky for Git hooks
**Decision**: Use husky for pre-commit/pre-push hooks.
**Reason**: Standard, well-maintained, integrates cleanly with npm lifecycle.
**Trade-off**: Adds a devDependency; devs must run `npm install` to activate hooks.

### D-003: Non-blocking lint/test in initial check script
**Decision**: `agent-check.sh` runs lint and tests in non-blocking mode initially.
**Reason**: Avoid breaking existing workflows while the scaffold is being established.
**Future**: Tighten to blocking once CI baseline is green.

### D-004: JWT_SECRET already enforced server-side
**Decision**: Do not add a second JWT_SECRET check in prod_guard middleware.
**Reason**: `server.js` already exits on startup if JWT_SECRET is missing or < 64 chars.
**Implication**: `agent-env-check.sh` will report status but not re-enforce.

### D-005: ESM project — scripts use `node --input-type=module` where needed
**Decision**: Agent scripts stay as bash; any Node snippets inside them use explicit flags.
**Reason**: Project is `"type": "module"` which affects `.js` file execution context.

## ADR-005: Satelink is an Autonomous Economic Protocol, not just DePIN
* Date: April 2026
* Status: Accepted — foundational architectural decision
* Decision: Primary revenue source is machine-to-machine autonomous calls.
  Human usage is welcome but never required or targeted.
* Layers: 9 protocol layers must all reach STATUS:DONE for full product
* Implication: Every feature built must serve at least one of L1-L9
* Anti-pattern: Any feature that requires human sales to generate revenue
  is deprioritized until all 9 layers are operational
