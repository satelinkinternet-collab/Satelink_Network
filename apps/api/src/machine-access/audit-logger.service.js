import { createHash, randomUUID } from "crypto";
import { parseJsonField } from "./contracts.js";
import { redactObject } from "./redaction.js";

export class AuditLoggerService {
  constructor(pool) {
    this.pool = pool;
  }

  async log(entry) {
    const previous = await this.pool.query(
      `SELECT id, entry_hash FROM machine_access_audit_log ORDER BY id DESC LIMIT 1`,
    );
    const prevHash = previous.rows[0]?.entry_hash || null;
    const metadata = redactObject(entry.executionMetadata || {});
    const chainedPayload = JSON.stringify({
      machineIdentity: entry.machineIdentity || null,
      tokenId: entry.tokenId || null,
      action: entry.action,
      environment: entry.environment || null,
      projectId: entry.projectId || null,
      status: entry.status || "success",
      executionMetadata: metadata,
      prevHash,
    });
    const entryHash = createHash("sha256").update(chainedPayload).digest("hex");
    const auditId = randomUUID();

    await this.pool.query(
      `INSERT INTO machine_access_audit_log (
        audit_id, token_id, identity_id, machine_identity, action, required_scope,
        environment, project_id, status, failure_reason, ip_address, user_agent,
        execution_metadata, prev_entry_hash, entry_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15)`,
      [
        auditId,
        entry.tokenId || null,
        entry.identityId || null,
        entry.machineIdentity || "unknown-machine",
        entry.action,
        entry.requiredScope || null,
        entry.environment || null,
        entry.projectId || null,
        entry.status || "success",
        entry.failureReason || null,
        entry.ipAddress || null,
        entry.userAgent || null,
        JSON.stringify(metadata),
        prevHash,
        entryHash,
      ],
    );

    return { auditId, entryHash };
  }

  async listAuditEntries({ environment, projectId, limit = 50 } = {}) {
    const values = [];
    const where = [];
    if (environment) {
      values.push(environment);
      where.push(`environment = $${values.length}`);
    }
    if (projectId) {
      values.push(projectId);
      where.push(`project_id = $${values.length}`);
    }
    values.push(Math.min(Number(limit) || 50, 200));
    const result = await this.pool.query(
      `SELECT audit_id, token_id, identity_id, machine_identity, action, required_scope,
              environment, project_id, status, failure_reason, ip_address, user_agent,
              execution_metadata, entry_hash, prev_entry_hash, created_at
         FROM machine_access_audit_log
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
         ORDER BY id DESC
         LIMIT $${values.length}`,
      values,
    );
    return result.rows.map((row) => ({
      ...row,
      execution_metadata: parseJsonField(row.execution_metadata, {}),
    }));
  }
}
