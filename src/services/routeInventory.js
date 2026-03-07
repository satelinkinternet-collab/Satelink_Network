// src/services/routeInventory.js
import listEndpoints from 'express-list-endpoints';

let _inventoryCache = null;

/**
 * Sweeps the express application router mapping out all hooked path structures.
 * @param {import('express').Application} app 
 */
export function registerRouteInventory(app) {
    if (!app) return;

    try {
        const endpoints = listEndpoints(app);
        const mappedRoutes = [];

        endpoints.forEach(endpoint => {
            const methods = endpoint.methods || ['GET'];
            methods.forEach(m => {
                mappedRoutes.push({
                    method: m.toUpperCase(),
                    path: endpoint.path
                });
            });
        });

        _inventoryCache = {
            generatedAt: new Date().toISOString(),
            count: mappedRoutes.length,
            routes: mappedRoutes
        };
    } catch (e) {
        console.warn("Failed to generate route inventory index:", e.message);
    }
}

/**
 * Returns the currently held API memory graph map.
 * @returns {{ generatedAt: string, count: number, routes: Array<{ method: string, path: string }> } | null}
 */
export function getRouteInventory() {
    return _inventoryCache;
}
