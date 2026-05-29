import { InfrastructureEvent } from "@/lib/events/infrastructure-events";

export type RealtimeSubscriber = (event: InfrastructureEvent<unknown>) => void;

export interface RealtimeChannel {
  connect: () => void;
  disconnect: () => void;
  emit: (event: InfrastructureEvent<unknown>) => void;
  subscribe: (listener: RealtimeSubscriber) => () => void;
  isConnected: () => boolean;
}

const SSE_URL =
  process.env.NEXT_PUBLIC_API_SSE_URL ||
  "https://rpc.satelink.network/os/events";

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

export function createSSERealtimeChannel(): RealtimeChannel {
  const listeners = new Set<RealtimeSubscriber>();
  let eventSource: EventSource | null = null;
  let connected = false;
  let retryCount = 0;
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 5000;

  const connect = () => {
    if (typeof window === "undefined") return;
    if (eventSource) return;

    try {
      eventSource = new EventSource(SSE_URL);

      eventSource.onopen = () => {
        connected = true;
        retryCount = 0;
        console.log("[Realtime] Connected to SSE");
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const infraEvent: InfrastructureEvent<unknown> = {
            id: crypto.randomUUID(),
            type: data.type,
            payload: data.data,
            timestamp: new Date().toISOString(),
          };
          listeners.forEach((listener) => listener(infraEvent));
        } catch {
          // Ignore ping comments or malformed data
        }
      };

      eventSource.onerror = () => {
        connected = false;
        eventSource?.close();
        eventSource = null;

        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`[Realtime] Reconnecting in ${RETRY_DELAY}ms (attempt ${retryCount}/${MAX_RETRIES})`);
          setTimeout(connect, RETRY_DELAY);
        } else {
          console.log("[Realtime] Max retries reached, falling back to mock");
        }
      };
    } catch (err) {
      console.error("[Realtime] SSE connection failed:", err);
    }
  };

  return {
    connect,
    disconnect: () => {
      eventSource?.close();
      eventSource = null;
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

export function createHybridRealtimeChannel(): RealtimeChannel {
  const sseChannel = createSSERealtimeChannel();
  const mockChannel = createMockRealtimeChannel();
  let useMock = false;
  let checkInterval: ReturnType<typeof setInterval> | null = null;

  return {
    connect: () => {
      sseChannel.connect();
      setTimeout(() => {
        if (!sseChannel.isConnected()) {
          useMock = true;
          mockChannel.connect();
        }
      }, 10000);
    },
    disconnect: () => {
      sseChannel.disconnect();
      mockChannel.disconnect();
      if (checkInterval) clearInterval(checkInterval);
    },
    emit: (event) => {
      if (useMock) {
        mockChannel.emit(event);
      } else {
        sseChannel.emit(event);
      }
    },
    subscribe: (listener) => {
      const unsubSSE = sseChannel.subscribe(listener);
      const unsubMock = mockChannel.subscribe(listener);
      return () => {
        unsubSSE();
        unsubMock();
      };
    },
    isConnected: () => sseChannel.isConnected() || mockChannel.isConnected(),
  };
}
