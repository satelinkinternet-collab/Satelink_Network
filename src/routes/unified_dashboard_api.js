import { Router } from 'express';
import { createAdminApiRouter } from './admin_api_v2.js';
import { createNodeApiRouter } from './node_api_v2.js';
import { createBuilderApiV2Router } from './builder_api_v2.js';
import { createDistApiRouter } from './dist_api_v2.js';
import { createEntApiRouter } from './ent_api_v2.js';

export function createUnifiedDashboardRouter(opsEngine, verifyBuilder) {
    const router = Router();

    // Use specific routers for each role/prefix
    router.use('/admin', createAdminApiRouter(opsEngine));
    router.use('/node', createNodeApiRouter(opsEngine));
    router.use('/builder', verifyBuilder, createBuilderApiV2Router(opsEngine));
    router.use('/dist', verifyBuilder, createDistApiRouter(opsEngine));
    router.use('/ent', verifyBuilder, createEntApiRouter(opsEngine));

    return router;
}
