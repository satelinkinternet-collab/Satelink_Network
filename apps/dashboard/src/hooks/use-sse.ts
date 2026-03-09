"use client";
import { useEffect, useRef, useState } from 'react';
import { useAuth } from './use-auth';
import { fetchEventSource } from '@microsoft/fetch-event-source';

// Helper to parse SSE data safely
const safeParse = (data: string) => {
    try {
        return JSON.parse(data);
    } catch {
        return data;
    }
};

export function useSSE<T>(endpoint: string, eventTypes: string[]) {
    const { user } = useAuth();
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [lastEvent, setLastEvent] = useState<{ type: string; data: T | any } | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!user || !endpoint) return;

        const ctrl = new AbortController();

        const connect = async () => {
            const token = localStorage.getItem('satelink_token');
            const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}${endpoint}`;

            try {
                await fetchEventSource(url, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token || ''}`,
                        Accept: 'text/event-stream',
                    },
                    signal: ctrl.signal,
                    async onopen(res) {
                        if (res.ok && res.headers.get('content-type')?.startsWith('text/event-stream')) {
                            setStatus('connected');
                            console.log(`[SSE] Connected to ${endpoint}`);
                        } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                            // client error, don't retry
                            setStatus('error');
                            console.error(`[SSE] Error ${res.status}: ${res.statusText}`);
                            throw new Error(`SSE error ${res.status}`);
                        }
                    },
                    onmessage(msg) {
                        // Check if msg.event matches any of eventTypes
                        if (msg.event && eventTypes.includes(msg.event)) {
                            const parsed = safeParse(msg.data);
                            setLastEvent({ type: msg.event, data: parsed });
                        }
                    },
                    onclose() {
                        setStatus('connecting');
                        console.log(`[SSE] Reconnecting to ${endpoint}...`);
                    },
                    onerror(err) {
                        console.error(`[SSE] Connection error:`, err);
                        setStatus('error');
                        // Return undefined to retry
                        return;
                    }
                });
            } catch (err) {
                console.error(`[SSE] Fallback check on connection close:`, err);
            }
        };

        connect();

        return () => {
            ctrl.abort();
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        };
    }, [endpoint, user, eventTypes.join(',')]);

    return { status, lastEvent };
}
