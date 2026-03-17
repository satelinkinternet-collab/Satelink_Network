import { connection as redis } from './redisClient.js';
import { logger } from '../monitoring/logger.js';

const STREAMS = {
    CRITICAL: 'satelink_jobs_critical',
    HIGH: 'satelink_jobs_high',
    NORMAL: 'satelink_jobs_normal',
    LOW: 'satelink_jobs_low',
    DEAD: 'satelink_jobs_dead'
};

const GROUP_NAME = 'satelink_workers';

/**
 * JobQueue handles direct interactions with Redis Streams.
 */
export class JobQueue {
    static async enqueue(job) {
        const { id, type, client_id, payload, reward, priority = 'NORMAL' } = job;
        const stream = STREAMS[priority.toUpperCase()] || STREAMS.NORMAL;

        try {
            const result = await redis.xadd(
                stream,
                '*',
                'job_id', id,
                'job_type', type,
                'client_id', client_id,
                'payload', JSON.stringify(payload),
                'reward_usdt', reward.toString(),
                'priority', priority.toUpperCase(),
                'created_at', Date.now().toString()
            );
            return result;
        } catch (error) {
            logger.error({ error: error.message, job_id: id, stream }, 'Failed to enqueue job to Redis Stream');
            throw error;
        }
    }

    /**
     * Ensures consumer groups exist for all priority streams.
     */
    static async initGroups() {
        for (const stream of Object.values(STREAMS)) {
            try {
                // MKSTREAM flag ensures the stream is created if it doesn't exist
                await redis.xgroup('CREATE', stream, GROUP_NAME, '$', 'MKSTREAM');
                logger.info({ stream, group: GROUP_NAME }, 'Consumer group initialized');
            } catch (err) {
                if (err.message.includes('BUSYGROUP')) {
                    // Group already exists, which is fine
                    continue;
                }
                logger.error({ error: err.message, stream }, 'Failed to initialize consumer group');
            }
        }
    }

    static async getLength(priority) {
        try {
            if (priority) {
                const stream = STREAMS[priority.toUpperCase()] || STREAMS.NORMAL;
                return await redis.xlen(stream);
            }
            // Sum all streams if no priority specified
            let total = 0;
            for (const stream of Object.values(STREAMS)) {
                total += await redis.xlen(stream);
            }
            return total;
        } catch (error) {
            logger.error({ error: error.message }, 'Failed to get queue length');
            return 0;
        }
    }

    /**
     * Pulls the next available job using Consumer Groups.
     * Workers consume in order: CRITICAL > HIGH > NORMAL > LOW.
     */
    static async pullNext(consumerName, count = 1) {
        try {
            // Consuming order enforcement
            const priorityOrder = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'];

            for (const p of priorityOrder) {
                const stream = STREAMS[p];
                // XREADGROUP GROUP satelink_workers {consumerName} COUNT {count} STREAMS {stream} >
                // '>' means only new jobs never delivered to anyone else
                const results = await redis.xreadgroup(
                    'GROUP', GROUP_NAME, consumerName,
                    'COUNT', count,
                    'STREAMS', stream, '>'
                );

                if (results && results.length > 0) {
                    const entries = results[0][1];
                    return entries.map(([streamId, fields]) => {
                        const job = {};
                        for (let i = 0; i < fields.length; i += 2) {
                            job[fields[i]] = fields[i + 1];
                        }
                        job.payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
                        job.streamId = streamId;
                        job.priority = p;
                        job.sourceStream = stream;
                        return job;
                    });
                }
            }
            return [];
        } catch (error) {
            logger.error({ error: error.message }, 'Failed to pull jobs from Consumer Group');
            return [];
        }
    }

    /**
     * Acknowledges a job in its specific stream.
     */
    static async acknowledge(stream, streamId) {
        try {
            // XACK {stream} satelink_workers {streamId}
            await redis.xack(stream, GROUP_NAME, streamId);
            // Optional: XDEL to keep stream small, but XACK is primary for consumer group PEL cleanup
            await redis.xdel(stream, streamId);
        } catch (error) {
            logger.error({ error: error.message, stream, streamId }, 'Failed to acknowledge job');
        }
    }

    /**
     * Moves a job to the Dead Letter Queue.
     */
    static async moveToDLQ(job, reason) {
        try {
            await redis.xadd(
                STREAMS.DEAD,
                '*',
                'job_id', job.job_id,
                'origin_stream', job.sourceStream,
                'reason', reason,
                'payload', JSON.stringify(job.payload),
                'failed_at', Date.now().toString()
            );
            await this.acknowledge(job.sourceStream, job.streamId);
            logger.warn({ job_id: job.job_id, reason }, 'Job moved to DLQ');
        } catch (error) {
            logger.error({ error: error.message, job_id: job.job_id }, 'Failed to move job to DLQ');
        }
    }
}
