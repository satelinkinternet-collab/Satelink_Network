# Local Testing Guide

This guide explains how to test Satelink MVP locally without authentication friction.

> [!WARNING]
> **Zsh / Shell Users:**
> - Never use `<` or `>` characters in your commands (shell redirection).
> - Always double-quote URLs if they contain query strings or special characters: `"http://localhost..."`.
> - Use the `$` variable syntax for tokens: `$ADMIN_TOKEN`.

## 1. Quick Start (Dev Mode)

### A. Check Connectivity
Before testing, ensure the server is responding:
```bash
# 1. Check Health
curl -s http://localhost:8080/health | node -pe 'JSON.stringify(JSON.parse(fs.readFileSync(0)), null, 2)'

# 2. Check Port Usage (if connection fails)
lsof -nP -iTCP:8080 -sTCP:LISTEN
```

### B. Dev Tools
When you run `npm start` (or `./scripts/safe_start.sh`), the server prints **Copy-Paste** ready commands.

## 2. Minting Tokens

We have added special Dev-Only endpoints to mint valid JWTs valid for 7 days.

| Role | Wallet (Default) | Endpoint |
| :--- | :--- | :--- |
| **Admin** | `0xadmin` | `POST /__test/auth/admin/login` |
| **Node** | `0xnode` | `POST /__test/auth/node/login` |
| **Builder** | `0xbuilder` | `POST /__test/auth/builder/login` |

#### Example: Mint Admin Token
```bash
# Returns JSON with { token: "..." }
curl -s -X POST http://localhost:8080/__test/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0xadmin"}'
```

#### Example: Save to Variable
```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8080/__test/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0xadmin"}' | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).token')
```

## 3. Testing SSE Streams

> **NOTE:** `curl | head` closes the pipe early, which may cause a `User (23) Failed writing body` error.
> On macOS (`timeout` missing), use `curl --max-time`.

```bash
# Clean exit after 5 seconds (exits with code 28, ignored by || true)
curl --max-time 5 -N -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8080/stream/admin || true
```
*Expected Output:* `event: hello`, `event: ping`, `event: snapshot`... then exit.

## 4. Testing Pairing Flow (End-to-End)

This simulates the full Production flow:
1. **User** (Authenticated) requests a code.
2. **Device** (Public) confirms the code.

#### Step 1: Mint Token & Request Code
```bash
# 1. Get Node Token
NODE_TOKEN=$(curl -s -X POST http://localhost:8080/__test/auth/node/login \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0xnode"}' | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).token')

# 2. User Request -> Get Code
PAIR_CODE=$(curl -s -X POST http://localhost:8080/pair/request \
  -H "Authorization: Bearer $NODE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).pair_code')

echo "Generated Code: $PAIR_CODE"
```

#### Step 2: Device Confirm (Public)
The device sends the code and its unique ID to link.
```bash
curl -s -X POST http://localhost:8080/pair/confirm \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$PAIR_CODE\",\"device_id\":\"android_dev_001\"}"
```
*Expected:* `{"ok":true, "status":"LINKED", "owner_wallet":"0xnode"}`

#### Step 3: Check Status
```bash
curl -s "http://localhost:8080/pair/status/$PAIR_CODE"
```
*Expected:* `{"ok":true, "status":"LINKED", ...}`
