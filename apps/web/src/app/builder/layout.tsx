"use client";


import { RoleGuard } from '@/components/auth/RoleGuard';

const BUILDER_ROLES = ['builder', 'admin_super', 'admin_ops'];

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
    return (
        <RoleGuard allowedRoles={BUILDER_ROLES}>
            {children}
        </RoleGuard>
    );
}
