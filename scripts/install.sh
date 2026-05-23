#!/bin/bash
# Satelink Node Agent — Quick Install Script
# Usage: curl -fsSL https://satelink.network/install.sh | bash
#
# This script installs the Satelink node agent on Linux (Debian/Ubuntu).
# For other platforms or manual install, see: docs.satelink.network/node-setup

set -euo pipefail

AGENT_VERSION="${SATELINK_VERSION:-latest}"
NODE_AGENT_PKG="@satelink/node-agent"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Satelink Node Agent Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for root
if [[ $EUID -eq 0 ]]; then
    echo "[WARN] Running as root. Will install globally."
fi

# Check OS
if [[ ! -f /etc/debian_version ]]; then
    echo "[WARN] This script is optimized for Debian/Ubuntu."
    echo "       Other distros may require manual adjustments."
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[INFO] Node.js not found. Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_VERSION -lt 18 ]]; then
        echo "[ERROR] Node.js 18+ required. Found: $(node -v)"
        echo "        Run: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
        exit 1
    fi
    echo "[OK] Node.js $(node -v) detected"
fi

# Install agent
echo ""
echo "[INFO] Installing Satelink node agent..."
if [[ $EUID -eq 0 ]]; then
    npm install -g "$NODE_AGENT_PKG@$AGENT_VERSION"
else
    sudo npm install -g "$NODE_AGENT_PKG@$AGENT_VERSION"
fi

# Verify installation
if ! command -v satelink-node &> /dev/null; then
    echo "[ERROR] Installation failed. 'satelink-node' command not found."
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ Satelink Node Agent installed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo ""
echo "  1. Register your node:"
echo "     satelink-node register --wallet 0xYOUR_WALLET --region us-east-1"
echo ""
echo "  2. Start the agent:"
echo "     satelink-node start"
echo ""
echo "  3. Check status:"
echo "     satelink-node status"
echo ""
echo "Docs: https://docs.satelink.network/node-setup"
echo "Support: https://discord.gg/satelink"
echo ""
