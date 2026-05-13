"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { RoleGuard } from '@/components/auth/RoleGuard';

const NODE_ROLES = ['node_operator', 'admin_super', 'admin_ops'];

export default function NodeLayout({ children }: { children: React.ReactNode }) {
    return (
        <RoleGuard allowedRoles={NODE_ROLES}>
            {children}
        </RoleGuard>
    );
}
