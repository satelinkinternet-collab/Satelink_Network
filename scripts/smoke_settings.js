import axios from 'axios';

const BASE_URL = process.env.API_BASE_URL || "http://localhost:8080";
const api = axios.create({ baseURL: BASE_URL, timeout: 15000, validateStatus: () => true });

function dumpAxiosError(err) {
    console.error("Axios message:", err?.message);
    console.error("Axios code:", err?.code);
    console.error("Request URL:", err?.config?.baseURL ? err.config.baseURL + err.config.url : err?.config?.url);
    console.error("Response status:", err?.response?.status);
    console.error("Response data:", err?.response?.data);
}

async function run() {
    console.log("=== Smoke Test: /me/settings ===\n");
    console.log(`Using BASE_URL: ${BASE_URL}\n`);

    try {
        console.log("1. Hitting /me/settings without auth...");
        const res1 = await api.get(`/me/settings`);

        if (res1.status === 401 && res1.data?.code === 'UNAUTHENTICATED') {
            console.log("   ✅ PASS: Got 401 Unauthorized:", res1.data);
        } else {
            console.log(`   ❌ FAIL: Expected 401 but got ${res1.status}:`, res1.data);
        }
    } catch (e) {
        console.log("   ❌ FAIL: Unexpected error");
        dumpAxiosError(e);
    }

    try {
        console.log("\n2. Getting dev token...");
        const loginRes = await api.post(`/__test/auth/login`, {
            wallet: '0x1234567890abcdef',
            role: 'node_operator'
        });

        if (loginRes.status !== 200 || !loginRes.data.token) {
            console.log("   ❌ FAIL: Could not mint dev token. Status:", loginRes.status, loginRes.data);
            return;
        }

        const token = loginRes.data.token;
        console.log("   ✅ PASS: Got token", token.substring(0, 15) + "...");

        console.log("\n3. Hitting /me/settings with auth...");
        const res3 = await api.get(`/me/settings`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res3.status === 200 && res3.data?.ok) {
            console.log("   ✅ PASS: Got 200 OK:", res3.data);
        } else {
            console.log(`   ❌ FAIL: Expected 200 with auth but got ${res3.status}:`, res3.data);
        }
    } catch (e) {
        console.log("   ❌ FAIL: Error with auth");
        dumpAxiosError(e);
    }
}

run();
