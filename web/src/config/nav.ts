import {
    Settings,
    Cpu,
    Key,
    TrendingUp,
    FileText,
    LucideIcon
} from 'lucide-react';
import { Role } from '@/lib/permissions';

export interface NavItem {
    label: string;
    path: string;
    icon: LucideIcon;
    roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
    {
        label: 'Admin',
        path: '/admin',
        icon: Settings,
        roles: ['admin_super', 'admin_ops']
    },
    {
        label: 'Node Ops',
        path: '/node',
        icon: Cpu,
        roles: ['node_operator', 'admin_super']
    },
    {
        label: 'Builder',
        path: '/builder',
        icon: Key,
        roles: ['builder', 'admin_super']
    },
    {
        label: 'Distributor',
        path: '/distributor',
        icon: TrendingUp,
        roles: ['distributor_lco', 'distributor_influencer', 'admin_super']
    },
    {
        label: 'Enterprise',
        path: '/enterprise',
        icon: FileText,
        roles: ['enterprise', 'admin_super']
    },
];
