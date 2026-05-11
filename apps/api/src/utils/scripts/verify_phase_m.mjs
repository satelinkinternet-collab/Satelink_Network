
import { UniversalDB } from '../../core/db/index.js';
import { BreakevenService } from '../../economics/breakeven_service.js';
import { RetentionService } from '../../economics/retention_service.js';
import { AuthenticityService } from '../../economics/authenticity_service.js';
import { RevenueStabilityService } from '../../economics/revenue_stability_service.js';
import { DensityService } from '../../monitoring/density_service.js';

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
