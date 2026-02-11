
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
                return stmt.all(params);
            } else {
                return stmt.run(params);
            }
        } else {
            const res = await this.pool.query(this._formatSql(sql), params);
            if (sql.trim().toUpperCase().startsWith("SELECT")) {
                return res.rows;
            } else {
                return {
                    lastInsertRowid: res.rows[0]?.id || 0, // specific handling needed for RETURNING id
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
