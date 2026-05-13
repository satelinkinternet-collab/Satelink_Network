import { randomBytes, randomUUID } from "crypto";
import {
  MACHINE_ACCESS_TOKEN_DEFAULTS,
  parseJsonField,
  uniqueValues,
} from "./contracts.js";

export class MachineAccessTokenService {
  constructor({ pool, hashingService, permissionValidator, identityService, auditLogger, environmentGuard }) {
    this.pool = pool;
    this.hashingService = hashingService;
    this.permissionValidator = permissionValidator;
    this.identityService = identityService;
    this.auditLogger = auditLogger;
    this.environmentGuard = environmentGuard;
  }

  generateTokenMaterial(environment) {
    const prefix = randomBytes(8).toString("hex");
    const secret = randomBytes(24).toString("base64url");
    return {
      prefix,
      secret,
      rawToken: `slma.${environment}.${prefix}.${secret}`,
    };
  }

  async issueToken(request, auditContext = {}) {
    const template = MACHINE_ACCESS_TOKEN_DEFAULTS[request.tokenType];
    if (!template) {
      throw new Error(`Unsupported machine token type: ${request.tokenType}`);
    }

    const environments = this.environmentGuard.normalizeList(
      request.environmentAccess || [],
      request.tokenType === "ai-agent-token" ? ["preview", "staging"] : ["preview"],
    );
    const projects = uniqueValues((request.projectAccess || ["*"]).map((value) => value || "*"));
    const identity = await this.identityService.upsertIdentity({
      name: request.identityName,
      machineType: request.machineType || request.tokenType,
      description: request.description,
      roleBindings: request.roleBindings || [],
      defaultScopes: request.identityDefaultScopes || [],
      environmentAccess: environments,
      projectAccess: projects,
      isAiAgent: request.tokenType === "ai-agent-token",
      metadata: request.identityMetadata || {},
    });

    const scopes = this.permissionValidator.resolveScopes({
      tokenType: request.tokenType,
      explicitScopes: request.scopes || [],
      roleBindings: identity.role_bindings || [],
      defaultScopes: identity.default_scopes || [],
    });
    const expiresInHours = Number(request.expiresInHours || template.expiresInHours);
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    const material = this.generateTokenMaterial(environments[0]);
    const hashRecord = await this.hashingService.hashTokenSecret(material.secret);
    const tokenId = randomUUID();
    const rateLimit = request.rateLimit || template.rateLimit;

    await this.pool.query(
      `INSERT INTO machine_access_tokens (
        id, identity_id, token_name, token_type, token_prefix, token_hash, token_salt,
        hash_algorithm, scopes, environment_access, project_access, rate_limit,
        ip_restrictions, metadata, expires_at, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb,
        $13::jsonb, $14::jsonb, $15, $16
      )`,
      [
        tokenId,
        identity.id,
        request.tokenName,
        request.tokenType,
        material.prefix,
        hashRecord.hash,
        hashRecord.salt,
        hashRecord.algorithm,
        JSON.stringify(scopes),
        JSON.stringify(environments),
        JSON.stringify(projects),
        JSON.stringify(rateLimit),
        JSON.stringify(request.ipRestrictions || []),
        JSON.stringify(request.metadata || {}),
        expiresAt.toISOString(),
        auditContext.issuedBy || "internal-admin",
      ],
    );

    await this.auditLogger.log({
      tokenId,
      identityId: identity.id,
      machineIdentity: identity.name,
      action: "token.issue",
      requiredScope: "admin:tokens",
      environment: environments[0],
      projectId: projects[0] || "*",
      status: "success",
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      executionMetadata: {
        tokenType: request.tokenType,
        tokenName: request.tokenName,
        scopes,
        environmentAccess: environments,
        projectAccess: projects,
        expiresAt,
      },
    });

    return {
      rawToken: material.rawToken,
      tokenId,
      identityId: identity.id,
      tokenName: request.tokenName,
      tokenType: request.tokenType,
      scopes,
      environmentAccess: environments,
      projectAccess: projects,
      expiresAt,
      rateLimit,
    };
  }

