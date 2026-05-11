/**
 * Singleton RealtimeEventBroadcaster instance
 * Import this anywhere to publish or subscribe to realtime events
 */

import { EventEmitter } from "node:events";

class RealtimeEventBroadcaster {
  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
  }

  publish(topic, payload) {
    this.emitter.emit(topic, payload);
    this.emitter.emit("*", { type: topic, data: payload });
  }

  subscribe(topic, listener) {
    this.emitter.on(topic, listener);
    return () => this.emitter.off(topic, listener);
  }

  subscribeAll(listener) {
    this.emitter.on("*", listener);
    return () => this.emitter.off("*", listener);
  }
}

export const broadcaster = new RealtimeEventBroadcaster();
