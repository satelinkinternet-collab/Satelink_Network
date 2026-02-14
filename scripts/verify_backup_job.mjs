
import { UniversalDB } from '../src/db/index.js';
import { BackupService } from '../src/services/backup_service.js';
import path from 'path';

// Mock Config
const config = {
    type: 'sqlite',
    connectionString: process.env.SQLITE_PATH || 'satelink.db'
};

async function test() {
    console.log("Phase K6 Verification: Backup Service");
    const db = new UniversalDB(config);
    await db.init();

    const backupService = new BackupService(db);
    await backupService.init();

    console.log("1. Running Backup...");
    const result = await backupService.runBackup('verification_test');

    if (!result.ok) {
        console.error("❌ Backup Failed:", result.error);
        process.exit(1);
    }
    console.log(`✅ Backup Created at: ${result.id}`);

    // We can't verify by ID easily because runBackup doesn't return the ID, only the path.
    // So we query the log for the latest ID.
    const latest = await db.get("SELECT id FROM backup_log ORDER BY id DESC LIMIT 1");

    console.log(`2. Verifying Backup ID: ${latest.id}...`);
    const verify = await backupService.verifyBackup(latest.id);

    if (verify.valid) {
        console.log("✅ Backup Verified Successfully!");
        process.exit(0);
    } else {
        console.error("❌ Verification Failed!", verify);
        process.exit(1);
    }
}

test();
