import { createApp } from "./app_factory.mjs";
import pkg from "pg";

const { Pool } = pkg;

async function start() {
  try {
    console.log("🚀 SERVER STARTED - ROUTES LOADING");

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    });

    const app = createApp(pool);

    const PORT = process.env.PORT || 8080;

    app.listen(PORT, () => {
      console.log(`✅ Satelink Backend Running on port ${PORT}`);
    });

  } catch (err) {
    console.error("BOOT FAILURE IN SERVER:", err);
    process.exit(1);
  }
}

start();
