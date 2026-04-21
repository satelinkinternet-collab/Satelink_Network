import express from "express";

export default function revenueRoutes(pool) {
  const router = express.Router();

  router.get("/revenue", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT COALESCE(SUM(amount_usdt), 0) AS total
        FROM revenue_events_v2
      `);

      res.json({ ok: true, total: result.rows[0].total });
    } catch (err) {
      console.error("Revenue error:", err);
      res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  router.get("/revenue/events", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT id, amount_usdt, created_at
        FROM revenue_events_v2
        ORDER BY created_at DESC
        LIMIT 50
      `);

      res.json({ ok: true, events: result.rows });
    } catch (err) {
      console.error("Events error:", err);
      res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  router.get("/epochs", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT epoch_id, COUNT(*) AS requests,
               SUM(amount_usdt) AS total
        FROM revenue_events_v2
        GROUP BY epoch_id
        ORDER BY epoch_id DESC
        LIMIT 10
      `);

      res.json({ ok: true, epochs: result.rows });
    } catch (err) {
      console.error("Epoch error:", err);
      res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  return router;
}
