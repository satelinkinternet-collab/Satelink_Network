"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

interface NetworkHealth {
    status: string;
    alerts: number;
}

export function useNetworkHealth() {
    const [health, setHealth] = useState<NetworkHealth | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchHealth() {
            try {
                const { data } = await api.get("/health");
                if (!cancelled) {
                    setHealth({
                        status: data.status || "unknown",
                        alerts: Number(data.alerts || 0),
                    });
                }
            } catch {
                if (!cancelled) {
                    setHealth({ status: "unknown", alerts: 0 });
                }
            }
        }

        fetchHealth();
        return () => { cancelled = true; };
    }, []);

    return { health };
}
