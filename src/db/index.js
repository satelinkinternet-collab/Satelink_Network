

function normalizeDbInterface(db) {
  // Ensure db.exec(sql) exists for both sqlite/postgres wrappers used across the app.
  if (db && typeof db.exec === "function") return db;

  // Common wrappers:
  // - sqlite wrappers may expose .run() or .prepare()
  // - some adapters expose .db (raw)
  const raw = (db && db.db) ? db.db : db;

  if (raw && typeof raw.exec === "function") {
    // if the raw object has exec, expose it at top-level too
    db.exec = raw.exec.bind(raw);
    return db;
  }

  if (raw && typeof raw.run === "function") {
    db.exec = (sql) => raw.run(sql);
    return db;
  }

  if (raw && typeof raw.prepare === "function") {
    db.exec = (sql) => raw.prepare(sql).run();
    return db;
  }

  throw new Error("[FATAL] DB adapter missing exec/run/prepare. Cannot run migrations.");
}


import Database from "better-sqlite3";

function isSqliteUrl(u) {
  return !!u && /^sqlite:/.test(u);
}

function sqlitePathFromUrl(u) {
  // supports sqlite:./file.db and sqlite:///abs/path.db
  return u.replace(/^sqlite:(\/\/)?/, "");
}

import pg from "pg";

const { Pool } = pg;

export class UniversalDB {
    constructor(config) {
        this.type = config.type;
        this.config = config;
        this.db = null;
    }

    async init() {
        if (this.type === 'sqlite') {
            this.db = new Database(this.config.connectionString || ":memory:");
            this.db.pragma("journal_mode = WAL");
            this.db.pragma("busy_timeout = 5000");
            this.db.pragma("foreign_keys = ON");
            this.db.pragma("auto_vacuum = INCREMENTAL");
            this.db.pragma("temp_store = MEMORY");
            console.log("DB ready (sqlite):", typeof this.db.prepare);
        } else {
            this.pool = new Pool({ connectionString: this.config.connectionString });
            console.log("DB ready (postgres)");
        }
    }

    prepare(sql) {
        if (this.type === 'sqlite') {
            return this.db.prepare(sql);
        }
        // For Postgres, we return a mock object that mimics better-sqlite3 stmt
        return {
            run: (...args) => this.query(sql, ...args),
            get: (...args) => this.get(sql, ...args),
            all: (...args) => this.query(sql, ...args)
        };
    }

    // Convert '?' to '$1', '$2', etc. for Postgres
    _formatSql(sql) {
        if (this.type === 'sqlite') return sql;
        let i = 1;
        return sql.replace(/\?/g, () => `$${i++}`);
    }

    async query(sql, params = []) {
        if (this.type === 'sqlite') {
            const stmt = this.db.prepare(sql);
            if (sql.trim().toUpperCase().startsWith("SELECT")) {
                const start = performance.now();
                const res = stmt.all(params);
                const duration = performance.now() - start;
                if (duration > 250) this._logSlowQuery(sql, duration);
                return res;
            } else {
                const start = performance.now();
                const res = stmt.run(params);
                const duration = performance.now() - start;
                if (duration > 250) this._logSlowQuery(sql, duration);
                return res;
            }
        } else {
            const start = performance.now();
            let res;
            try {
                res = await this.pool.query(this._formatSql(sql), params);
            } finally {
                const duration = performance.now() - start;
                if (duration > 250) this._logSlowQuery(sql, duration, 'postgres');
            }

            if (sql.trim().toUpperCase().startsWith("SELECT")) {
                return res.rows;
            } else {
                return {
                    lastInsertRowid: res.rows[0]?.id || 0,
                    changes: res.rowCount
                };
            }
        }
    }

    async get(sql, params = []) {
        if (this.type === 'sqlite') {
            return this.db.prepare(sql).get(params);
        } else {
            const res = await this.pool.query(this._formatSql(sql), params);
            return res.rows[0];
        }
    }

    async exec(sql) {
        if (this.type === 'sqlite') {
            return this.db.exec(sql);
        } else {
            return this.pool.query(sql);
        }
    }

