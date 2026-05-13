import { randomUUID } from "crypto";
import { parseJsonField } from "./contracts.js";

export class MachineIdentityService {
  constructor(pool) {
    this.pool = pool;
  }

  async upsertIdentity({
    name,
    machineType,
    description,
    roleBindings = [],
    defaultScopes = [],
    environmentAccess = ["preview"],
    projectAccess = ["*"],
    isAiAgent = false,
    metadata = {},
  }) {
    const existing = await this.pool.query(
      `SELECT * FROM machine_access_identities WHERE name = $1 LIMIT 1`,
      [name],
    );

    if (existing.rows[0]) {
      const row = existing.rows[0];
      await this.pool.query(
        `UPDATE machine_access_identities
            SET machine_type = $2,
                description = $3,
                role_bindings = $4::jsonb,
                default_scopes = $5::jsonb,
                environment_access = $6::jsonb,
                project_access = $7::jsonb,
                is_ai_agent = $8,
                metadata = $9::jsonb,
                updated_at = NOW()
          WHERE id = $1`,
        [
          row.id,
          machineType,
          description || null,
          JSON.stringify(roleBindings),
          JSON.stringify(defaultScopes),
          JSON.stringify(environmentAccess),
          JSON.stringify(projectAccess),
          Boolean(isAiAgent),
          JSON.stringify(metadata),
        ],
      );
      return this.getIdentityById(row.id);
    }

    const id = randomUUID();
    await this.pool.query(
      `INSERT INTO machine_access_identities (
        id, name, machine_type, description, role_bindings, default_scopes,
        environment_access, project_access, is_ai_agent, metadata
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10::jsonb)`,
      [
        id,
        name,
        machineType,
        description || null,
        JSON.stringify(roleBindings),
        JSON.stringify(defaultScopes),
        JSON.stringify(environmentAccess),
        JSON.stringify(projectAccess),
        Boolean(isAiAgent),
        JSON.stringify(metadata),
      ],
    );
    return this.getIdentityById(id);
  }

  async getIdentityById(id) {
    const result = await this.pool.query(`SELECT * FROM machine_access_identities WHERE id = $1 LIMIT 1`, [id]);
    const row = result.rows[0];
    if (!row) return null;
    return {
      ...row,
      role_bindings: parseJsonField(row.role_bindings, []),
      default_scopes: parseJsonField(row.default_scopes, []),
      environment_access: parseJsonField(row.environment_access, []),
      project_access: parseJsonField(row.project_access, []),
      metadata: parseJsonField(row.metadata, {}),
    };
  }

  async listIdentities() {
    const result = await this.pool.query(
      `SELECT * FROM machine_access_identities WHERE is_active = TRUE ORDER BY created_at DESC`,
    );
    return result.rows.map((row) => ({
      ...row,
      role_bindings: parseJsonField(row.role_bindings, []),
      default_scopes: parseJsonField(row.default_scopes, []),
      environment_access: parseJsonField(row.environment_access, []),
      project_access: parseJsonField(row.project_access, []),
      metadata: parseJsonField(row.metadata, {}),
    }));
  }
}
