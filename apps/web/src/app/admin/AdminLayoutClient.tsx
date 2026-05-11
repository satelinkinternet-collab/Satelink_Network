"use client";

import { RoleGuard } from '@/components/auth/RoleGuard';

const ADMIN_ROLES = ['admin_super', 'admin_ops', 'admin_readonly'];

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
    return (
        <RoleGuard allowedRoles={ADMIN_ROLES}>
            {children}
        </RoleGuard>
    );
}
