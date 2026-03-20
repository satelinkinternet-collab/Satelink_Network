import { Router } from 'express';
import { JobProducer } from '../../queue/job_producer.js';

const SCHEDULE_INTERVALS_MS = {
    every_minute: 60_000,
    every_5_minutes: 300_000,
    every_15_minutes: 900_000,
    every_30_minutes: 1_800_000,
    hourly: 3_600_000,
    daily: 86_400_000
};

const VALID_SCHEDULES = new Set(Object.keys(SCHEDULE_INTERVALS_MS));

// Automation pricing: $0.01 per step
const AUTOMATION_STEP_REWARD_USDT = 0.01;

// Maximum steps per automation job
const MAX_STEPS = 10;

// Valid automation step actions
const VALID_ACTIONS = new Set(['http_request', 'transform']);

/**
 * Validate automation steps for safety and correctness.
 */
function validateSteps(steps) {
    if (!Array.isArray(steps) || steps.length === 0) {
        return { valid: false, error: 'steps must be a non-empty array' };
    }
    if (steps.length > MAX_STEPS) {
        return { valid: false, error: `Maximum ${MAX_STEPS} steps allowed` };
    }
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!step || typeof step !== 'object') {
            return { valid: false, error: `Step ${i} must be an object` };
        }
        if (!step.action || !VALID_ACTIONS.has(step.action)) {
            return { valid: false, error: `Step ${i}: invalid action. Supported: ${[...VALID_ACTIONS].join(', ')}` };
        }
        if (step.action === 'http_request') {
            if (!step.url || typeof step.url !== 'string') {
                return { valid: false, error: `Step ${i}: http_request requires a url` };
            }
            try {
                const parsed = new URL(step.url);
                if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
                    return { valid: false, error: `Step ${i}: only http/https URLs allowed` };
                }
                const h = parsed.hostname.toLowerCase();
                if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '0.0.0.0') {
                    return { valid: false, error: `Step ${i}: target URL must be a public endpoint` };
                }
                const parts = h.split('.');
                if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
                    const [a, b] = parts.map(Number);
                    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) {
                        return { valid: false, error: `Step ${i}: target URL must be a public endpoint` };
                    }
                }
            } catch {
                return { valid: false, error: `Step ${i}: invalid URL format` };
            }
        }
        if (step.action === 'transform' && (!Array.isArray(step.extract) || step.extract.some(k => typeof k !== 'string'))) {
            return { valid: false, error: `Step ${i}: transform requires extract as array of strings` };
        }
    }
    return { valid: true };
}

export class AutomationScheduler {
    constructor(db) {
        this.db = db;
        this.producer = new JobProducer(db);
        this._timers = new Map();
        this._running = false;
    }

    async init() {
        await this._ensureTable();
    }

    async start() {
        if (this._running) return;
        this._running = true;
        await this._reloadPersistedJobs();
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
        if (!VALID_SCHEDULES.has(schedule)) throw new Error(`invalid schedule. Valid: ${[...VALID_SCHEDULES].join(', ')}`);
        if (!payload || typeof payload !== 'object') throw new Error('payload must be an object');

        // Validate steps if present
        if (payload.steps) {
            const stepCheck = validateSteps(payload.steps);
            if (!stepCheck.valid) throw new Error(stepCheck.error);
        }

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
        try {
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
        } catch (e) { }
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
            const stepCount = payload.steps ? payload.steps.length : 1;
            await this.producer.produce({
                type: 'automation_job',
                client_id: 'automation_scheduler',
                payload: { job_id, job_type, steps: payload.steps || [payload], context: payload },
                reward: stepCount * AUTOMATION_STEP_REWARD_USDT,
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
