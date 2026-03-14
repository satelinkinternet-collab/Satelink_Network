import * as path from 'path';
import * as fs from 'fs';

// Use better-sqlite3 for lightweight local state persistence
let Database: any;
try {
    Database = require('better-sqlite3');
} catch {
    // Fallback: if better-sqlite3 isn't installed, use JSON file storage
    Database = null;
}

const STATE_DIR = path.join(process.env.HOME || '/tmp', '.satelink');
const DB_PATH = path.join(STATE_DIR, 'node_state.db');

interface PendingJob {
    job_id: string;
    payload: string;
    attempts: number;
    last_attempt_at: number;
}

/**
 * NodeState provides SQLite-based persistent state for the node agent.
 * Tracks identity, pending jobs, and configuration across restarts.
 */
export class NodeState {
    private db: any;
    private useJsonFallback: boolean;
    private jsonPath: string;

    constructor() {
        this.useJsonFallback = !Database;
        this.jsonPath = path.join(STATE_DIR, 'node_state.json');
    }

    initialize(): void {
        if (!fs.existsSync(STATE_DIR)) {
            fs.mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
        }

        if (this.useJsonFallback) {
            if (!fs.existsSync(this.jsonPath)) {
                fs.writeFileSync(this.jsonPath, JSON.stringify({ identity: null, pending_jobs: [] }));
            }
            return;
        }

        this.db = new Database(DB_PATH);
        this.db.pragma('journal_mode = WAL');

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS node_identity (
                node_id TEXT PRIMARY KEY,
                control_plane_url TEXT,
                registered_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS pending_jobs (
                job_id TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0,
                last_attempt_at INTEGER NOT NULL
            );
        `);
    }

    // --- Identity persistence ---

    saveIdentity(nodeId: string, controlPlaneUrl: string): void {
        if (this.useJsonFallback) {
            const data = this._readJson();
            data.identity = { node_id: nodeId, control_plane_url: controlPlaneUrl, registered_at: Date.now() };
            this._writeJson(data);
            return;
        }

        this.db.prepare(`
            INSERT OR REPLACE INTO node_identity (node_id, control_plane_url, registered_at)
            VALUES (?, ?, ?)
        `).run(nodeId, controlPlaneUrl, Date.now());
    }

    getIdentity(): { node_id: string; control_plane_url: string; registered_at: number } | null {
        if (this.useJsonFallback) {
            return this._readJson().identity || null;
        }

        return this.db.prepare('SELECT * FROM node_identity LIMIT 1').get() || null;
    }

    isRegistered(): boolean {
        return this.getIdentity() !== null;
    }

    // --- Pending jobs for crash recovery ---

    savePendingJob(jobId: string, payload: object): void {
        if (this.useJsonFallback) {
            const data = this._readJson();
            const existing = data.pending_jobs.findIndex((j: any) => j.job_id === jobId);
            const entry = { job_id: jobId, payload: JSON.stringify(payload), attempts: 0, last_attempt_at: Date.now() };
            if (existing >= 0) {
                data.pending_jobs[existing] = entry;
            } else {
                data.pending_jobs.push(entry);
            }
            this._writeJson(data);
            return;
        }

        this.db.prepare(`
            INSERT OR REPLACE INTO pending_jobs (job_id, payload, attempts, last_attempt_at)
            VALUES (?, ?, 0, ?)
        `).run(jobId, JSON.stringify(payload), Date.now());
    }

    getPendingJobs(): PendingJob[] {
        if (this.useJsonFallback) {
            return this._readJson().pending_jobs || [];
        }

        return this.db.prepare('SELECT * FROM pending_jobs ORDER BY last_attempt_at ASC').all();
    }

    markJobAttempted(jobId: string): void {
        if (this.useJsonFallback) {
            const data = this._readJson();
            const job = data.pending_jobs.find((j: any) => j.job_id === jobId);
            if (job) {
                job.attempts++;
                job.last_attempt_at = Date.now();
            }
            this._writeJson(data);
            return;
        }

        this.db.prepare(`
            UPDATE pending_jobs SET attempts = attempts + 1, last_attempt_at = ? WHERE job_id = ?
        `).run(Date.now(), jobId);
    }

    removePendingJob(jobId: string): void {
        if (this.useJsonFallback) {
            const data = this._readJson();
            data.pending_jobs = data.pending_jobs.filter((j: any) => j.job_id !== jobId);
            this._writeJson(data);
            return;
        }

        this.db.prepare('DELETE FROM pending_jobs WHERE job_id = ?').run(jobId);
    }

    // --- JSON fallback helpers ---

    private _readJson(): any {
        try {
            return JSON.parse(fs.readFileSync(this.jsonPath, 'utf8'));
        } catch {
            return { identity: null, pending_jobs: [] };
        }
    }

    private _writeJson(data: any): void {
        fs.writeFileSync(this.jsonPath, JSON.stringify(data, null, 2));
    }

    close(): void {
        if (this.db) this.db.close();
    }
}
