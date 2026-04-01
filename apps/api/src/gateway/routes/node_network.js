import express from "express";

export function createNodeNetworkRouter(db) {
  const router = express.Router();

  router.post("/register", async (req, res) => {
    try {
      // Use the db passed via constructor — NOT global.opsEngine.db
      if (!db) {
        return res.status(500).json({ ok: false, error: "DB not ready" });
      }

      const { node_id, node_type, region, capacity } = req.body;

      console.log("REGISTER HIT:", node_id);

      if (!node_id) {
        return res.status(400).json({ ok: false, error: "node_id required" });
      }

      // Use db.prepare().run() — the PgDatabase adapter auto-appends RETURNING *
      // and returns { changes, lastInsertRowid } from .run()
      // Then fetch the row back to guarantee we return it.
      await db.prepare(`
        INSERT INTO node_registry (node_id, node_type, region, capacity, reputation, status, created_at)
        VALUES (?, ?, ?, ?, 100, 'ACTIVE', ?)
        ON CONFLICT (node_id) DO UPDATE SET
          node_type = EXCLUDED.node_type,
          region    = EXCLUDED.region,
          capacity  = EXCLUDED.capacity,
          status    = 'ACTIVE'
      `).run(
        node_id,
        node_type || "vps",
        region || "us-east",
        capacity || 100,
        Math.floor(Date.now() / 1000)
      );

      // Fetch the inserted/updated row
      const row = await db.prepare(
        "SELECT * FROM node_registry WHERE node_id = ?"
      ).get(node_id);

      console.log("INSERT RESULT:", row);

      return res.json({ ok: true, node: row || { node_id } });

    } catch (e) {
      console.error("REGISTER ERROR:", e.message, e.stack);
      return res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
