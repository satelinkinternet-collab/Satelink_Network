import express from 'express';

export function createWithdrawalRouter(db) {
    const router = express.Router();

    router.get('/status', (req, res) => {
        res.json({ status: 'Withdrawal API (Mock) is active' });
    });

    return router;
}
