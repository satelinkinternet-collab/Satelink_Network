#!/usr/bin/env node
/**
 * Runtime Report Generator — 72-hour Endurance Test
 *
 * Queries the backend API and database to produce a runtime report
 * summarizing the current state of the Satelink system.
 *
 * Output: logs/runtime_report.json
 *
 * Usage:
 *   API_BASE=http://localhost:8080 ADMIN_TOKEN=... node scripts/generate_runtime_report.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE = process.env.API_BASE || 'http://localhost:8080';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'logs');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'runtime_report.json');

const headers = {
    'Content-Type': 'application/json',
    ...(ADMIN_TOKEN ? { Authorization: `Bearer ${ADMIN_TOKEN}` } : {}),
};

async function fetchJSON(urlPath) {
    try {
        const res = await fetch(`${API_BASE}${urlPath}`, { headers });
        if (!res.ok) return { error: `${res.status} ${res.statusText}` };
        return await res.json();
    } catch (e) {
        return { error: e.message };
    }
}

async function generateReport() {
    console.log(`\n=== Satelink Runtime Report Generator ===`);
    console.log(`  API: ${API_BASE}`);
    console.log(`  Output: ${OUTPUT_FILE}\n`);

    const now = new Date();

    // Parallel data collection
    const [health, metrics, networkStats, networkHealth, commandSummary, epochInfo] = await Promise.all([
        fetchJSON('/health'),
        fetchJSON('/metrics/json'),
        fetchJSON('/api/network/stats'),
        fetchJSON('/api/network/health'),
        fetchJSON('/api/admin/command/summary'),
        fetchJSON('/api/admin/rewards/epochs'),
    ]);

    // Parse metrics for specific counters
    let opsExecuted = 0;
    let totalRevenue = 0;
    let errorCount = 0;
    if (metrics?.metrics && Array.isArray(metrics.metrics)) {
        for (const m of metrics.metrics) {
            if (m.name === 'satelink_ops_total') {
                opsExecuted = m.values?.reduce((s, v) => s + (v.value || 0), 0) || 0;
            }
            if (m.name === 'satelink_revenue_usdt_total') {
                totalRevenue = m.values?.reduce((s, v) => s + (v.value || 0), 0) || 0;
            }
            if (m.name === 'satelink_errors_total') {
                errorCount = m.values?.reduce((s, v) => s + (v.value || 0), 0) || 0;
            }
        }
    }

    // Compute error rate
    const errorRate = opsExecuted > 0 ? (errorCount / opsExecuted * 100).toFixed(2) : '0.00';

    // Build report
    const report = {
        generated_at: now.toISOString(),
        api_base: API_BASE,
        system: {
            status: health?.status || 'unknown',
            uptime_seconds: health?.uptime || 0,
            uptime_hours: +(health?.uptime / 3600 || 0).toFixed(2),
            db_status: health?.db || 'unknown',
        },
        economic_pipeline: {
            jobs_executed: opsExecuted,
            total_revenue_usdt: totalRevenue,
            error_count: errorCount,
            error_rate_pct: +errorRate,
        },
        epochs: {
            data: epochInfo?.epochs || epochInfo?.data || commandSummary?.epochs || null,
            closed_count: commandSummary?.epochsClosed || 'N/A',
        },
        node_network: {
            stats: networkStats,
            health: networkHealth?.data || networkHealth,
        },
        command_center: {
            summary: commandSummary,
        },
        memory: {
            note: 'Memory watchdog runs in-process. Check server logs for warnings.',
        },
    };

    // Ensure output directory
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // Write report
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
    console.log(`Report written to: ${OUTPUT_FILE}`);
    console.log(`\n── Summary ──`);
    console.log(`  System:    ${report.system.status} (uptime: ${report.system.uptime_hours}h)`);
    console.log(`  Ops:       ${report.economic_pipeline.jobs_executed}`);
    console.log(`  Revenue:   $${report.economic_pipeline.total_revenue_usdt}`);
    console.log(`  Errors:    ${report.economic_pipeline.error_count} (${report.economic_pipeline.error_rate_pct}%)`);
    console.log(`  Nodes:     ${JSON.stringify(report.node_network.health?.nodeHealth || 'N/A')}`);
    console.log('');
}

generateReport().catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
});
