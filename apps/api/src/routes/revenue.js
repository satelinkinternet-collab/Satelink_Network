import express from "express";

export default function revenueRoutes(pool) {
  const router = express.Router();

  router.get("/revenue", async (req, res) => {
    try {
      const total = await pool.query(`
        SELECT COALESCE(SUM(amount_usdt),0) AS total
        FROM revenue_events_v2
      `);

      const last24h = await pool.query(`
        SELECT COALESCE(SUM(amount_usdt),0) AS total
        FROM revenue_events_v2
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);

      res.json({
        ok: true,
        total: Number(total.rows[0].total),
        last_24h: Number(last24h.rows[0].total),
      });
    } catch (err) {
      console.error("Revenue error:", err);
      res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  router.get("/revenue/events", async (req, res) => {
    try {
      const rows = await pool.query(`
        SELECT id, amount_usdt, created_at
        FROM revenue_events_v2
        ORDER BY created_at DESC
        LIMIT 50
      `);

      res.json({ ok: true, events: rows.rows });
    } catch (err) {
      console.error("Events error:", err);
      res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  router.get("/epochs", async (req, res) => {
    try {
      const rows = await pool.query(`
        SELECT epoch_id, COUNT(*) AS requests,
               SUM(amount_usdt) AS total
        FROM revenue_events_v2
        GROUP BY epoch_id
        ORDER BY epoch_id DESC
        LIMIT 10
      `);

      res.json({ ok: true, epochs: rows.rows });
    } catch (err) {
      console.error("Epoch error:", err);
      res.status(500).json({ ok: false, error: "internal_error" });
    }
  });

  return router;
}
