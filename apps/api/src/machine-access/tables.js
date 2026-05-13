export async function ensureMachineAccessTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS machine_access_identities (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      machine_type TEXT NOT NULL,
      description TEXT,
      role_bindings JSONB NOT NULL DEFAULT '[]'::jsonb,
      default_scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
      environment_access JSONB NOT NULL DEFAULT '["preview"]'::jsonb,
      project_access JSONB NOT NULL DEFAULT '["*"]'::jsonb,
      is_ai_agent BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS machine_access_tokens (
      id TEXT PRIMARY KEY,
      identity_id TEXT NOT NULL REFERENCES machine_access_identities(id) ON DELETE CASCADE,
      token_name TEXT NOT NULL,
      token_type TEXT NOT NULL,
      token_prefix TEXT UNIQUE NOT NULL,
      token_hash TEXT NOT NULL,
      token_salt TEXT NOT NULL,
      hash_algorithm TEXT NOT NULL DEFAULT 'scrypt',
      scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
      environment_access JSONB NOT NULL DEFAULT '["preview"]'::jsonb,
      project_access JSONB NOT NULL DEFAULT '["*"]'::jsonb,
      rate_limit JSONB NOT NULL DEFAULT '{"windowMs":60000,"max":60}'::jsonb,
      ip_restrictions JSONB NOT NULL DEFAULT '[]'::jsonb,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      last_used_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS machine_access_audit_log (
      id BIGSERIAL PRIMARY KEY,
      audit_id TEXT UNIQUE NOT NULL,
      token_id TEXT,
      identity_id TEXT,
      machine_identity TEXT NOT NULL,
      action TEXT NOT NULL,
      required_scope TEXT,
      environment TEXT,
      project_id TEXT,
      status TEXT NOT NULL,
      failure_reason TEXT,
      ip_address TEXT,
      user_agent TEXT,
      execution_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      prev_entry_hash TEXT,
      entry_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS machine_access_action_requests (
      id TEXT PRIMARY KEY,
      token_id TEXT,
      identity_id TEXT,
      action_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      environment TEXT NOT NULL,
      project_id TEXT NOT NULL,
      approval_state TEXT NOT NULL DEFAULT 'approved',
      status TEXT NOT NULL DEFAULT 'queued',
      request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_machine_access_tokens_prefix
      ON machine_access_tokens(token_prefix)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_machine_access_audit_environment_project
      ON machine_access_audit_log(environment, project_id, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_machine_access_actions_environment_project
      ON machine_access_action_requests(environment, project_id, created_at DESC)
  `);
}
