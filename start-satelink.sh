#!/bin/bash
# SATELINK — ONE CLICK LOCAL STACK STARTUP
# Usage: chmod +x start-satelink.sh && ./start-satelink.sh

GREEN='\033[0;32m'; AMBER='\033[0;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "\n${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  SATELINK LOCAL STACK — STARTING     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}\n"

# Fix npm PATH
export PATH="$HOME/.npm-global/bin:$PATH"

# Check Node
NODE_VER=$(node --version 2>/dev/null || echo "MISSING")
[[ "$NODE_VER" == "MISSING" ]] && echo -e "${RED}ERROR: Node not found${NC}" && exit 1
echo -e "${GREEN}✓ Node $NODE_VER${NC}"

# Start PostgreSQL if not running
echo -e "${AMBER}Checking PostgreSQL...${NC}"
if ! pg_isready -U "$(whoami)" -q 2>/dev/null; then
  brew services start postgresql@16 2>/dev/null || \
  pg_ctl -D /opt/homebrew/var/postgresql@16 start 2>/dev/null || \
  pg_ctl -D /usr/local/var/postgresql@16 start 2>/dev/null
  sleep 2
fi
pg_isready -U "$(whoami)" -q && echo -e "${GREEN}✓ PostgreSQL running${NC}" || echo -e "${AMBER}⚠ Postgres may not be running${NC}"

# Ensure DB exists
psql -U "$(whoami)" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw paperclip_prod || \
  (createdb -U "$(whoami)" paperclip_prod && echo -e "${GREEN}✓ Created paperclip_prod${NC}")
echo -e "${GREEN}✓ paperclip_prod exists${NC}"

# Clear port 8080
PIDS=$(lsof -ti:8080 2>/dev/null || true)
[[ -n "$PIDS" ]] && echo "$PIDS" | xargs kill -9 2>/dev/null && sleep 1
echo -e "${GREEN}✓ Port 8080 clear${NC}"

# Fix permissions
chmod -R 755 /Users/pradeepjakuraa/satelink 2>/dev/null && echo -e "${GREEN}✓ Permissions OK${NC}"

# Start Paperclip
echo -e "\n${GREEN}Starting Paperclip at localhost:8080...${NC}\n"
export DATABASE_URL="postgresql://$(whoami)@localhost:5432/paperclip_prod"

if command -v paperclipai &>/dev/null; then
  DATABASE_URL="postgresql://$(whoami)@localhost:5432/paperclip_prod" paperclipai run
else
  DATABASE_URL="postgresql://$(whoami)@localhost:5432/paperclip_prod" npx paperclipai@latest run
fi
