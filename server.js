import { createApp } from "./app_factory.mjs";
import Database from "better-sqlite3";

export { createApp };
export default createApp;

let _server;

// If we are not running under Mocha (tests), boot the server
if (process.env.NODE_ENV !== "test" && !process.env.MOCHA) {
    const db = new Database(process.env.SQLITE_PATH || "satelink.db");
    const app = createApp(db);
    const PORT = process.env.PORT || 8080;

    _server = app.listen(PORT, () => {
        console.log(`Satelink Node listening on port ${PORT}`);
        console.log(`- Health: http://localhost:${PORT}/health`);
    });
}
