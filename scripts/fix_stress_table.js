
import { UniversalDB } from '../src/db/index.js';
const config = {
    type: 'sqlite',
    connectionString: process.env.SQLITE_PATH || 'satelink.db'
};

async function fix() {
    const db = new UniversalDB(config);
    await db.init();

    console.log("Dropping stress_test_runs...");
    await db.query("DROP TABLE IF EXISTS stress_test_runs");
    console.log("Done. Server restart will recreate it.");
}

fix();
