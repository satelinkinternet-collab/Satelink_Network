import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

class SQLiteClient {
    constructor(dbPath) {
        this.db = new Database(dbPath || 'database.db');
        console.log("[DB] Initialized SQLite Client");
    }

    async query(sql, params = []) {
        // Better-sqlite3 is sync, but we wrap in async to match PG interface for swapping
        try {
            const stmt = this.db.prepare(sql);
            if (sql.trim().toLowerCase().startsWith('select')) {
                return stmt.all(params);
            } else {
                const info = stmt.run(params);
                return info;
            }
        } catch (e) {
            console.error("[SQLite Error]", e.message);
            throw e;
        }
    }

    async get(sql, params = []) {
        const stmt = this.db.prepare(sql);
        return stmt.get(params);
    }
}

class PostgresClient {
    constructor(connectionString) {
        // const { Pool } = require('pg');
        // this.pool = new Pool({ connectionString });
        console.log("[DB] Initialized Postgres Client (Stub)");
    }

    async query(sql, params = []) {
        // const res = await this.pool.query(sql, params);
        // return res.rows;
        throw new Error("Postgres Client not fully implemented yet in Sandbox");
    }

    async get(sql, params = []) {
        // const res = await this.pool.query(sql, params);
        // return res.rows[0];
        throw new Error("Postgres Client not fully implemented yet in Sandbox");
    }
}

export function getValidatedDB(config) {
    if (config.dbType === 'postgres') {
        if (!config.dbUrl) throw new Error("Missing DATABASE_URL for Postgres");
        return new PostgresClient(config.dbUrl);
    } else {
        return new SQLiteClient(process.env.DB_LOCAL_PATH);
    }
}
