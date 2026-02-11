#!/bin/bash

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Try Cloudflare Tunnel first
if command_exists cloudflared; then
  echo "Starting Cloudflare Tunnel..."
  # Run in background and capture output to find URL
  cloudflared tunnel --url http://localhost:8080 > cloudflared.log 2>&1 &
  PID=$!
  sleep 5
  URL=$(grep -o 'https://[^ ]*\.trycloudflare\.com' cloudflared.log | head -n 1)
  
  if [ -n "$URL" ]; then
    echo "WEBHOOK_BASE_URL=$URL"
    echo "MOONPAY_WEBHOOK_URL=$URL/webhooks/moonpay"
    echo "FUSE_WEBHOOK_URL=$URL/webhooks/fuse"
    # Keep it running
    wait $PID
    exit 0
  fi
fi

# Try ngrok fallback
if command_exists ngrok; then
  echo "Starting ngrok..."
  # We can't easily capture ngrok URL from CLI without API, so we'll start it and ask user to check UI
  # Or use curl to local API if available
  ngrok http 8080 > /dev/null &
  sleep 3
  URL=$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok[^"]*')
  
  if [ -n "$URL" ]; then
    echo "WEBHOOK_BASE_URL=$URL"
    echo "MOONPAY_WEBHOOK_URL=$URL/webhooks/moonpay"
    echo "FUSE_WEBHOOK_URL=$URL/webhooks/fuse"
    wait
    exit 0
  fi
fi

echo "Neither 'cloudflared' nor 'ngrok' found or failed to start."
echo "Please install one of them to expose webhooks:"
echo "  brew install cloudflare/cloudflare/cloudflared"
echo "  OR"
echo "  brew install ngrok/ngrok/ngrok"
exit 1
