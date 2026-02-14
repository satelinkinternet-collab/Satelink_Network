#!/usr/bin/env node

/**
 * Satelink Example CLI
 * Demonstrates how to use the Public API to execute operations.
 * 
 * Usage:
 *   export SATELINK_API_KEY=sk_...
 *   ./index.js [op_type] [payload_json]
 */

const API_KEY = process.env.SATELINK_API_KEY;
const BASE_URL = process.env.SATELINK_URL || 'http://localhost:8080';

if (!API_KEY) {
    console.error('Error: SATELINK_API_KEY env var not set.');
    process.exit(1);
}

const opType = process.argv[2] || 'social_sentiment';
const payloadRaw = process.argv[3] || '{"query":"Satelink"}';

async function main() {
    try {
        console.log(`[CLI] Connecting to ${BASE_URL}...`);

        // 1. Get Pricing
        const pricingRes = await fetch(`${BASE_URL}/v1/ops/pricing`, {
            headers: { 'X-API-Key': API_KEY }
        });
        const pricing = await pricingRes.json();
        // console.log('[Pricing]', pricing);

        // 2. Execute Op
        console.log(`[CLI] Executing ${opType}...`);
        const start = Date.now();

        const res = await fetch(`${BASE_URL}/v1/ops/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
                'Idempotency-Key': `cli-${Date.now()}`
            },
            body: JSON.stringify({
                op_type: opType,
                payload: JSON.parse(payloadRaw)
            })
        });

        const json = await res.json();
        const duration = Date.now() - start;

        if (res.ok && json.ok) {
            console.log('✅ Success!');
            console.log('Job ID:', json.eventId);
            console.log('Cost:', json.amount);
            console.log('Duration:', duration + 'ms');
        } else {
            console.error('❌ Failed:', json);
            if (res.headers.get('x-trace-id')) {
                console.error('Trace ID:', res.headers.get('x-trace-id'));
            }
        }

    } catch (e) {
        console.error('CRITICAL ERROR:', e.message);
    }
}

main();
