
import { UniversalDB } from '../src/db/index.js';
import { RetentionCleaner } from '../src/services/retention_cleaner.js';

// Mock DB or use real one? Real one is better but risky if we delete production data.
// We will insert some "old" dummy data first, then run cleaner, then verify.
// We'll use a transaction if possible, or just be careful.

async function verifyRetention() {
    console.log('[Verify] Connecting to DB...');
    const db = new UniversalDB({
        type: 'sqlite',
        connectionString: process.env.SQLITE_PATH || 'satelink.db'
    });
    await db.init();

    const cleaner = new RetentionCleaner(db);

    console.log('[Verify] seeding old data...');
    // Seed an old trace (8 days ago)
    const oldTime = Date.now() - 8 * 24 * 60 * 60 * 1000;
    await db.query(`
        INSERT INTO request_traces (trace_id, method, route, duration_ms, status_code, ip_hash, created_at)
        VALUES (?, 'GET', '/verify-retention', 10, 200, 'test', ?)
    `, [`trace-${Date.now()}`, oldTime]);

    // Seed an old error (31 days ago)
    const olderTime = Date.now() - 31 * 24 * 60 * 60 * 1000;
    await db.query(`
        INSERT INTO error_events (stack_hash, message, last_seen_at, count, status_code)
        VALUES ('hash-verify', 'verify-retention', ?, 1, 500)
    `, [olderTime]);

    console.log('[Verify] Running cleaner...');
    const stats = await cleaner.run();

    console.log('[Verify] Result:', stats);

    // Check if data is gone
    // Note: stats might say 'executed' if delete count isn't returned

    // We can query to check
    const traces = await db.query(`SELECT * FROM request_traces WHERE route = '/verify-retention'`);
    const errors = await db.query(`SELECT * FROM error_events WHERE message = 'verify-retention'`);

    if (traces.length === 0 && errors.length === 0) {
        console.log('✅ PASS: Old data removed.');
    } else {
        console.error('❌ FAIL: Old data still exists.', { traces: traces.length, errors: errors.length });
        process.exit(1);
    }
}

verifyRetention().catch(e => {
    console.error(e);
    process.exit(1);
});
