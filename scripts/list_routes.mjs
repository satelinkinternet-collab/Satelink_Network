import listEndpoints from "express-list-endpoints";
import Database from "better-sqlite3";
import { createApp } from "../app_factory.mjs";

async function run() {
    // In-memory or temporary DB for route listing without side effects
    const db = new Database(":memory:");
    const app = createApp(db);

    // Fallback for Express 5 if listEndpoints doesn't catch them
    const endpoints = listEndpoints(app);

    if (endpoints.length === 0) {
        console.log("No routes found by express-list-endpoints. Inspecting app._router.stack...");
        if (app._router && app._router.stack) {
            app._router.stack.forEach(middleware => {
                if (middleware.route) {
                    console.log(`[${Object.keys(middleware.route.methods).join(",").toUpperCase()}] ${middleware.route.path}`);
                } else if (middleware.name === 'router') {
                    middleware.handle.stack.forEach(handler => {
                        if (handler.route) {
                            console.log(`[${Object.keys(handler.route.methods).join(",").toUpperCase()}] ${handler.route.path}`);
                        }
                    });
                }
            });
        }
    } else {
        console.log("Registered Routes:");
        endpoints.forEach(endpoint => {
            console.log(`[${endpoint.methods.join(",")}] ${endpoint.path}`);
        });
    }
}

run().catch(err => {
    console.error("Error listing routes:", err);
    process.exit(1);
});
