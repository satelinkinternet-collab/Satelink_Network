"use client";

import React, { useState } from 'react';
import { AlertCircle, X, Loader2, Wifi, WifiOff, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';

// ─── Error Banner ─────────────────────────────────────────
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
    const [dismissed, setDismissed] = useState(false);
    if (dismissed) return null;
    return (
        <div className="w-full bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between gap-3 mb-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                <p className="text-sm text-red-300">{message}</p>
            </div>
            <div className="flex items-center gap-2">
                {onRetry && (
                    <Button variant="ghost" size="sm" onClick={onRetry} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs">
                        Retry
                    </Button>
                )}
                <button onClick={() => setDismissed(true)} className="text-red-500 hover:text-red-300">
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

// ─── Loading Skeleton ─────────────────────────────────────
export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-3 animate-pulse">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4">
                    <div className="h-4 bg-zinc-800 rounded w-1/4" />
                    <div className="h-4 bg-zinc-800 rounded w-1/3" />
                    <div className="h-4 bg-zinc-800 rounded w-1/6" />
                    <div className="h-4 bg-zinc-800 rounded w-1/4" />
                </div>
            ))}
        </div>
    );
}

// ─── KPI Skeleton ─────────────────────────────────────
export function KpiSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
            {Array.from({ length: count }).map((_, i) => (
                <Card key={i} className="bg-zinc-900/80 border-zinc-800/60">
                    <CardContent className="p-4 sm:p-5">
                        <div className="h-3 bg-zinc-800 rounded w-2/3 mb-3" />
                        <div className="h-8 bg-zinc-800 rounded w-1/2 mb-2" />
                        <div className="h-3 bg-zinc-800 rounded w-1/3" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// ─── Live Pill ────────────────────────────────────────────
export function LivePill({ status }: { status: 'connecting' | 'connected' | 'error' }) {
    const config = {
        connecting: { label: 'Connecting', color: 'bg-amber-400', textColor: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20' },
        connected: { label: 'Live', color: 'bg-emerald-400', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
        error: { label: 'Offline', color: 'bg-red-400', textColor: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' },
    }[status];

    return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${config.bgColor}`}>
            <div className={`h-1.5 w-1.5 rounded-full ${config.color} ${status === 'connected' ? 'animate-pulse' : ''}`} />
            <span className={config.textColor}>
                {status === 'connected' ? <Wifi className="h-3 w-3 inline mr-1" /> : status === 'error' ? <WifiOff className="h-3 w-3 inline mr-1" /> : null}
                {config.label}
            </span>
        </div>
    );
}

// ─── Confirm Dialog ───────────────────────────────────────
interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: string;
    variant?: 'danger' | 'warning' | 'default';
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}

export function ConfirmDialog({ open, title, description, variant = 'default', confirmLabel = 'Confirm', onConfirm, onCancel, loading }: ConfirmDialogProps) {
    if (!open) return null;

    const btnStyle = {
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        warning: 'bg-amber-600 hover:bg-amber-700 text-white',
        default: 'bg-blue-600 hover:bg-blue-700 text-white',
    }[variant];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onCancel}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-zinc-100 mb-2">{title}</h3>
                <p className="text-sm text-zinc-400 mb-6">{description}</p>
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onCancel} disabled={loading} className="text-zinc-400 hover:text-zinc-200">
                        Cancel
                    </Button>
                    <Button onClick={onConfirm} disabled={loading} className={btnStyle}>
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── JSON Viewer ──────────────────────────────────────────
export function JsonViewer({ data, label }: { data: any; label?: string }) {
    const [open, setOpen] = useState(false);

    let parsed = data;
    if (typeof data === 'string') {
        try { parsed = JSON.parse(data); } catch { parsed = data; }
    }

    return (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-3 py-2 bg-zinc-900/50 hover:bg-zinc-800/50 text-xs text-zinc-400 transition-colors"
            >
                <span className="font-medium">{label || 'JSON Data'}</span>
                {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            {open && (
                <pre className="text-xs text-zinc-300 p-3 bg-zinc-950 overflow-x-auto max-h-64 font-mono">
                    {typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : String(parsed)}
                </pre>
            )}
        </div>
    );
}

// ─── Page Header ──────────────────────────────────────────
interface PageHeaderProps {
    title: string;
    subtitle?: string;
    sseStatus?: 'connecting' | 'connected' | 'error';
    actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, sseStatus, actions }: PageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">{title}</h1>
                {subtitle && <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-3">
                {sseStatus && <LivePill status={sseStatus} />}
                {actions}
            </div>
        </div>
    );
}

// ─── Data Table ───────────────────────────────────────────
interface Column<T> {
    key: string;
    label: string;
    render?: (row: T) => React.ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    onRowClick?: (row: T) => void;
    loading?: boolean;
    emptyMessage?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
}

export function DataTable<T extends Record<string, any>>({
    columns, data, onRowClick, loading, emptyMessage = 'No data', searchable, searchPlaceholder = 'Search...'
}: DataTableProps<T>) {
    const [search, setSearch] = useState('');

    const filtered = searchable && search
        ? data.filter(row =>
            columns.some(col => {
                const val = row[col.key];
                return val && String(val).toLowerCase().includes(search.toLowerCase());
            })
        )
        : data;

    if (loading) return <LoadingSkeleton rows={8} />;

    return (
        <div>
            {searchable && (
                <div className="mb-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2.5 w-full text-sm rounded-xl bg-zinc-800/60 border border-zinc-700/50 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                        placeholder={searchPlaceholder}
                    />
                </div>
            )}

            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-2">
                {filtered.length === 0 && (
                    <div className="text-center text-zinc-500 py-8 text-sm">{emptyMessage}</div>
                )}
                {filtered.map((row, i) => (
                    <div
                        key={i}
                        onClick={() => onRowClick?.(row)}
                        className={`bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 space-y-2 ${onRowClick ? 'cursor-pointer hover:bg-zinc-800/40 transition-colors' : ''}`}
                    >
                        {columns.map(col => (
                            <div key={col.key} className="flex justify-between items-center">
                                <span className="text-[11px] text-zinc-500 uppercase font-semibold">{col.label}</span>
                                <span className="text-sm text-zinc-300">{col.render ? col.render(row) : String(row[col.key] ?? '—')}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-800/30 border-y border-zinc-800/60">
                        <tr>
                            {columns.map(col => (
                                <th key={col.key} className={`px-4 py-3 font-semibold text-zinc-500 text-[11px] uppercase tracking-wider ${col.className || ''}`}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                        {filtered.length === 0 && (
                            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-500 text-sm">{emptyMessage}</td></tr>
                        )}
                        {filtered.map((row, i) => (
                            <tr
                                key={i}
                                onClick={() => onRowClick?.(row)}
                                className={`hover:bg-zinc-800/20 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                            >
                                {columns.map(col => (
                                    <td key={col.key} className={`px-4 py-3 text-zinc-300 ${col.className || ''}`}>
                                        {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Detail Drawer ────────────────────────────────────────
interface DetailDrawerProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function DetailDrawer({ open, onClose, title, children }: DetailDrawerProps) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-lg bg-zinc-900 border-l border-zinc-700 h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right-10"
                onClick={e => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-bold text-zinc-100">{title}</h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">{children}</div>
            </div>
        </div>
    );
}

// ─── Severity Badge ───────────────────────────────────────
export function SeverityBadge({ severity }: { severity: string }) {
    const config: Record<string, string> = {
        critical: 'bg-red-500/10 text-red-400 border-red-500/20',
        high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        med: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    };
    return (
        <Badge className={`text-[10px] uppercase ${config[severity] || config.low}`}>
            {severity}
        </Badge>
    );
}

// ─── Status Badge ─────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
    const config: Record<string, string> = {
        open: 'bg-red-500/10 text-red-400 border-red-500/20',
        triaged: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        closed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        online: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        offline: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
        banned: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return (
        <Badge className={`text-[10px] uppercase ${config[status] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}`}>
            {status}
        </Badge>
    );
}

// ─── Role Guard ───────────────────────────────────────────
export function useIsReadonly() {
    const { user } = useAuth();
    return user?.role === 'admin_readonly';
}

// ─── Timestamp Formatter ──────────────────────────────────
export function formatTs(ts: number | undefined | null): string {
    if (!ts) return '—';
    // If ts is in seconds (< 10 digits), convert to ms
    const ms = ts < 9999999999 ? ts * 1000 : ts;
    return new Date(ms).toLocaleString();
}

export function timeAgo(ts: number | undefined | null): string {
    if (!ts) return '—';
    const ms = ts < 9999999999 ? ts * 1000 : ts;
    const diff = Date.now() - ms;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
}
