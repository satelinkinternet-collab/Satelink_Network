import { createApp } from "./app_factory.mjs";

async function start() {
  try {
    console.log("🚀 SERVER STARTED - ROUTES LOADING");

    // DB + pool already handled internally or passed if needed
    const pool = {}; // placeholder (your app_factory may not even need it)

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
