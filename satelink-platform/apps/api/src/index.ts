import Fastify from 'fastify'

const fastify = Fastify({
    logger: true
})

// Database models
import { prisma } from '@satelink/database'

fastify.get('/', async function handler(request, reply) {
    return { status: 'api-online', db: !!prisma }
})

fastify.post('/auth/login', async function handler(request, reply) {
    return { ok: true, token: 'mock-jwt-token-replace-later' }
})

fastify.post('/workloads/submit', async function handler(request, reply) {
    return { ok: true, workloadId: 'mock-workload-id' }
})

fastify.get('/nodes/status', async function handler(request, reply) {
    const nodes = await prisma.node.findMany()
    return { ok: true, nodes }
})

const start = async () => {
    try {
        await fastify.listen({ port: 4000, host: '0.0.0.0' })
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
}
start()
