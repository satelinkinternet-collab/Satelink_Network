import { Router } from 'express';
import { JobProducer } from '../../queue/job_producer.js';

const SCHEDULE_INTERVALS_MS = {
    every_minute: 60_000,
    every_5_minutes: 300_000,
    hourly: 3_600_000,
    daily: 86_400_000
};

const VALID_SCHEDULES = new Set(Object.keys(SCHEDULE_INTERVALS_MS));

export class AutomationScheduler {
    constructor(db) {
        this.db = db;
        this.producer = new JobProducer(db);
        this._timers = new Map();
        this._running = false;
        // Fire-and-forget async init
        this._initPromise = this._ensureTable().catch(e => {
            console.warn('[AutomationScheduler] Init warning:', e.message);
        });
    }

    start() {
        if (this._running) return;
        this._running = true;
        // Wait for table creation before reloading
        this._initPromise.then(() => this._reloadPersistedJobs()).catch(() => {});
        console.log('[AutomationScheduler] Started.');
    }

    stop() {
        this._running = false;
        for (const [, timer] of this._timers) clearInterval(timer);
        this._timers.clear();
        console.log('[AutomationScheduler] Stopped.');
    }

    async register({ job_type, schedule, payload }) {
        if (!job_type) throw new Error('job_type is required');
        if (!VALID_SCHEDULES.has(schedule)) throw new Error('invalid schedule');
        if (!payload || typeof payload !== 'object') throw new Error('payload must be an object');

        const job_id = `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const interval = SCHEDULE_INTERVALS_MS[schedule];

        try {
            await this.db.prepare(`
                INSERT INTO automation_jobs (job_id, job_type, schedule, interval_ms, payload, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'active', ?)
            `).run(job_id, job_type, schedule, interval, JSON.stringify(payload), Date.now());
        } catch (e) {
            console.warn('[AutomationScheduler] Persist warning:', e.message);
        }

        this._scheduleTimer(job_id, job_type, interval, payload);
        return { ok: true, job_id, schedule, interval_ms: interval };
    }

    async cancel(job_id) {
        const timer = this._timers.get(job_id);
        if (timer) {
            clearInterval(timer);
            this._timers.delete(job_id);
        }
        try {
            await this.db.prepare(`UPDATE automation_jobs SET status = 'cancelled' WHERE job_id = ?`).run(job_id);
        } catch (_) { }
        return { ok: true, job_id };
    }

    async list() {
        try {
            return await this.db.prepare('SELECT * FROM automation_jobs ORDER BY created_at DESC').all();
        } catch (_) { return []; }
    }

    async _ensureTable() {
        await this.db.prepare(`
            CREATE TABLE IF NOT EXISTS automation_jobs (
                job_id      TEXT PRIMARY KEY,
                job_type    TEXT NOT NULL,
                schedule    TEXT NOT NULL,
                interval_ms INTEGER NOT NULL,
                payload     TEXT NOT NULL DEFAULT '{}',
                status      TEXT NOT NULL DEFAULT 'active',
                created_at  INTEGER NOT NULL,
                last_fire   INTEGER
            )
        `).run();
    }

    async _reloadPersistedJobs() {
        try {
            const active = await this.db.prepare(`SELECT * FROM automation_jobs WHERE status = 'active'`).all();
            for (const row of active) {
                const payload = JSON.parse(row.payload || '{}');
                this._scheduleTimer(row.job_id, row.job_type, row.interval_ms, payload);
            }
        } catch (e) { }
    }

    _scheduleTimer(job_id, job_type, interval_ms, payload) {
        if (this._timers.has(job_id)) return;
        const timer = setInterval(async () => {
            await this._fire(job_id, job_type, payload);
        }, interval_ms);
        this._timers.set(job_id, timer);
    }

    async _fire(job_id, job_type, payload) {
        try {
            await this.producer.produce({
                type: 'automation_job',
                client_id: 'automation_scheduler',
                payload: { job_id, job_type, context: payload },
                reward: 0.10,
                priority: 'NORMAL'
            });

            try {
                await this.db.prepare(`UPDATE automation_jobs SET last_fire = ? WHERE job_id = ?`).run(Date.now(), job_id);
            } catch (_) { }
            console.log(`[AutomationScheduler] Fired ${job_id}`);
        } catch (err) {
            console.error(`[AutomationScheduler] Fire error:`, err.message);
        }
    }
}

export function createAutomationRouter(scheduler) {
    const router = Router();
    router.post('/', async (req, res) => {
        try {
            const result = await scheduler.register(req.body);
            res.status(201).json(result);
        } catch (err) {
            res.status(400).json({ ok: false, error: err.message });
        }
    });
    router.get('/', async (req, res) => res.status(200).json({ ok: true, jobs: await scheduler.list() }));
    router.delete('/:id', async (req, res) => res.status(200).json(await scheduler.cancel(req.params.id)));
    return router;
}
