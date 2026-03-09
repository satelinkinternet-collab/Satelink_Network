import { JobQueue } from '../../../queue/job_queue.js';

async function test() {
    console.log("Initializing Queue...");
    const queue = new JobQueue(); // defaults to localhost:6379

    try {
        await queue.wipe();

        await queue.push_job({ id: 'f1', type: 'free_op', priority: 'free' });
        await queue.push_job({ id: 'e1', type: 'ent_op', priority: 'enterprise' });
        await queue.push_job({ id: 'd1', type: 'dev_op', priority: 'developer' });
        await queue.push_job({ id: 'e2', type: 'ent_op_2', priority: 'enterprise' });

        const p1 = await queue.pop_job();
        const p2 = await queue.pop_job();
        const p3 = await queue.pop_job();
        const p4 = await queue.pop_job();

        console.log("Popped 1:", p1?.id);
        console.log("Popped 2:", p2?.id);
        console.log("Popped 3:", p3?.id);
        console.log("Popped 4:", p4?.id);

        if (p1.id === 'e1' && p2.id === 'e2' && p3.id === 'd1' && p4.id === 'f1') {
            console.log("Priority logic verified!");
            process.exit(0);
        } else {
            console.error("Priority logic failed!");
            process.exit(1);
        }

    } catch (e) {
        console.error("Test failed. Redis running?", e.message);
        process.exit(1);
    }
}

test();