  async authenticateToken(rawToken) {
    const parts = String(rawToken || "").split(".");
    if (parts.length !== 4 || parts[0] !== "slma") {
      throw new Error("Invalid machine access token format");
    }
    const [, environmentHint, prefix, secret] = parts;
    const result = await this.pool.query(
      `SELECT
          t.*,
          i.name AS identity_name,
          i.machine_type,
          i.role_bindings,
          i.default_scopes,
          i.environment_access AS identity_environment_access,
          i.project_access AS identity_project_access,
          i.is_ai_agent
         FROM machine_access_tokens t
         JOIN machine_access_identities i ON i.id = t.identity_id
        WHERE t.token_prefix = $1
          AND t.revoked_at IS NULL
          AND (t.expires_at IS NULL OR t.expires_at > NOW())
          AND i.is_active = TRUE
        LIMIT 1`,
      [prefix],
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error("Unknown or revoked machine access token");
    }

    const valid = await this.hashingService.verifyTokenSecret(secret, row.token_hash, row.token_salt);
    if (!valid) {
      throw new Error("Machine access token secret mismatch");
    }

    const environmentAccess = parseJsonField(row.environment_access, []);
    const projectAccess = parseJsonField(row.project_access, []);
    const scopes = this.permissionValidator.resolveScopes({
      tokenType: row.token_type,
      explicitScopes: parseJsonField(row.scopes, []),
      roleBindings: parseJsonField(row.role_bindings, []),
      defaultScopes: parseJsonField(row.default_scopes, []),
    });

    if (!environmentAccess.includes("*") && !environmentAccess.includes(environmentHint)) {
      throw new Error(`Token environment hint ${environmentHint} is not allowed`);
    }

    await this.pool.query(`UPDATE machine_access_tokens SET last_used_at = NOW(), updated_at = NOW() WHERE id = $1`, [
      row.id,
    ]);

    return {
      tokenId: row.id,
      identityId: row.identity_id,
      machineIdentity: row.identity_name,
      machineType: row.machine_type,
      tokenName: row.token_name,
      tokenType: row.token_type,
      scopes,
      environmentAccess,
      projectAccess,
      rateLimit: parseJsonField(row.rate_limit, MACHINE_ACCESS_TOKEN_DEFAULTS[row.token_type]?.rateLimit),
      ipRestrictions: parseJsonField(row.ip_restrictions, []),
      metadata: parseJsonField(row.metadata, {}),
      expiresAt: row.expires_at,
      isAiAgent: row.is_ai_agent,
    };
  }

  async revokeToken(tokenId, auditContext = {}) {
    const result = await this.pool.query(
      `UPDATE machine_access_tokens
          SET revoked_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND revoked_at IS NULL
      RETURNING id, identity_id, token_name, token_type`,
      [tokenId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error("Token not found or already revoked");
    }
    await this.auditLogger.log({
      tokenId: row.id,
      identityId: row.identity_id,
      machineIdentity: auditContext.machineIdentity || "internal-admin",
      action: "token.revoke",
      requiredScope: "admin:tokens",
      environment: auditContext.environment || "preview",
      projectId: auditContext.projectId || "*",
      status: "success",
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      executionMetadata: {
        tokenName: row.token_name,
        tokenType: row.token_type,
      },
    });
    return row;
  }

  async rotateToken(tokenId, auditContext = {}) {
    const existing = await this.pool.query(`SELECT * FROM machine_access_tokens WHERE id = $1 LIMIT 1`, [tokenId]);
    const row = existing.rows[0];
    if (!row) {
      throw new Error("Token not found");
    }

    await this.revokeToken(tokenId, auditContext);
    return this.issueToken(
      {
        identityName: auditContext.identityName || row.token_name,
        machineType: auditContext.machineType || row.token_type,
        tokenName: row.token_name,
        tokenType: row.token_type,
        scopes: parseJsonField(row.scopes, []),
        environmentAccess: parseJsonField(row.environment_access, []),
        projectAccess: parseJsonField(row.project_access, []),
        expiresInHours: row.expires_at
          ? Math.max(1, Math.round((new Date(row.expires_at).getTime() - Date.now()) / 3_600_000))
          : undefined,
        rateLimit: parseJsonField(row.rate_limit, null),
        ipRestrictions: parseJsonField(row.ip_restrictions, []),
        metadata: {
          ...parseJsonField(row.metadata, {}),
          rotatedFrom: tokenId,
        },
      },
      auditContext,
    );
  }

  async listTokens() {
    const result = await this.pool.query(
      `SELECT
          t.id,
          t.identity_id,
          i.name AS identity_name,
          t.token_name,
          t.token_type,
          t.token_prefix,
          t.scopes,
          t.environment_access,
          t.project_access,
          t.rate_limit,
          t.ip_restrictions,
          t.metadata,
          t.last_used_at,
          t.expires_at,
          t.revoked_at,
          t.created_at
         FROM machine_access_tokens t
         JOIN machine_access_identities i ON i.id = t.identity_id
         ORDER BY t.created_at DESC`,
    );
    return result.rows.map((row) => ({
      ...row,
      scopes: parseJsonField(row.scopes, []),
      environment_access: parseJsonField(row.environment_access, []),
      project_access: parseJsonField(row.project_access, []),
      rate_limit: parseJsonField(row.rate_limit, {}),
      ip_restrictions: parseJsonField(row.ip_restrictions, []),
      metadata: parseJsonField(row.metadata, {}),
    }));
  }
}
