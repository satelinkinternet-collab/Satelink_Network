"use client";

import { useEffect, useState } from "react";

type LegacyAuthState = {
    token: string;
};

// Compatibility hook for legacy pages that expect `useAuth().token`.
export function useAuth(): LegacyAuthState {
    const [token, setToken] = useState("");

    useEffect(() => {
        const readToken = () => {
            const value =
                localStorage.getItem("admin_token") ||
                localStorage.getItem("satelink_token") ||
                localStorage.getItem("auth_token") ||
                "";
            setToken(value);
        };

        readToken();
        window.addEventListener("storage", readToken);
        return () => window.removeEventListener("storage", readToken);
    }, []);

    return { token };
}
