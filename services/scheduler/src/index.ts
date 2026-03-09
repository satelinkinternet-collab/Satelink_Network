import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@satelink/database';

const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
});

const workloadQueue = new Queue('workloads', { connection });

const worker = new Worker('workloads', async job => {
    console.log('Processing workload job:', job.id);
    // Implementation for tracking completion, assigning nodes, splitting jobs
}, { connection });

worker.on('completed', job => {
    console.log(`${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
    console.log(`${job?.id} has failed with ${err.message}`);
});

console.log('Scheduler Service Started');
