/**
 * PgDatabase — Standardized async PostgreSQL database interface.
 *
 * Provides: db.prepare(sql).run/get/all()  (all async, return Promises)
 *           db.transaction(fn)             (returns async callable)
 */
import pg from "pg";
import { DATABASE_URL as RESOLVED_DB_URL, maskUrl } from "../core/config/db_config.js";

const { Pool } = pg;

export class PgDatabase {
    constructor(pool) {
        this.pool = pool;
        this._txClient = null;
    }

    async init() {
        if (this.pool) return;
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString || (!connectionString.startsWith("postgres://") && !connectionString.startsWith("postgresql://"))) {
            throw new Error("[PgDatabase] Invalid or missing DATABASE_URL. PostgreSQL is the only supported database.");
        }
        console.log("[PgDatabase] FINAL_DB_URL:", connectionString.replace(/\/\/.*@/, '//<credentials>@'));
        this.pool = new Pool({
            connectionString,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
        this.pool.on("error", (err) => {
            console.error("[PgDatabase] Pool error:", err.message);
        });
        const client = await this.pool.connect();
        client.release();
        console.log("[PgDatabase] Connected via init()");
    }

    static async create(connectionStringParam, { retries = 5, delay = 2000 } = {}) {
        // Resolution: explicit param > resolved config > env var
        let connectionString = connectionStringParam || RESOLVED_DB_URL || process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error("[PgDatabase] DATABASE_URL is not set and no connection string provided. Cannot connect.");
        }
        // Force IPv4 — avoid ::1 ECONNREFUSED on macOS/Linux
        connectionString = connectionString.replace('://localhost:', '://127.0.0.1:');

        console.log("[PgDatabase] FINAL_DB_URL:", maskUrl(connectionString));
        const pool = new Pool({
            connectionString,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
        pool.on("error", (err) => {
            console.error("[PgDatabase] Pool error:", err.message);
        });

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const client = await pool.connect();
                client.release();
                console.log(`[PgDatabase] ✅ DATABASE CONNECTED (attempt ${attempt}/${retries})`);
                return new PgDatabase(pool);
            } catch (err) {
                console.error(`[PgDatabase] Connection attempt ${attempt}/${retries} failed: ${err.message}`);
                if (attempt === retries) {
                    console.error(`[PgDatabase] ❌ ALL ${retries} CONNECTION ATTEMPTS FAILED`);
                    console.error(`[PgDatabase] URL: ${maskUrl(connectionString)}`);
                    console.error(`[PgDatabase] Ensure PostgreSQL is running and credentials are correct.`);
                    console.error(`[PgDatabase] Docker: docker compose up -d database`);
                    console.error(`[PgDatabase] Local: check .env.local DATABASE_URL`);
                    throw err;
                }
                console.warn(`[PgDatabase] Retrying in ${delay}ms...`);
                await new Promise((r) => setTimeout(r, delay));
            }
        }
    }

    _getClient() {
        return this._txClient || this.pool;
    }

    _normalizeParams(args) {
        if (args.length === 0) return [];
        if (args.length === 1 && Array.isArray(args[0])) return args[0];
        return args;
    }

