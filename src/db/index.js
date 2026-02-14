
import Database from "better-sqlite3";
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
        if (sql.includes("INSERT INTO slow_queries")) return; // Prevent loop

        // Fire and forget - do not await
        try {
            const redacted = sql.replace(/'[^']*'/g, "'REDACTED'").substring(0, 200);
            const hash = Buffer.from(redacted).toString('base64').substring(0, 16); // Simple hash
            const now = Date.now();

            if (this.type === 'sqlite') {
                // Direct SQLite access to bypass wrapper for logging
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
                // Postgres - fire and forget
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
