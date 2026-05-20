"use client";

import type { ReactNode } from "react";

type AdminLayoutProps = {
    children: ReactNode;
};

// Compatibility wrapper for legacy admin pages that still import AdminLayout.
export function AdminLayout({ children }: AdminLayoutProps) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">{children}</div>;
}

export default AdminLayout;