    _convertSql(sql) {
        let idx = 0;
        let converted = sql.replace(/\?/g, () => `$${++idx}`);
        const hasOrIgnore = /INSERT\s+OR\s+IGNORE\s+INTO/i.test(converted);
        if (hasOrIgnore) converted = converted.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, "INSERT INTO");
        const hasOrReplace = /INSERT\s+OR\s+REPLACE\s+INTO/i.test(converted);
        if (hasOrReplace) converted = converted.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, "INSERT INTO");
        converted = converted.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, "SERIAL PRIMARY KEY");
        // Convert SQLite strftime('%s', 'now') to PostgreSQL EXTRACT(EPOCH FROM NOW())
        converted = converted.replace(/strftime\s*\(\s*'%s'\s*,\s*'now'\s*\)/gi, "EXTRACT(EPOCH FROM NOW())::bigint");
        // Convert PRAGMA table_info(X) to information_schema query
        const pragmaMatch = converted.match(/PRAGMA\s+table_info\((\w+)\)/i);
        if (pragmaMatch) {
            const table = pragmaMatch[1];
            converted = `SELECT column_name as name FROM information_schema.columns WHERE table_name = '${table}'`;
        }
        return { sql: converted, hasOrIgnore, hasOrReplace };
    }

    prepare(sql) {
        const self = this;
        const { sql: pgSql, hasOrIgnore, hasOrReplace } = self._convertSql(sql);
        return {
            async run(...args) {
                const params = self._normalizeParams(args);
                const client = self._getClient();
                let execSql = pgSql;
                const isInsert = /^\s*INSERT\s/i.test(execSql);
                if (hasOrIgnore && !/ON\s+CONFLICT/i.test(execSql)) execSql = execSql.trimEnd() + " ON CONFLICT DO NOTHING";
                if (hasOrReplace && !/ON\s+CONFLICT/i.test(execSql)) {
                    // Parse column list from INSERT INTO table (col1, col2, ...) VALUES (...)
                    const colMatch = execSql.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i);
                    if (colMatch) {
                        const cols = colMatch[1].split(',').map(c => c.trim());
                        const conflictCol = cols[0]; // First column is assumed PK/unique
                        const updateCols = cols.slice(1);
                        if (updateCols.length > 0) {
                            const setClauses = updateCols.map(c => `${c} = EXCLUDED.${c}`).join(', ');
                            execSql = execSql.trimEnd() + ` ON CONFLICT (${conflictCol}) DO UPDATE SET ${setClauses}`;
                        } else {
                            execSql = execSql.trimEnd() + ` ON CONFLICT (${conflictCol}) DO NOTHING`;
                        }
                    }
                }
                if (isInsert && !/RETURNING/i.test(execSql)) execSql = execSql.trimEnd() + " RETURNING *";
                try {
                    const res = await client.query(execSql, params);
                    return { changes: res.rowCount, lastInsertRowid: res.rows?.[0]?.id };
                } catch (e) {
                    if (isInsert && /column|RETURNING/i.test(e.message)) {
                        let fallbackSql = pgSql;
                        if (hasOrIgnore) fallbackSql += " ON CONFLICT DO NOTHING";
                        if (hasOrReplace) {
                            const colMatch = pgSql.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i);
                            if (colMatch) {
                                const cols = colMatch[1].split(',').map(c => c.trim());
                                const conflictCol = cols[0];
                                const updateCols = cols.slice(1);
                                if (updateCols.length > 0) {
                                    fallbackSql += ` ON CONFLICT (${conflictCol}) DO UPDATE SET ${updateCols.map(c => `${c} = EXCLUDED.${c}`).join(', ')}`;
                                }
                            }
                        }
                        const res = await client.query(fallbackSql, params);
                        return { changes: res.rowCount };
                    }
                    throw e;
                }
            },
            async get(...args) {
                const params = self._normalizeParams(args);
                const client = self._getClient();
                const res = await client.query(pgSql, params);
                return res.rows[0];
            },
            async all(...args) {
                const params = self._normalizeParams(args);
                const client = self._getClient();
                const res = await client.query(pgSql, params);
                return res.rows;
            },
        };
    }

    transaction(fn) {
        const self = this;
        return async function () {
            const client = await self.pool.connect();
            
            // Critical Resilience: Handle connection errors while client is checked out
            const errorHandler = (err) => {
                console.error("[PgDatabase] Client error during transaction:", err.message);
            };
            client.once('error', errorHandler);

            const prevClient = self._txClient;
            try {
                await client.query("BEGIN");
                self._txClient = client;
                const result = await fn();
                await client.query("COMMIT");
                return result;
            } catch (e) {
                // Ignore error on ROLLBACK if connection is already lost
                try { await client.query("ROLLBACK"); } catch (rbErr) { /* ignore */ }
                throw e;
            } finally {
                self._txClient = prevClient;
                client.removeListener('error', errorHandler);
                client.release();
            }
        };
    }

    async query(sql, ...args) { return this.prepare(sql).all(...args); }
    async get(sql, ...args) { return this.prepare(sql).get(...args); }
    async all(sql, ...args) { return this.prepare(sql).all(...args); }
    async run(sql, ...args) { return this.prepare(sql).run(...args); }
    async exec(sql) { return this.pool.query(sql); }
    async close() { if (this.pool) await this.pool.end(); }

    /**
     * TASK 2 — RECORD EXECUTION RESULT
     */
    async recordExecution({ job_id, revenue, cost }) {
        await this.exec(`
            CREATE TABLE IF NOT EXISTS executions (
                id SERIAL PRIMARY KEY,
                job_id TEXT NOT NULL,
                revenue REAL NOT NULL,
                cost REAL NOT NULL,
                created_at BIGINT NOT NULL
            )
        `);

        return this.run(`
            INSERT INTO executions (job_id, revenue, cost, created_at)
            VALUES (?, ?, ?, ?)
        `, [job_id, revenue, cost, Date.now()]);
    }
}
