"use client";

import React from "react";
import { LayoutShell } from "@/components/layout-shell";

/**
 * AppShell wraps the root layout with auth-gated navigation.
 * Delegates to LayoutShell which handles public vs authenticated routing.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
    return <LayoutShell>{children}</LayoutShell>;
}
