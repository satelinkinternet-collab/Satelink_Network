import { hashObject } from '../../utils/canonical_json.js';

export class AuditService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Log an administrative action with hash chain
     */
    async logAction({ actor_wallet, action_type, target_type, target_id, before_json, after_json, ip_hash }) {
        const now = Date.now();

        return await this.db.transaction(async (tx) => {
            // 1. Get previous hash
            const last = await tx.get("SELECT entry_hash FROM admin_audit_log ORDER BY id DESC LIMIT 1");
            const prevHash = last ? last.entry_hash : 'GENESIS';

            // 2. Prepare entry data for hashing
            const entryData = {
                actor_wallet,
                action_type,
                target_type,
                target_id,
                before_json,
                after_json,
                ip_hash,
                created_at: now,
                prev_hash: prevHash
            };

            // 3. Compute entry hash
            const entryHash = hashObject(entryData);

            // 4. Insert
            await tx.query(`
                INSERT INTO admin_audit_log 
                (actor_wallet, action_type, target_type, target_id, before_json, after_json, ip_hash, created_at, prev_hash, entry_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [actor_wallet, action_type, target_type, target_id, before_json, after_json, ip_hash, now, prevHash, entryHash]);

            return { entryHash, prevHash };
        });
    }

    /**
     * Verify the entire audit chain
     */
    async verifyChain(limit = 5000) {
        const logs = await this.db.query(
            "SELECT * FROM admin_audit_log ORDER BY id ASC LIMIT ?",
            [limit]
        );

        let prevHash = 'GENESIS';
        let firstBreakAt = null;
        let hashedCount = 0;

        for (const log of logs) {
            if (!log.entry_hash) {
                // Skip legacy logs, but reset prevHash to GENESIS for the first hashed entry?
                // Better: if we see a hashed entry, its prevHash MUST match our current prevHash.
                // If the very first hashed entry has prev_hash = 'GENESIS', we are good.
                continue;
            }

            const entryData = {
                actor_wallet: log.actor_wallet,
                action_type: log.action_type,
                target_type: log.target_type,
                target_id: log.target_id,
                before_json: log.before_json,
                after_json: log.after_json,
                ip_hash: log.ip_hash,
                created_at: log.created_at,
                prev_hash: log.prev_hash
            };

            const computedHash = hashObject(entryData);
            hashedCount++;

            if (computedHash !== log.entry_hash || log.prev_hash !== prevHash) {
                // If it's the first hashed entry and prev_hash is GENESIS, reset and continue
                if (hashedCount === 1 && log.prev_hash === 'GENESIS') {
                    // This is the new Genesis
                } else {
                    firstBreakAt = log.id;
                    break;
                }
            }
            prevHash = log.entry_hash;
        }

        return {
            ok: firstBreakAt === null,
            first_break_at: firstBreakAt,
            last_hash: prevHash,
            count: logs.length,
            hashed_count: hashedCount
        };
    }
}
