#!/bin/bash
# Wrapper script for Satelink Staging Deployment
# Usage: ./deploy.sh

# Resolve project root
PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

echo "🚀 Invoking Project Deployment Script..."
echo "Project Root: $PROJECT_ROOT"

cd "$PROJECT_ROOT" || exit 1
./scripts/deploy_staging.sh
