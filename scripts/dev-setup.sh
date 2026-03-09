#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Satelink Developer Setup ===${NC}"

# 1. Check for .env file
if [ ! -f .env ]; then
    echo -e "${BLUE}Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}Created .env file.${NC}"
else
    echo -e "${GREEN}.env file already exists.${NC}"
fi

# 2. Ensure data directory exists for SQLite (if used)
mkdir -p data

# 3. Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# 4. Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "\033[0;31mError: Docker is not running. Please start Docker and try again.\033[0m"
    exit 1
fi

echo -e "${GREEN}Setup complete! Run 'make dev' to start the platform.${NC}"
