export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

"use client";

import { RoleGuard } from '@/components/auth/RoleGuard';

const DISTRIBUTOR_ROLES = ['distributor_lco', 'distributor_influencer', 'admin_super', 'admin_ops'];

export default function DistributorLayout({ children }: { children: React.ReactNode }) {
    return (
        <RoleGuard allowedRoles={DISTRIBUTOR_ROLES}>
            {children}
        </RoleGuard>
    );
}
