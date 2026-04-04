// src/routes/simulation_only.js
import express from 'express';
import { getMode } from '../config/mode.js';

const router = express.Router();

// GET /simulation/status
router.get('/status', (req, res) => {
    res.json({
        ok: true,
        mode: getMode()
    });
});

export default router;
