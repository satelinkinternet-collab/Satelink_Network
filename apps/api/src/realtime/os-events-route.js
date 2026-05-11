/**
 * Satelink OS Events - Server-Sent Events endpoint
 * Streams real-time events to Satelink OS dashboard
 *
 * Endpoint: GET /os/events
 */

import { Router } from 'express';
import { broadcaster } from './broadcaster-instance.js';

export function createOsEventsRouter() {
  const router = Router();

  router.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const sendEvent = (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    sendEvent({ type: 'connected', data: { timestamp: new Date().toISOString() } });

    const unsubscribe = broadcaster.subscribeAll(sendEvent);

    const pingInterval = setInterval(() => {
      res.write(`: ping\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(pingInterval);
      unsubscribe();
    });
  });

  return router;
}
