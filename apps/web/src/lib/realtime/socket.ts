import { InfrastructureEvent } from "@/lib/events/infrastructure-events";

export type RealtimeSubscriber = (event: InfrastructureEvent<unknown>) => void;

export interface RealtimeChannel {
  connect: () => void;
  disconnect: () => void;
  emit: (event: InfrastructureEvent<unknown>) => void;
  subscribe: (listener: RealtimeSubscriber) => () => void;
  isConnected: () => boolean;
}

export function createMockRealtimeChannel(): RealtimeChannel {
  const listeners = new Set<RealtimeSubscriber>();
  let connected = false;

  return {
    connect: () => {
      connected = true;
    },
    disconnect: () => {
      connected = false;
      listeners.clear();
    },
    emit: (event) => {
      if (!connected) return;
      listeners.forEach((listener) => listener(event));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    isConnected: () => connected,
  };
}
