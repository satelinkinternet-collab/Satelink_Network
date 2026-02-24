import dotenv from 'dotenv';
dotenv.config();

import { NodeOpsAdapter } from "../src/settlement/adapters/NodeOpsAdapter.js";
async function runSmokeTest() {
    console.log("========================================");
    console.log(" NodeOps CreateOS Adapter Smoke Test");
    console.log(" (Read-Only: Calls GET endpoints only)");
    console.log("========================================");

    const apiKey = process.env.NODEOPS_CREATEOS_API_KEY;
    if (!apiKey) {
        console.error("❌ Error: NODEOPS_CREATEOS_API_KEY environment variable is not set.");
        console.error("   Please set it before running this test.");
        process.exit(1);
    }

    console.log("✅ NODEOPS_CREATEOS_API_KEY is present.");

    // Initialize adapter
    const adapter = new NodeOpsAdapter();
    console.log(`🔌 Adapter Name: ${adapter.getName()}`);
    console.log(`🌐 Base URL:   ${adapter.baseUrl}`);
    console.log(`🔑 Auth Mode:  ${adapter.authMode}`);
    if (adapter.orgId) console.log(`🏢 Org ID:     ${adapter.orgId}`);
    if (adapter.workspaceId) console.log(`💼 Workspace:  ${adapter.workspaceId}`);

    try {
        // 1. Health Check (Identity)
        console.log("\n[1/2] Running Health Check (GET /v1/users/me)...");
        const health = await adapter.healthCheck();

        if (!health.ok) {
            console.error("❌ Health check failed:", health.error);
            process.exit(1);
        }

        console.log(`✅ Health check passed!`);
        console.log(`   Latency: ${health.latency_ms}ms`);
        console.log(`   User: ${health.user}`);

        // 2. List Projects (Read-Only)
        console.log("\n[2/2] Fetching recent projects (GET /v1/projects?limit=5)...");
        const projects = await adapter.listProjects(5);

        console.log(`✅ Successfully fetched projects.`);

        if (Array.isArray(projects) && projects.length > 0) {
            console.log(`   Found ${projects.length} project(s):`);
            projects.forEach((p, i) => {
                console.log(`   ${i + 1}. [${p.id}] ${p.displayName || p.uniqueName || 'Unnamed'} (Type: ${p.type})`);
            });
        } else {
            console.log("   No projects found on this account yet.");
        }

        console.log("\n🎉 Smoke test completed successfully!");
        process.exit(0);

    } catch (err) {
        console.error("\n❌ Smoke test failed with an unhandled error:");
        console.error(err.message);
        if (err.nodeOpsCode) {
            console.error(`   Error Code: ${err.nodeOpsCode}`);
        }
        if (err.statusCode) {
            console.error(`   HTTP Status: ${err.statusCode}`);
        }
        process.exit(1);
    }
}

runSmokeTest();
