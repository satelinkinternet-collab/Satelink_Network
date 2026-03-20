/**
 * PgDatabase — Standardized async PostgreSQL database interface.
 *
 * Provides: db.prepare(sql).run/get/all()  (all async, return Promises)
 *           db.transaction(fn)             (returns async callable)
 */
import pg from "pg";

const { Pool } = pg;

export class PgDatabase {
    constructor(pool) {
        this.pool = pool;
        this._txClient = null;
    }

    async init() {
        if (this.pool) return;
        const connectionString = process.env.DATABASE_URL;
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

    static async create(connectionString, { retries = 15, delay = 2000 } = {}) {
        const pool = new Pool({
            connectionString,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const client = await pool.connect();
                client.release();
                return new PgDatabase(pool);
            } catch (err) {
                if (attempt === retries) throw err;
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
        converted = converted.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, "SERIAL PRIMARY KEY");
        return { sql: converted, hasOrIgnore };
    }

    prepare(sql) {
        const self = this;
        const { sql: pgSql, hasOrIgnore } = self._convertSql(sql);
        return {
            async run(...args) {
                const params = self._normalizeParams(args);
                const client = self._getClient();
                let execSql = pgSql;
                const isInsert = /^\s*INSERT\s/i.test(execSql);
                if (hasOrIgnore && !/ON\s+CONFLICT/i.test(execSql)) execSql = execSql.trimEnd() + " ON CONFLICT DO NOTHING";
                if (isInsert && !/RETURNING/i.test(execSql)) execSql = execSql.trimEnd() + " RETURNING *";
                try {
                    const res = await client.query(execSql, params);
                    return { changes: res.rowCount, lastInsertRowid: res.rows?.[0]?.id };
                } catch (e) {
                    if (isInsert && /column|RETURNING/i.test(e.message)) {
                        const fallbackSql = hasOrIgnore ? pgSql + " ON CONFLICT DO NOTHING" : pgSql;
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
            const prevClient = self._txClient;
            try {
                await client.query("BEGIN");
                self._txClient = client;
                const result = await fn();
                await client.query("COMMIT");
                return result;
            } catch (e) {
                await client.query("ROLLBACK");
                throw e;
            } finally {
                self._txClient = prevClient;
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
}
