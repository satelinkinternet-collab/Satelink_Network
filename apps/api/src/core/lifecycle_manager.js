import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';

export class LifecycleManager {
    constructor(db) {
        this.db = db;
    }

    /**
     * O1: Start a generic setup session for a user.
     * Generates a short pairing code.
     */
    async startSetupSession(ownerWallet) {
        const setupId = uuidv4();
        // 6-digit generic code for manual entry
        const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

        await this.db.query(`
            INSERT INTO node_setup_sessions (setup_id, owner_wallet, pairing_code, status, created_at, expires_at)
            VALUES (?, ?, ?, 'pending', ?, ?)
        `, [setupId, ownerWallet, pairingCode, Date.now(), expiresAt]);

        return {
            setup_id: setupId,
            pairing_code: pairingCode,
            expires_at: expiresAt,
            install_commands: [
                `curl -sL https://satelink.network/install.sh | bash`,
                `satelink setup --code ${pairingCode}`
            ]
        };
    }

    /**
     * O2: Secure Node Pairing
     * Node signs "pair:<code>:<timestamp>" to prove ownership of wallet.
     */
    async pairNode({ node_wallet, pairing_code, signature, timestamp }) {
        // 1. Validate Input
        if (!node_wallet || !pairing_code || !signature || !timestamp) {
            throw new Error("Missing pairing data");
        }

        // 2. Validate Timestamp (prevent replay) - 5 min window
        if (Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
            throw new Error("Stale timestamp");
        }

        // 3. Find Session
        const session = await this.db.get(
            "SELECT * FROM node_setup_sessions WHERE pairing_code = ? AND status = 'pending'",
            [pairing_code]
        );

        if (!session) throw new Error("Invalid or expired pairing code");
        if (Date.now() > session.expires_at) throw new Error("Pairing code expired");

        // 4. Verify Signature
        // Message format: "pair:<code>:<timestamp>"
        const message = `pair:${pairing_code}:${timestamp}`;
        let recovered;
        try {
            recovered = ethers.verifyMessage(message, signature);
        } catch (e) {
            throw new Error("Invalid signature format");
        }

        if (recovered.toLowerCase() !== node_wallet.toLowerCase()) {
            throw new Error("Signature does not match node wallet");
        }

        // 5. Execute Pairing (Transactional)
        const now = Date.now();

        // A. Mark session paired
        await this.db.query(
            "UPDATE node_setup_sessions SET status = 'paired' WHERE setup_id = ?",
            [session.setup_id]
        );

        // B. Record Ownership
        await this.db.query(`
            INSERT INTO node_ownership (node_id, owner_wallet, paired_at)
            VALUES (?, ?, ?)
            ON CONFLICT(node_id) DO UPDATE SET
                owner_wallet = excluded.owner_wallet,
                paired_at = excluded.paired_at,
                revoked_at = NULL
        `, [node_wallet, session.owner_wallet, now]);

        // C. Ensure Node Record Exists (Legacy compat)
        // We use node_wallet as node_id usually
        const existingNode = await this.db.get("SELECT 1 FROM nodes WHERE node_id = ?", [node_wallet]);
        if (!existingNode) {
            await this.db.query(`
                INSERT INTO nodes (node_id, wallet, device_type, status, created_at, last_seen)
                VALUES (?, ?, 'manual_paired', 'active', ?, ?)
            `, [node_wallet, node_wallet, now, now]);
        } else {
            await this.db.query("UPDATE nodes SET wallet = ?, status = 'active' WHERE node_id = ?", [node_wallet, node_wallet]);
        }

        return {
            status: 'paired',
            owner_wallet: session.owner_wallet,
            node_id: node_wallet
        };
    }

    /**
     * O3: Process Diagnostic Bundle
     */
    async processDiagBundle(nodeId, bundle) {
        // Redact secrets before storage
        const redacted = this._redactBundle(bundle);

        await this.db.query(`
            INSERT INTO node_diag_bundles (node_id, bundle_json, created_at)
            VALUES (?, ?, ?)
        `, [nodeId, JSON.stringify(redacted), Date.now()]);

        // O4: Trigger Remediation Analysis
        await this._analyzeForRemediation(nodeId, redacted);

        return { stored: true };
    }

    _redactBundle(bundle) {
        const str = JSON.stringify(bundle);
        // Simple regex redaction for keys/secrets
        const redactedStr = str
            .replace(/0x[a-fA-F0-9]{64}/g, '0xREDACTED_KEY')
            .replace(/eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g, 'JWT_REDACTED');
        return JSON.parse(redactedStr);
    }

    async _analyzeForRemediation(nodeId, bundle) {
        // Simple rules engine
        const suggestions = [];

        // 1. High CPU
        if (bundle.cpu_load && bundle.cpu_load > 90) {
            suggestions.push({
                action: 'monitor_cpu',
                reason: `CPU load critical (${bundle.cpu_load}%)`,
                severity: 'critical'
            });
        }

        // 2. Disk Space
        if (bundle.disk_free_percent && bundle.disk_free_percent < 10) {
            suggestions.push({
                action: 'cleanup_disk',
                reason: `Disk space low (${bundle.disk_free_percent}% free)`,
                severity: 'medium'
            });
        }

        // Persist suggestions
        for (const s of suggestions) {
            await this.db.query(`
                INSERT INTO node_remediation_suggestions (node_id, suggestion_json, severity, created_at)
                VALUES (?, ?, ?, ?)
            `, [nodeId, JSON.stringify(s), s.severity, Date.now()]);
        }
    }
}
