import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export class BackupService {
    constructor(db) {
        this.db = db;
        this.backupDir = path.resolve(process.cwd(), 'backups');
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    async init() {
        console.log("[BackupService] Initialized. Backup dir:", this.backupDir);
        await this.db.query(`
            CREATE TABLE IF NOT EXISTS backup_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL,
                size_bytes INTEGER,
                checksum TEXT,
                duration_ms INTEGER,
                status TEXT,
                created_at INTEGER
            )
        `);
    }

    async runBackup(type = 'scheduled') {
        const start = Date.now();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const targetFolder = path.join(this.backupDir, `backup_${timestamp}`);

        fs.mkdirSync(targetFolder, { recursive: true });

        console.log(`[Backup] Starting backup to ${targetFolder}...`);

        try {
            // 1. Checkpoint WAL to ensure main DB file is up to date
            // 'TRUNCATE' mode writes all WAL frames to DB and truncates WAL file.
            // This is risky if high concurrency, but for backup integrity it's good.
            // 'PASSIVE' is safer but might leave stuff in WAL.
            // We'll copy DB + WAL + SHM anyway.
            await this.db.query("PRAGMA wal_checkpoint(PASSIVE)");

            // 2. Pause writes? SQLite backup API handles this, but since we are copying files:
            // We should ideally use the Online Backup API. 
            // node-sqlite3 / better-sqlite3 usually have a .backup() method.
            // Assuming we are using a wrapper that might not expose it, file copy is the fallback.
            // Best practice implies locking.
            // "BEGIN IMMEDIATE" locks writes.

            await this.db.query("BEGIN IMMEDIATE");

            // 3. Copy files
            const dbPath = path.resolve(process.cwd(), 'satelink.db');
            const walPath = path.resolve(process.cwd(), 'satelink.db-wal');
            const shmPath = path.resolve(process.cwd(), 'satelink.db-shm');

            const destDb = path.join(targetFolder, 'satelink.db');

            await fs.promises.copyFile(dbPath, destDb);
            if (fs.existsSync(walPath)) await fs.promises.copyFile(walPath, path.join(targetFolder, 'satelink.db-wal'));
            if (fs.existsSync(shmPath)) await fs.promises.copyFile(shmPath, path.join(targetFolder, 'satelink.db-shm'));

            // 4. Release execution lock
            await this.db.query("COMMIT");

            // 5. Compute Checksum
            const fileBuffer = await fs.promises.readFile(destDb);
            const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            const stats = fs.statSync(destDb);

            const duration = Date.now() - start;

            // 6. Log success
            await this.db.query(`
                INSERT INTO backup_log (path, size_bytes, checksum, duration_ms, status, created_at)
                VALUES (?, ?, ?, ?, 'success', ?)
            `, [targetFolder, stats.size, checksum, duration, Date.now()]);

            console.log(`[Backup] Completed in ${duration}ms. Checksum: ${checksum.substring(0, 8)}`);

            return { ok: true, id: targetFolder, checksum, duration };

        } catch (e) {
            console.error("[Backup] Failed:", e);
            try { await this.db.query("ROLLBACK"); } catch (err) { } // Release lock if stuck

            await this.db.query(`
                INSERT INTO backup_log (path, size_bytes, checksum, duration_ms, status, created_at)
                VALUES (?, 0, 'N/A', ?, 'failed', ?)
            `, [targetFolder, Date.now() - start, Date.now()]);

            return { ok: false, error: e.message };
        }
    }

    async getHistory() {
        return await this.db.query("SELECT * FROM backup_log ORDER BY id DESC LIMIT 50");
    }

    async verifyBackup(id) {
        // ID is integer from log
        const record = await this.db.get("SELECT * FROM backup_log WHERE id = ?", [id]);
        if (!record) throw new Error("Backup not found");

        const dbPath = path.join(record.path, 'satelink.db');
        if (!fs.existsSync(dbPath)) throw new Error("Backup files missing on disk");

        const fileBuffer = await fs.promises.readFile(dbPath);
        const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        return {
            valid: checksum === record.checksum,
            recorded: record.checksum,
            computed: checksum
        };
    }
}
