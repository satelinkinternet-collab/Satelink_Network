/**
 * server.js (shim)
 * Purpose: keep tests stable: `import { createApp } from "../server.js"`
 * Real implementation lives in app_factory.mjs
 */
export { createApp } from "./app_factory.mjs";
export { default } from "./app_factory.mjs";
