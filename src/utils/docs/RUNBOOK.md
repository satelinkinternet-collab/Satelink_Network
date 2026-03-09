# Satelink Operations Runbook

## 🚨 Emergency Procedures

### 1. Emergency Lockdown
**Trigger**: 
- Validated Security Breach
- Uncontrolled Treasury Drain
- Integrity Check Failure

**Action**:
1. Go to **Admin > Control Room**.
2. Click **Emergency Lockdown**.
3. Confirm with Reason.
4. Verify: "Withdrawals Paused" and "Safe Mode" active.

**Recovery**:
1. Resolve root cause (patch code, ban user).
2. Verify Ledger Integrity via **Admin > Economics > Ledger**.
3. Run **Full Restore Drill** to ensure clean state availability.
4. Use **Admin > Control Room** to "Resume Operations" (lifts Safe Mode).

---

### 2. Wallet Compromise (Admin)
**Trigger**: 
- Admin API Key leak
- Suspicious Admin Activity

**Action**:
1. Identify comprised wallet address.
2. Use `POST /admin/wallets/rotate` (via curl or Super Admin console).
   ```bash
   curl -X POST https://api.satelink.network/admin/wallets/rotate \
     -H "Authorization: Bearer <SUPER_TOKEN>" \
     -d '{"old_wallet":"<COMPROMISED>", "new_wallet":"<NEW>", "role":"admin_ops"}'
   ```
3. Rotate JWT Secret (Requires redeploy).

---

## 🛠 Standard Operating Procedures

### 1. Daily Backup Verification
**Frequency**: Daily
**Steps**:
1. Go to **Admin > System > Backups**.
2. Click **Verify** on the latest backup.
3. Ensure Checksum matches and Status is GREEN.

### 2. Pre-Payout Checks (Preflight)
**Frequency**: Before enabling real-money epochs
**Steps**:
1. Go to **Admin > Preflight Gate**.
2. Must show: **SYSTEM READY FOR FLIGHT** (Green).
3. If RED: Resolve blockers (Drills, Incidents) before proceeding.

### 3. Handling Abuse Incidents
**Trigger**: Abuse Firewall Alert
**Steps**:
1. Go to **Admin > Diagnostics > Incidents**.
2. Review automated incident report.
3. If valid: **Ban User** via Incident Action.
4. If false positive: **Adjust Firewall Rules**.

---

## 📉 Disaster Recovery

### Full System Restore
**Scenario**: Database Corruption or Total Loss
**Steps**:
1. Stop API Server.
2. Locate latest verified backup in `/backups/`.
3. Copy `satelink.db` from backup to root.
4. Start API Server in **Safe Mode** (`SAFE_MODE=1 npm start`).
5. Run **Economic Integrity Self-Test**.
6. If Pass: Resume Normal Operations.
