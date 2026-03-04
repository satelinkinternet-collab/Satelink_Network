import { OperationsEngine } from '../src/services/operations-engine.js';

/**
 * Wraps a raw better-sqlite3 `db` into the async opsEngine interface
 * that all route factories expect: opsEngine.db.get(sql, params), opsEngine.db.query(sql, params)
 */
export function createOpsEngine(rawDb) {
    // Async db wrapper matching what routes expect
    const asyncDb = {
        get: async (sql, params = []) => {
            try {
                return rawDb.prepare(sql).get(...params);
            } catch (e) {
                console.error('[DB.get]', e.message, sql);
                return undefined;
            }
        },
        query: async (sql, params = []) => {
            try {
                const trimmed = sql.trimStart().toUpperCase();
                if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.startsWith('WITH')) {
                    return rawDb.prepare(sql).all(...params);
                }
                const info = rawDb.prepare(sql).run(...params);
                return { ...info, lastID: info.lastInsertRowid };
            } catch (e) {
                console.error('[DB.query]', e.message, sql);
                return trimmed?.startsWith?.('SELECT') ? [] : { changes: 0, lastID: 0 };
            }
        },
        run: async (sql, params = []) => {
            try {
                const info = rawDb.prepare(sql).run(...params);
                return { ...info, lastID: info.lastInsertRowid };
            } catch (e) {
                console.error('[DB.run]', e.message, sql);
                return { changes: 0, lastID: 0 };
            }
        },
        all: async (sql, params = []) => {
            try {
                return rawDb.prepare(sql).all(...params);
            } catch (e) {
                console.error('[DB.all]', e.message, sql);
                return [];
            }
        },
        exec: async (sql) => {
            try {
                return rawDb.exec(sql);
            } catch (e) {
                console.error('[DB.exec]', e.message);
            }
        },
        prepare: (sql) => rawDb.prepare(sql),
        transaction: (fn) => {
            const tx = rawDb.transaction(fn);
            return (...args) => tx(...args);
        }
    };

    // Create OperationsEngine with the raw db for its internal methods
    const engine = new OperationsEngine(rawDb, null);
    // Seed tables synchronously (better-sqlite3 is sync, awaits are no-ops)
    try {
        engine.seed();
        engine.initialized = true;
    } catch (e) {
        console.error('[OpsEngine] seed error:', e.message);
    }

    // Return a proxy: opsEngine.db = asyncDb, everything else delegates to engine
    return new Proxy(engine, {
        get(target, prop) {
            if (prop === 'db') return asyncDb;
            return target[prop];
        }
    });
}
