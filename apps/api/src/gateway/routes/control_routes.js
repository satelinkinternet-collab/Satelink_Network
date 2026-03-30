
import { Router } from 'express';

export function createControlRouter(opsEngine) {
  const router = Router();

  // Trigger single test job
  router.post('/jobs/test', async (req, res) => {
    try {
      await global.opsEngine.simulateJob?.(); // safe optional call
      res.json({ ok: true, msg: 'Test job triggered' });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Trigger load spike
  router.post('/system/load', async (req, res) => {
    try {
      for (let i = 0; i < 5; i++) {
        await global.opsEngine.simulateJob?.();
      }
      res.json({ ok: true, msg: 'Load spike triggered' });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