    async transaction(fn) {
        if (this.type === 'sqlite') {
            // Initialize serialization queue if valid for SQLite
            if (!this.txQueue) this.txQueue = Promise.resolve();

            // Append this transaction to the queue
            const resultPromise = this.txQueue.then(async () => {
                // console.log("[DB] TX START");
                this.db.prepare('BEGIN').run();
                try {
                    const res = await fn(this);
                    this.db.prepare('COMMIT').run();
                    // console.log("[DB] TX COMMIT");
                    return res;
                } catch (e) {
                    console.error("[DB] TX ERROR:", e.message);
                    this.db.prepare('ROLLBACK').run();
                    throw e;
                }
            });

            // Update queue to wait for this one (regardless of success/failure)
            // We catch error in the chain so the queue helper doesn't reject, 
            // but return the resultPromise so the caller gets the result/error.
            this.txQueue = resultPromise.catch(() => { });

            return resultPromise;
        } else {
            const client = await this.pool.connect();
            try {
                await client.query('BEGIN');
                // Mock a DB-like object for the transaction function
                // This is complex because 'fn' expects 'this.db' in original code
                // We might need to refactor usages to pass 'tx' context
                // For now, simpler: we assume 'fn' relies on the engine's 'db' property. 
                // BUT in Postgres, we must use the SAME client.
                // So we need to support passing context or binding.
                // This suggests we need to change how 'transaction' is called.

                // CRITICAL: We cannot easily support the synchronous 'transaction' style of better-sqlite3
                // where you wrap a function and call it later. 
                // We will implement a 'runTransaction' method that takes an async callback.

                const txAdapter = new TransactionAdapter(client, this.type);
                const result = await fn(txAdapter);
                await client.query('COMMIT');
                return result;
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        }
    }

    _logSlowQuery(sql, duration, source = "sqlite") {
        if (sql.includes("INSERT INTO slow_queries") || sql.includes("INSERT INTO error_events")) return; // Prevent loop

        // Fire and forget - do not await
        try {
            const redacted = sql.replace(/'[^']*'/g, "'REDACTED'").substring(0, 200);
            const hash = Buffer.from(redacted).toString('base64').substring(0, 16); // Simple hash
            const now = Date.now();

            // 1. Slow Query Log
            if (this.type === 'sqlite') {
                const stmt = this.db.prepare(`
                    INSERT INTO slow_queries (query_hash, avg_ms, p95_ms, count, last_seen_at, sample_sql, source)
                    VALUES (?, ?, ?, 1, ?, ?, ?)
                    ON CONFLICT(query_hash) DO UPDATE SET
                        avg_ms = (avg_ms + excluded.avg_ms) / 2,
                        p95_ms = MAX(p95_ms, excluded.p95_ms),
                        count = count + 1,
                        last_seen_at = excluded.last_seen_at
                `);
                stmt.run([hash, duration, duration, now, redacted, source]);
            } else {
                // Postgres impl matches above pattern
                this.pool.query(
                    `INSERT INTO slow_queries (query_hash, avg_ms, p95_ms, count, last_seen_at, sample_sql, source)
                     VALUES ($1, $2, $3, 1, $4, $5, $6)
                     ON CONFLICT(query_hash) DO UPDATE SET
                        avg_ms = (slow_queries.avg_ms + EXCLUDED.avg_ms) / 2,
                        p95_ms = GREATEST(slow_queries.p95_ms, EXCLUDED.p95_ms),
                        count = slow_queries.count + 1,
                        last_seen_at = EXCLUDED.last_seen_at`,
                    [hash, duration, duration, now, redacted, source]
                ).catch(() => { });
            }

            // 2. Strict Budget Violation (> 1000ms) -> Log as Error
            if (duration > 1000) {
                const errorSql = `
                    INSERT INTO error_events (service, route, method, status_code, message, stack_hash, stack_preview, first_seen_at, last_seen_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 `;
                const params = [
                    'db', 'internal', 'QUERY', 500,
                    `Query Budget Violation (${duration.toFixed(0)}ms): ${redacted}`,
                    hash, redacted, now, now
                ];

                if (this.type === 'sqlite') {
                    this.db.prepare(errorSql).run(params);
                } else {
                    // PG params need $1...
                    this.pool.query(this._formatSql(errorSql), params).catch(() => { });
                }
            }

        } catch (e) {
            // Silent fail for telemetry
        }
    }

    close() {
        if (this.type === 'sqlite') this.db.close();
        else this.pool.end();
    }
}

class TransactionAdapter {
    constructor(client, type) {
        this.client = client;
        this.type = type;
    }

    _formatSql(sql) {
        let i = 1;
        return sql.replace(/\?/g, () => `$${i++}`);
    }

    async query(sql, params = []) {
        const res = await this.client.query(this._formatSql(sql), params);
        if (sql.trim().toUpperCase().startsWith("SELECT")) {
            return res.rows;
        } else {
            // For INSERT needing ID, we expect SQL to have RETURNING id
            // but SQLite doesn't use that syntax by default.
            // OpsEngine mostly uses .lastInsertRowid.
            // We will handle this in OpsEngine refactor.
            return { changes: res.rowCount };
        }
    }

    async get(sql, params = []) {
        const res = await this.client.query(this._formatSql(sql), params);
        return res.rows[0];
    }

    prepare(sql) {
        // mimic better-sqlite3 stmt for easy refactor? 
        // No, better to force update to .query/.get
        throw new Error("prepare() not supported in Async Transaction. Use .query() or .get()");
    }
}

export function getValidatedDB(config) {
    const isProd = process.env.NODE_ENV === "production";

    // 1. If DATABASE_URL is present, decide by scheme
    const dbUrl = config.dbUrl || process.env.DATABASE_URL;
    if (isSqliteUrl(dbUrl)) {
        // DATABASE_URL looks like sqlite -> use sqlite
        return isSqliteUrl({
            connectionString: sqlitePathFromUrl(dbUrl) || config.sqlitePath || process.env.SQLITE_PATH || 'satelink.db'
        });
    }
    if (dbUrl) {
        return new UniversalDB({
            type: 'postgres',
            connectionString: config.dbUrl || process.env.DATABASE_URL
        });
    }

    // 2. If NO DATABASE_URL, check environment
    if (isProd) {
        throw new Error("[FATAL] Production requires DATABASE_URL. SQLite fallback forbidden.");
    }

    // 3. Fallback to SQLite (Dev/Test only)
    console.warn("[WARN] Using SQLite (Non-Production Fallback)");
    return new UniversalDB({
        type: 'sqlite',
        connectionString: config.sqlitePath || process.env.SQLITE_PATH || 'satelink.db'
    });
}
