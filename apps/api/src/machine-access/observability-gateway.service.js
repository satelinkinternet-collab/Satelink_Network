import { parseJsonField } from "./contracts.js";
import { redactObject } from "./redaction.js";

export class ObservabilityGatewayService {
  constructor(pool) {
    this.pool = pool;
  }

  async getOverview({ environment = "preview", projectId = "core-platform" } = {}) {
    const [dbPing, nodes, requests, openActions] = await Promise.allSettled([
      this.pool.query("SELECT NOW() AS now"),
      this.pool.query(`SELECT COUNT(*)::int AS count FROM nodes WHERE status = 'active'`),
      this.pool.query(`SELECT COUNT(*)::int AS count FROM revenue_events_v2 WHERE created_at > $1`, [
        new Date(Date.now() - 86_400_000).toISOString(),
      ]),
      this.pool.query(
        `SELECT COUNT(*)::int AS count
           FROM machine_access_action_requests
          WHERE environment = $1
            AND project_id = $2
            AND status IN ('queued', 'awaiting_approval')`,
        [environment, projectId],
      ),
    ]);

    return {
      environment,
      projectId,
      database: {
        status: dbPing.status === "fulfilled" ? "online" : "degraded",
        checkedAt: dbPing.status === "fulfilled" ? dbPing.value.rows[0].now : null,
      },
      nodesOnline: nodes.status === "fulfilled" ? nodes.value.rows[0]?.count || 0 : 0,
      requests24h: requests.status === "fulfilled" ? requests.value.rows[0]?.count || 0 : 0,
      pendingActions: openActions.status === "fulfilled" ? openActions.value.rows[0]?.count || 0 : 0,
      mode: "internal-machine-access",
    };
  }

  async getMetrics({ environment = "preview", projectId = "core-platform" } = {}) {
    const revenue = await this.pool.query(
      `SELECT COALESCE(SUM(amount_usdt), 0) AS total
         FROM revenue_events_v2
        WHERE created_at > $1`,
      [new Date(Date.now() - 86_400_000).toISOString()],
    ).catch(() => ({ rows: [{ total: 0 }] }));

    return {
      environment,
      projectId,
      process: {
        uptimeSeconds: Math.floor(process.uptime()),
        heapUsedMb: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
        rssMb: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(2)),
      },
      revenue24hUsdt: Number(revenue.rows[0]?.total || 0),
      generatedAt: new Date().toISOString(),
    };
  }

  async getDeployments({ environment = "preview", projectId = "core-platform", limit = 25 } = {}) {
    const result = await this.pool.query(
      `SELECT id, action_type, target_type, target_id, environment, project_id,
              approval_state, status, request_payload, result_payload, created_at
         FROM machine_access_action_requests
        WHERE environment = $1
          AND project_id = $2
          AND action_type IN ('deploy.preview', 'build.preview', 'service.restart', 'diagnostics.run')
        ORDER BY created_at DESC
        LIMIT $3`,
      [environment, projectId, Math.min(Number(limit) || 25, 100)],
    );
    return result.rows.map((row) => ({
      ...row,
      request_payload: redactObject(parseJsonField(row.request_payload, {})),
      result_payload: redactObject(parseJsonField(row.result_payload, {})),
    }));
  }

  async getLogs({ environment = "preview", projectId = "core-platform", limit = 50 } = {}) {
    const auditLogs = await this.pool.query(
      `SELECT machine_identity, action, status, environment, project_id, execution_metadata, created_at
         FROM machine_access_audit_log
        WHERE environment = $1
          AND project_id = $2
        ORDER BY id DESC
        LIMIT $3`,
      [environment, projectId, Math.min(Number(limit) || 50, 200)],
    );
    return auditLogs.rows.map((row) => ({
      source: "machine-access-audit",
      machineIdentity: row.machine_identity,
      action: row.action,
      status: row.status,
      environment: row.environment,
      projectId: row.project_id,
      metadata: redactObject(parseJsonField(row.execution_metadata, {})),
      createdAt: row.created_at,
    }));
  }

  async getTopology() {
    const result = await this.pool.query(
      `SELECT id, node_id, region, status, last_seen
         FROM nodes
        ORDER BY last_seen DESC NULLS LAST
        LIMIT 50`,
    ).catch(() => ({ rows: [] }));

    return {
      nodes: result.rows.map((row) => ({
        id: row.id || row.node_id,
        nodeId: row.node_id || row.id,
        region: row.region || "unknown",
        status: row.status || "unknown",
        lastSeen: row.last_seen || null,
      })),
    };
  }

  async getQueues() {
    const queued = await this.pool.query(
      `SELECT COUNT(*)::int AS count
         FROM machine_access_action_requests
        WHERE status = 'queued'`,
    ).catch(() => ({ rows: [{ count: 0 }] }));
    const awaitingApproval = await this.pool.query(
      `SELECT COUNT(*)::int AS count
         FROM machine_access_action_requests
        WHERE status = 'awaiting_approval'`,
    ).catch(() => ({ rows: [{ count: 0 }] }));

    return {
      queueDepth: queued.rows[0]?.count || 0,
      awaitingApproval: awaitingApproval.rows[0]?.count || 0,
      executionLane: "scaffold-only",
    };
  }

  async getWebsocketHealth() {
    return {
      ready: false,
      authMode: "session-token-scaffolded",
      note: "Websocket handshake route exists, runtime gateway wiring is pending.",
    };
  }
}
