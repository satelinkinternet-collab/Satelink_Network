import express from 'express';

/**
 * Node Network Router
 *
 * Mounted at '/v1/node' in routes.js:
 *   app.use('/v1/node', createNodeNetworkRouter(db));
 *
 * Express strips the mount prefix before matching, so:
 *   POST /v1/node/register  →  matches '/register' here
 */
export function createNodeNetworkRouter(db) {
  const router = express.Router();

  // ── Ensure table exists (idempotent, runs once at mount time) ──────
  let _tableReady = false;
  async function ensureTable() {
    if (_tableReady) return;
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS node_registry (
          node_id     TEXT PRIMARY KEY,
          node_type   TEXT NOT NULL DEFAULT 'community',
          region      TEXT NOT NULL DEFAULT 'global',
          capacity    REAL NOT NULL DEFAULT 10,
          reputation  REAL NOT NULL DEFAULT 100,
          status      TEXT NOT NULL DEFAULT 'ACTIVE',
          created_at  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::bigint)
        )
      `);
      _tableReady = true;
      console.log('[NodeNetwork] node_registry table ready');
    } catch (e) {
      // Table may already exist — that's fine
      if (e.message?.includes('already exists')) {
        _tableReady = true;
      } else {
        console.error('[NodeNetwork] Table creation failed:', e.message);
      }
    }
  }

  // ── POST /register ─────────────────────────────────────────────────
  router.post('/register', async (req, res) => {
      const { node_id, node_type, region, capacity } = req.body;


      if (!node_id) {
        return res.status(400).json({ ok: false, error: "node_id required" });
      }

      if (!db) {
        return res.status(500).json({ ok: false, error: "DB not ready" });
      }

      // Guarantee the table exists before first insert
      await ensureTable();

      const now = Math.floor(Date.now() / 1000);

      // UPSERT — insert or update on conflict
      await db.prepare(`
        INSERT INTO node_registry (node_id, node_type, region, capacity, reputation, status, created_at)
        VALUES (?, ?, ?, ?, 100, 'ACTIVE', ?)
        ON CONFLICT(node_id) DO UPDATE SET
          node_type = EXCLUDED.node_type,
          region    = EXCLUDED.region,
          capacity  = EXCLUDED.capacity,
          status    = 'ACTIVE'
      `).run(
        node_id,
        node_type || 'community',
        region || 'global',
        capacity || 10,
        now
      );

      // Fetch the inserted/updated row back
      const node = await db.prepare(
        'SELECT * FROM node_registry WHERE node_id = ?'
      ).get(node_id);


      return res.json({ ok: true, node: node || { node_id } });

    } catch (err) {
      console.error("REGISTER ERROR:", err.message, err.stack);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
