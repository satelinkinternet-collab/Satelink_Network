import { expect } from "chai";
import { AuditLoggerService } from "../src/machine-access/audit-logger.service.js";
import { EnvironmentGuardService } from "../src/machine-access/environment-guard.service.js";
import { MachineIdentityService } from "../src/machine-access/machine-identity.service.js";
import { ObservabilityGatewayService } from "../src/machine-access/observability-gateway.service.js";
import { MachineAccessTokenService } from "../src/machine-access/token.service.js";
import { PermissionValidatorService } from "../src/machine-access/permission-validator.service.js";
import { TokenHashingService } from "../src/machine-access/token-hashing.service.js";

class FakePool {
  constructor() {
    this.identities = [];
    this.tokens = [];
    this.audit = [];
    this.actions = [];
  }

  async query(sql, params = []) {
    if (sql.includes("SELECT * FROM machine_access_identities WHERE name")) {
      return { rows: this.identities.filter((row) => row.name === params[0]).slice(0, 1) };
    }
    if (sql.includes("SELECT * FROM machine_access_identities WHERE id")) {
      return { rows: this.identities.filter((row) => row.id === params[0]).slice(0, 1) };
    }
    if (sql.includes("INSERT INTO machine_access_identities")) {
      const row = {
        id: params[0],
        name: params[1],
        machine_type: params[2],
        description: params[3],
        role_bindings: JSON.parse(params[4]),
        default_scopes: JSON.parse(params[5]),
        environment_access: JSON.parse(params[6]),
        project_access: JSON.parse(params[7]),
        is_ai_agent: params[8],
        metadata: JSON.parse(params[9]),
        is_active: true,
      };
      this.identities.push(row);
      return { rows: [] };
    }
    if (sql.includes("UPDATE machine_access_identities")) {
      const row = this.identities.find((entry) => entry.id === params[0]);
      Object.assign(row, {
        machine_type: params[1],
        description: params[2],
        role_bindings: JSON.parse(params[3]),
        default_scopes: JSON.parse(params[4]),
        environment_access: JSON.parse(params[5]),
        project_access: JSON.parse(params[6]),
        is_ai_agent: params[7],
        metadata: JSON.parse(params[8]),
      });
      return { rows: [] };
    }
    if (sql.includes("INSERT INTO machine_access_tokens")) {
      const row = {
        id: params[0],
        identity_id: params[1],
        token_name: params[2],
        token_type: params[3],
        token_prefix: params[4],
        token_hash: params[5],
        token_salt: params[6],
        hash_algorithm: params[7],
        scopes: JSON.parse(params[8]),
        environment_access: JSON.parse(params[9]),
        project_access: JSON.parse(params[10]),
        rate_limit: JSON.parse(params[11]),
        ip_restrictions: JSON.parse(params[12]),
        metadata: JSON.parse(params[13]),
        expires_at: params[14],
        created_by: params[15],
        revoked_at: null,
      };
      this.tokens.push(row);
      return { rows: [] };
    }
    if (sql.includes("SELECT id, entry_hash FROM machine_access_audit_log")) {
      const last = this.audit[this.audit.length - 1];
      return { rows: last ? [{ id: this.audit.length, entry_hash: last.entry_hash }] : [] };
    }
    if (sql.includes("INSERT INTO machine_access_audit_log")) {
      this.audit.push({
        audit_id: params[0],
        token_id: params[1],
        identity_id: params[2],
        machine_identity: params[3],
        action: params[4],
        required_scope: params[5],
        environment: params[6],
        project_id: params[7],
        status: params[8],
        failure_reason: params[9],
        execution_metadata: JSON.parse(params[12]),
        prev_entry_hash: params[13],
        entry_hash: params[14],
        created_at: new Date().toISOString(),
      });
      return { rows: [] };
    }
    if (sql.includes("SELECT") && sql.includes("FROM machine_access_tokens t") && sql.includes("JOIN machine_access_identities")) {
      const token = this.tokens.find((entry) => entry.token_prefix === params[0] && !entry.revoked_at);
      if (!token) return { rows: [] };
      const identity = this.identities.find((entry) => entry.id === token.identity_id);
      return {
        rows: [
          {
            ...token,
            name: identity.name,
            identity_name: identity.name,
            machine_type: identity.machine_type,
            role_bindings: identity.role_bindings,
            default_scopes: identity.default_scopes,
            is_ai_agent: identity.is_ai_agent,
          },
        ],
      };
    }
    if (sql.includes("UPDATE machine_access_tokens SET last_used_at")) {
      return { rows: [] };
    }
    if (sql.includes("SELECT NOW() AS now")) {
      return { rows: [{ now: new Date().toISOString() }] };
    }
    if (sql.includes("FROM nodes WHERE status = 'active'")) {
      return { rows: [{ count: 2 }] };
    }
    if (sql.includes("FROM revenue_events_v2")) {
      return { rows: [{ count: 17, total: 1.42 }] };
    }
    if (sql.includes("FROM machine_access_action_requests")) {
      if (sql.includes("COUNT(*)::int AS count")) {
        return { rows: [{ count: this.actions.length }] };
      }
      return { rows: this.actions };
    }
    if (sql.includes("SELECT machine_identity, action, status")) {
      return { rows: this.audit };
    }
    if (sql.includes("SELECT id, node_id, region, status, last_seen FROM nodes")) {
      return { rows: [] };
    }
    throw new Error(`Unhandled SQL in test fake: ${sql}`);
  }
}

