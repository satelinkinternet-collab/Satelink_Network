
import { UniversalDB } from '../src/db/index.js';
import { BreakevenService } from '../src/services/economics/breakeven_service.js';
import { RetentionService } from '../src/services/growth/retention_service.js';
import { AuthenticityService } from '../src/services/economics/authenticity_service.js';
import { RevenueStabilityService } from '../src/services/economics/revenue_stability_service.js';
import { DensityService } from '../src/services/network/density_service.js';

const config = {
    type: 'sqlite',
    connectionString: process.env.SQLITE_PATH || 'satelink.db'
};

async function verify() {
    const db = new UniversalDB(config);
    await db.init();

    console.log("Running Econ Services manually...");

    const be = new BreakevenService(db);
    await be.runDailyJob();
    console.log("✅ Breakeven Job Ran");

    const ret = new RetentionService(db);
    await ret.runDailyJob();
    console.log("✅ Retention Job Ran");

    const auth = new AuthenticityService(db);
    await auth.runDailyJob();
    console.log("✅ Authenticity Job Ran");

    const stab = new RevenueStabilityService(db);
    await stab.runDailyJob();
    console.log("✅ Stability Job Ran");

    const den = new DensityService(db);
    await den.runDailyJob();
    console.log("✅ Density Job Ran");

    process.exit(0);
}

verify().catch(console.error);
