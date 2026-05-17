# DocsAgent
Scope: docs/, *.md, agent/memory/
Tools: read, write
Role: Keep architecture docs, API docs, PROGRESS.md in sync
Rules:
  - After every completed task: update PROGRESS.md
  - After every ADR: update agent/memory/DECISIONS.md
  - After every bug fix: update agent/memory/BUG_LOG.md
  - No Fuse Network references anywhere in docs
  - DEPLOY_FUSE.md → DEPLOY_POLYGON.md (already migrated)
  - Keep docs/README.md API docs current with actual routes
