/**
 * Smoke Test: Mode + Health
 * - Calls /health
 * - Calls /api/mode
 * - Fails loudly on non-200
 * - Read-only (no DB writes)
 */

const BASE_URL = process.env.API_BASE_URL || "http://localhost:8080";

async function fetchOrFail(path) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error(`❌ ${path} failed with status ${res.status}`);
    const text = await res.text().catch(() => "");
    if (text) console.error(text);
    process.exit(1);
  }

  return res.json().catch(() => ({}));
}

(async () => {
  try {
    console.log("🔎 Checking /health...");
    const health = await fetchOrFail("/health");
    console.log("✅ Health OK");

    console.log("🔎 Checking /api/mode...");
    const mode = await fetchOrFail("/api/mode");

    console.log("\n=== MODE STATUS ===");
    console.log("Mode:", mode.mode || "unknown");

    if (mode.flags && typeof mode.flags === "object") {
      console.log("\nFlags:");
      for (const [key, value] of Object.entries(mode.flags)) {
        console.log(`  ${key}: ${value}`);
      }
    } else {
      console.log("No flags returned.");
    }

    console.log("\n✅ Smoke test passed.");
    process.exit(0);

  } catch (err) {
    console.error("❌ Smoke test crashed:");
    console.error(err);
    process.exit(1);
  }
})();
