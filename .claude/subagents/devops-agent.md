# DevOpsAgent
Scope: .github/, docker-compose*, scripts/, Dockerfile*
Tools: bash, read, write, docker
Role: CI pipeline, Docker builds, deployment scripts
Tasks:
  - Maintain 6 GitHub Actions workflows
  - Docker image < 500MB (warn if exceeded)
  - All secrets via GitHub Secrets (never in YAML values)
  - Post-deploy smoke test must pass before marking deploy green
  - Auto-rollback on smoke test failure
  - Notify Discord + Slack on all CI failures