describe("machine-access foundation", () => {
  beforeEach(() => {
    process.env.MACHINE_ACCESS_ADMIN_SECRET = "test-admin-secret";
    process.env.MACHINE_ACCESS_SESSION_SECRET = "test-machine-session-secret";
  });

  it("hashes token secrets and verifies them without storing the raw secret", async () => {
    const hashing = new TokenHashingService();
    const secret = "super-secret-token-material";
    const record = await hashing.hashTokenSecret(secret);

    expect(record.hash).to.not.equal(secret);
    expect(record.salt).to.be.a("string");
    expect(await hashing.verifyTokenSecret(secret, record.hash, record.salt)).to.equal(true);
    expect(await hashing.verifyTokenSecret("wrong-secret", record.hash, record.salt)).to.equal(false);
  });

  it("blocks unsafe scopes for ai-agent tokens", () => {
    const validator = new PermissionValidatorService();
    expect(() =>
      validator.resolveScopes({
        tokenType: "ai-agent-token",
        explicitScopes: ["read:runtime", "write:services"],
      }),
    ).to.throw(/cannot carry scopes/);
  });

  it("issues a machine token and reuses it for authenticated observability access", async () => {
    const pool = new FakePool();
    const permissionValidator = new PermissionValidatorService();
    const environmentGuard = new EnvironmentGuardService();
    const auditLogger = new AuditLoggerService(pool);
    const identityService = new MachineIdentityService(pool);
    const tokenService = new MachineAccessTokenService({
      pool,
      hashingService: new TokenHashingService(),
      permissionValidator,
      identityService,
      auditLogger,
      environmentGuard,
    });
    const observabilityGateway = new ObservabilityGatewayService(pool);

    const issue = await tokenService.issueToken(
      {
        identityName: "claude-runtime-auditor",
        machineType: "ai-agent",
        tokenName: "Claude Runtime Auditor",
        tokenType: "ai-agent-token",
        scopes: ["read:runtime", "read:deployments", "read:metrics", "read:logs"],
        environmentAccess: ["preview"],
        projectAccess: ["control-plane"],
      },
      {
        issuedBy: "test-suite",
        ipAddress: "127.0.0.1",
        userAgent: "mocha",
      },
    );

    expect(issue.rawToken).to.match(/^slma\.preview\./);
    expect(pool.tokens[0].token_hash).to.not.include(issue.rawToken);

    const tokenContext = await tokenService.authenticateToken(issue.rawToken);
    expect(tokenContext.machineIdentity).to.equal("claude-runtime-auditor");
    expect(tokenContext.scopes).to.include("read:runtime");

    const overview = await observabilityGateway.getOverview({
      environment: "preview",
      projectId: "control-plane",
    });

    expect(overview.environment).to.equal("preview");
    expect(overview.projectId).to.equal("control-plane");
    expect(overview.nodesOnline).to.equal(2);
  });
});
