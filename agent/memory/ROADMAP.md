# ROADMAP

## Phase 1 – Agentic Workflow Foundation ✅ (in progress)
- [x] Inspect repo structure
- [x] Create agent/memory, agent/prompts, .vscode directories
- [x] Create memory files (CURRENT_TASK, ROADMAP, DECISIONS, BUG_LOG)
- [ ] Create agent scripts (agent-delta, agent-env-check, agent-check, agent-report)
- [ ] Add VS Code tasks.json + settings.json
- [ ] Add Git hooks (pre-commit, pre-push via husky)
- [ ] Add GitHub Actions CI (.github/workflows/ci.yml)
- [ ] Add production guard middleware

## Phase 2 – Observability
- [ ] Structured logging integration
- [ ] Alert routing for critical errors

## Phase 3 – Self-Healing
- [ ] Automated incident builder integration
- [ ] Retention cleaner scheduling

## Phase 4 – Deployment Hardening
- [ ] Docker-based CI verification
- [ ] Staging → Production promotion gate
