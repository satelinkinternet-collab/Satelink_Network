import request from 'supertest';
import { createApp } from '../app_factory.mjs';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';

async function runTests() {
    console.log("Starting Auth Validation Tests...");
    const db = new Database(':memory:');

    // Minimal schema for auth
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, password_hash TEXT, role TEXT, created_at INTEGER);
        CREATE TABLE IF NOT EXISTS user_roles (wallet TEXT PRIMARY KEY, role TEXT, updated_at INTEGER);
    `);

    // Ensure JWT_SECRET is set
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'a'.repeat(64);
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'b'.repeat(64);

    const app = createApp(db);

    const secret = process.env.JWT_SECRET;

    // 1. Generate node JWT
    const nodeJwt = jwt.sign(
        { userId: 'node1', wallet: '0xnode', role: 'node_operator', type: 'access' },
        secret,
        { expiresIn: '15m', issuer: 'satelink-network' }
    );

    // 2. Generate expired JWT
    const expiredJwt = jwt.sign(
        { userId: 'node1', wallet: '0xnode', role: 'node_operator', type: 'access' },
        secret,
        { expiresIn: '-1s', issuer: 'satelink-network' }
    );

    let allPassed = true;

    const assertStatus = (res, expected, name) => {
        if (res.status === expected) {
            console.log(`✅ PASS: ${name}`);
        } else {
            console.error(`❌ FAIL: ${name} (Expected ${expected}, got ${res.status})`);
            allPassed = false;
        }
    };

    // Test: Login as node -> access admin dashboard -> expect 403
    // Note: Admin dashboard UI is at /ui/admin or backend api is /admin-api
    // Let's test an admin API endpoint like /nodes/bootstrap-payment
    const res1 = await request(app)
        .post('/nodes/bootstrap-payment')
        .set('Authorization', \`Bearer \${nodeJwt}\`);
    assertStatus(res1, 403, "Node user accessing admin endpoint -> 403");

    // Test: Expired JWT manually -> expect forced logout (Backend: expect 401)
    const resExpires = await request(app)
        .post('/nodes/bootstrap-payment')
        .set('Authorization', \`Bearer \${expiredJwt}\`);
    assertStatus(resExpires, 401, "Expired JWT -> 401 Unauthorized");

    // Test: Curl admin endpoint without token -> expect 401
    const resNoToken = await request(app)
        .post('/nodes/bootstrap-payment');
    assertStatus(resNoToken, 401, "Admin endpoint without token -> 401");

    // Test: Curl admin endpoint with node JWT -> expect 403
    const resNodeAgn = await request(app)
        .post('/epoch/finalize')
        .set('Authorization', \`Bearer \${nodeJwt}\`);
    assertStatus(resNodeAgn, 403, "Admin endpoint with node JWT -> 403");

    if (allPassed) {
        console.log("All Backend API Tests Passed!");
        process.exit(0);
    } else {
        console.error("Some tests failed.");
        process.exit(1);
    }
}

runTests().catch(console.error);
