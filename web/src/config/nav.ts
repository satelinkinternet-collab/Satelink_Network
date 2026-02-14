import {
    Settings,
    Cpu,
    Key,
    TrendingUp,
    FileText,
    LucideIcon,
    Activity,
    AlertTriangle,
    Shield,
    DollarSign,
    Database,
    Clock,
    Zap,
    Eye,
    SlidersHorizontal,
    Award,
    ScrollText,
    Stethoscope,
    Bug,
    Fingerprint
} from 'lucide-react';
import { Role } from '@/lib/permissions';

export interface NavItem {
    label: string;
    path: string;
    icon: LucideIcon;
    roles: Role[];
    section?: string;
}

export const NAV_ITEMS: NavItem[] = [
    // ─── Admin Control Room ───
    {
        label: 'Command Center',
        path: '/admin/command-center',
        icon: Activity,
        roles: ['admin_super', 'admin_ops', 'admin_readonly'],
        section: 'CONTROL ROOM'
    },
    {
        label: 'Network Fleet',
        path: '/admin/network/nodes',
        icon: Cpu,
        roles: ['admin_super', 'admin_ops', 'admin_readonly'],
        section: 'CONTROL ROOM'
    },
    {
        label: 'Executions',
        path: '/admin/ops/executions',
        icon: Zap,
        roles: ['admin_super', 'admin_ops'],
        section: 'OPS MONITOR'
    },
    {
        label: 'Errors',
        path: '/admin/ops/errors',
        icon: AlertTriangle,
        roles: ['admin_super', 'admin_ops'],
        section: 'OPS MONITOR'
    },
    {
        label: 'Slow Queries',
        path: '/admin/ops/slow-queries',
        icon: Clock,
        roles: ['admin_super', 'admin_ops'],
        section: 'OPS MONITOR'
    },
    {
        label: 'Request Traces',
        path: '/admin/ops/traces',
        icon: Database,
        roles: ['admin_super', 'admin_ops'],
        section: 'OPS MONITOR'
    },
    {
        label: 'Revenue Overview',
        path: '/admin/revenue/overview',
        icon: DollarSign,
        roles: ['admin_super', 'admin_ops', 'admin_readonly'],
        section: 'REVENUE'
    },
    {
        label: 'Revenue Events',
        path: '/admin/revenue/events',
        icon: TrendingUp,
        roles: ['admin_super', 'admin_ops', 'admin_readonly'],
        section: 'REVENUE'
    },
    {
        label: 'Reward Epochs',
        path: '/admin/rewards/epochs',
        icon: Award,
        roles: ['admin_super', 'admin_ops', 'admin_readonly'],
        section: 'REWARDS'
    },
    {
        label: 'Earnings',
        path: '/admin/rewards/earnings',
        icon: DollarSign,
        roles: ['admin_super', 'admin_ops', 'admin_readonly'],
        section: 'REWARDS'
    },
    {
        label: 'Security Alerts',
        path: '/admin/security/alerts',
        icon: Shield,
        roles: ['admin_super', 'admin_ops'],
        section: 'SECURITY'
    },
    {
        label: 'Audit Log',
        path: '/admin/security/audit',
        icon: ScrollText,
        roles: ['admin_super', 'admin_ops'],
        section: 'SECURITY'
    },
    {
        label: 'Forensics',
        path: '/admin/forensics',
        icon: Fingerprint,
        roles: ['admin_super', 'admin_ops'],
        section: 'SECURITY'
    },
    {
        label: 'Feature Flags',
        path: '/admin/settings/feature-flags',
        icon: SlidersHorizontal,
        roles: ['admin_super', 'admin_ops'],
        section: 'SETTINGS'
    },
    {
        label: 'Limits',
        path: '/admin/settings/limits',
        icon: Settings,
        roles: ['admin_super', 'admin_ops'],
        section: 'SETTINGS'
    },

    // ─── Diagnostics ───
    {
        label: 'Self-Tests',
        path: '/admin/diagnostics/self-tests',
        icon: Stethoscope,
        roles: ['admin_super', 'admin_ops'],
        section: 'DIAGNOSTICS'
    },
    {
        label: 'Incidents',
        path: '/admin/diagnostics/incidents',
        icon: Bug,
        roles: ['admin_super', 'admin_ops'],
        section: 'DIAGNOSTICS'
    },

    // ─── Other Roles ───
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
