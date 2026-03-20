import express from 'express';
import crypto from 'crypto';

export function createJobsRouter(db, jobQueue, jobEscrow) {
    const router = express.Router();

    // Mock auth middleware for Developer API Keys
    const authenticateDeveloper = (req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        // Assume valid for testing / internal demo if provided
        if (!apiKey) return res.status(401).json({ error: 'Unauthorized: missing X-API-Key' });
        req.developerId = `dev_${crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 8)}`;
        next();
    };

    /**
     * PART 1: POST /v1/jobs
     * Submits a new infrastructure job to the marketplace
     */
    router.post('/', authenticateDeveloper, async (req, res) => {
        try {
            const { job_type, reward, payload } = req.body;

            // PART 9: SECURITY RULES & VALIDATION
            if (!job_type || typeof job_type !== 'string') {
                return res.status(400).json({ error: 'Invalid or missing job_type' });
            }
            if (!reward || typeof reward !== 'number' || reward < 0.0001) { // Min threshold rule
                return res.status(400).json({ error: 'Reward must be a number >= 0.0001' });
            }
            if (!payload || typeof payload !== 'object') {
                return res.status(400).json({ error: 'Payload must be a valid JSON object' });
            }

            // Size limit rule (Payload max 10KB)
            const payloadString = JSON.stringify(payload);
            if (Buffer.byteLength(payloadString, 'utf8') > 10240) {
                return res.status(413).json({ error: 'Payload exceeds 10KB maximum size' });
            }

            // Create Job ID
            const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

            // Part 3: Escrow Logic (Attempt to lock funds before queuing)
            // If the developer doesn't have funds in their internal balance, this throws
            await jobEscrow.lockFunds(req.developerId, jobId, reward);

            // Insert into marketplace_jobs internal registry (Part 2 Integration)
            await db.prepare(`
                INSERT INTO marketplace_jobs (job_id, job_type, reward, payload, creator_wallet, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'pending', ?)
            `).run(jobId, job_type, reward, payloadString, req.developerId, Date.now());

            // Build the standard internal queue structure
            const internalJob = {
                id: jobId,
                type: job_type,
                reward: reward,
                payload: payload,
                priority: 'developer', // Default priority for marketplace external
                client_id: req.developerId,
                is_marketplace: true
            };

            // Push to Queue (Part 5 routing start)
            await jobQueue.push_job(internalJob);

            // Update status to scheduled
            await db.prepare(`UPDATE marketplace_jobs SET status = 'scheduled' WHERE job_id = ?`).run(jobId);

            res.status(201).json({
                message: 'Job submitted and scheduled successfully',
                job_id: jobId,
                status: 'scheduled'
            });

        } catch (error) {
            console.error("[JobsAPI] Error submitting job:", error);
            if (error.message.includes('Insufficient funds')) {
                return res.status(402).json({ error: 'Insufficient funds for escrow lock' });
            }
            res.status(500).json({ error: 'Internal server error processing job submission' });
        }
    });

    /**
     * PART 8: GET /v1/jobs
     * List all jobs for the authenticated developer
     */
    router.get('/', authenticateDeveloper, async (req, res) => {
        try {
            const jobs = await db.prepare(`SELECT * FROM marketplace_jobs WHERE creator_wallet = ? ORDER BY created_at DESC LIMIT 50`).all(req.developerId);
            res.status(200).json({ jobs });
        } catch (error) {
            res.status(500).json({ error: 'Error fetching jobs' });
        }
    });

    /**
     * PART 8: GET /v1/jobs/:id
     * Get specific job status
     */
    router.get('/:id', authenticateDeveloper, async (req, res) => {
        try {
            const job = await db.prepare(`SELECT * FROM marketplace_jobs WHERE job_id = ? AND creator_wallet = ?`).get(req.params.id, req.developerId);
            if (!job) return res.status(404).json({ error: 'Job not found' });

            res.status(200).json({ job });
        } catch (error) {
            res.status(500).json({ error: 'Error fetching job details' });
        }
    });

    return router;
}
