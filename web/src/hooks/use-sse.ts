import { useEffect, useRef, useState } from 'react';
import { useAuth } from './use-auth';

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

        const connect = () => {
            const token = localStorage.getItem('satelink_token');
            const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}${endpoint}?token=${token || ''}`;

            // Note: Native EventSource doesn't support headers nicely. 
            // We usually pass token in query param for SSE or use a polyfill.
            // For this MVP, we will rely on cookie if set, OR we append token to URL and 
            // ensure backend middleware extracts it from query if header missing.

            // Backend middleware check: auth_v2.js verifyJWT checks header OR query?
            // Let's assume we need to update verifyJWT to check query.token if we use native EventSource.
            // Or use 'event-source-polyfill' which supports headers.
            // For MVP, passing token in URL is easiest but less secure. 
            // Let's try native EventSource with URL params.

            const es = new EventSource(url);
            eventSourceRef.current = es;

            es.onopen = () => {
                setStatus('connected');
                console.log(`[SSE] Connected to ${endpoint}`);
            };

            es.onerror = () => {
                setStatus('error');
                es.close();
                // Retry in 5s
                if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = setTimeout(connect, 5000);
            };

            // Subscribe to specific events
            eventTypes.forEach(type => {
                es.addEventListener(type, (e) => {
                    const parsed = safeParse(e.data);
                    setLastEvent({ type, data: parsed });
                });
            });
        };

        connect();

        return () => {
            if (eventSourceRef.current) eventSourceRef.current.close();
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        };
    }, [endpoint, user, eventTypes.join(',')]);

    return { status, lastEvent };
}
