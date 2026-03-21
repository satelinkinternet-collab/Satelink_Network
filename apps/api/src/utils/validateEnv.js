export function validateEnv() {
    // Provide defaults for local/Docker dev so the system can boot
    if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'development';
    }

    // C-06: JWT_SECRET required in ALL environments — no fallback, no hardcoded defaults
    if (!process.env.JWT_SECRET) {
        console.error('[FATAL] JWT_SECRET is not defined. Required in ALL environments.');
        console.error('Set JWT_SECRET in .env or .env.local before starting the server.');
        process.exit(1);
    }

    // JWT Length assertion (production only)
    const secret = process.env.JWT_SECRET;
    if (process.env.NODE_ENV === 'production' && secret && secret.length < 64) {
        console.error(`JWT_SECRET is too short (${secret.length} chars). Minimum 64 chars required.`);
        process.exit(1);
    }

    // Require DATABASE_URL — no fallback to avoid hidden host mismatches
    if (!process.env.DATABASE_URL) {
        console.error('[FATAL] DATABASE_URL must be provided. Set it in .env or .env.local.');
        process.exit(1);
    }

    // Force DB_TYPE=postgres
    if (process.env.DB_TYPE && process.env.DB_TYPE !== 'postgres') {
        console.error(`[FATAL] DB_TYPE '${process.env.DB_TYPE}' is not supported. Standardized to 'postgres'.`);
        process.exit(1);
    }
    process.env.DB_TYPE = 'postgres';

    // Enforcement of REAL mode and Blockchain variables
    const isProd = process.env.NODE_ENV === 'production';
    const mode = process.env.SATELINK_MODE || 'simulation';
    const realSettlement = process.env.FEATURE_REAL_SETTLEMENT === 'true';

    if (isProd) {
        if (mode !== 'production') {
            console.error(`[FATAL] SATELINK_MODE must be 'production' in production environment. Current: ${mode}`);
            process.exit(1);
        }
        if (!realSettlement) {
            console.error('[FATAL] FEATURE_REAL_SETTLEMENT must be true for production payouts.');
            process.exit(1);
        }
        
        const requiredBlockchainVars = [
            'FUSE_RPC_URL',
            'FUSE_PRIVATE_KEY',
            'FUSE_USDT_CONTRACT'
        ];

        for (const v of requiredBlockchainVars) {
            if (!process.env[v] || process.env[v].includes('REPLACE')) {
                console.error(`[FATAL] Missing required blockchain configuration: ${v}`);
                process.exit(1);
            }
        }
    }

    if (!process.env.DATABASE_URL) {
        console.error('[FATAL] DATABASE_URL must be provided for all environments.');
        process.exit(1);
    }

    console.log(`✅ Environment validated (${process.env.NODE_ENV})`);
}
