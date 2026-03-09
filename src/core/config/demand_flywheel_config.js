/**
 * Demand Flywheel Engine — Configuration
 *
 * Controls the behavior of the Autonomous Demand Flywheel system.
 * All numeric thresholds can be overridden via environment variables.
 *
 * This file is safe to tune at runtime by editing and hot-reloading.
 * It does NOT modify any protected modules.
 */

export const flywheelConfig = {
    // ── Master switch ─────────────────────────────────────────────────────────
    enabled: process.env.FLYWHEEL_ENABLED !== 'false', // default ON

    // ── Generation limits ────────────────────────────────────────────────────
    max_followups_per_workload: parseInt(process.env.FLYWHEEL_MAX_FOLLOWUPS || '5', 10),

    // Maximum flywheel-generated jobs per minute (token bucket)
    max_jobs_per_minute: parseInt(process.env.FLYWHEEL_MAX_JOBS_PER_MIN || '200', 10),

    // ── Client prediction ────────────────────────────────────────────────────
    // How many hours of client workload history to retain in memory
    prediction_window_hours: parseInt(process.env.FLYWHEEL_PREDICTION_WINDOW_HOURS || '24', 10),

    // How many times a client must repeat a task type before we predict/pre-schedule
    prediction_threshold: parseInt(process.env.FLYWHEEL_PREDICTION_THRESHOLD || '3', 10),

    // ── Strategy toggles ─────────────────────────────────────────────────────
    strategies: {
        chain_expansion: true,       // Strategy 1: block chain expansion
        data_dependency: true,       // Strategy 2: related entity fetching
        verification_jobs: true,     // Strategy 3: health / signature checks
        client_prediction: true,     // Strategy 4: future task pre-scheduling
    },

    // ── Verification job cadence ─────────────────────────────────────────────
    // Verification tasks are generated every N completions (1-in-N)
    verification_cadence: parseInt(process.env.FLYWHEEL_VERIFICATION_CADENCE || '5', 10),

    // ── DemandBuffer source key ───────────────────────────────────────────────
    // Must be distinct from genesis ('genesis'), gw ('rpc','webhook','ai'), etc.
    demand_source_key: 'demand_flywheel',

    // ── Recent-jobs ring buffer size (for /admin/flywheel/recent) ───────────
    recent_jobs_limit: 50,

    // ── Loop guard identifier ────────────────────────────────────────────────
    // Jobs tagged with this source key are NEVER re-processed by the flywheel
    flywheel_source_tag: 'demand_flywheel',
};
