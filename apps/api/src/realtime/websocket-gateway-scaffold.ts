import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { RealtimeEventBroadcaster } from "./event-broadcaster";

/**
 * Scaffold for future NestJS/Express websocket bridge.
 * Does not auto-start in production runtime yet.
 */
export function createSatelinkRealtimeGateway(port = 8181) {
  const broadcaster = new RealtimeEventBroadcaster();
  const server = createServer();
  const wss = new WebSocketServer({ server });

  const unsubscribers = [
    broadcaster.subscribe("deployment.lifecycle", (event) => {
      const payload = JSON.stringify({ type: "deployment.lifecycle", data: event });
      wss.clients.forEach((client) => client.send(payload));
    }),
    broadcaster.subscribe("node.telemetry", (event) => {
      const payload = JSON.stringify({ type: "node.telemetry", data: event });
      wss.clients.forEach((client) => client.send(payload));
    }),
    broadcaster.subscribe("queue.telemetry", (event) => {
      const payload = JSON.stringify({ type: "queue.telemetry", data: event });
      wss.clients.forEach((client) => client.send(payload));
    }),
    broadcaster.subscribe("topology.updated", (event) => {
      const payload = JSON.stringify({ type: "topology.updated", data: event });
      wss.clients.forEach((client) => client.send(payload));
    }),
  ];

  return {
    start: () =>
      new Promise<void>((resolve) => {
        server.listen(port, () => resolve());
      }),
    stop: () =>
      new Promise<void>((resolve, reject) => {
        unsubscribers.forEach((unsub) => unsub());
        wss.close((err) => (err ? reject(err) : resolve()));
      }),
    broadcaster,
  };
}
