import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    loading?: boolean;
}

export function StatCard({ title, value, icon: Icon, description, trend, loading }: StatCardProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">Loading...</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-8 w-24 bg-zinc-800 animate-pulse rounded" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">{title}</CardTitle>
                <Icon className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-zinc-100">{value}</div>
                {(description || trend) && (
                    <p className="text-xs text-zinc-500 mt-1">
                        {trend && (
                            <span className={trend.isPositive ? "text-green-500 mr-2" : "text-red-500 mr-2"}>
                                {trend.isPositive ? "+" : ""}{trend.value}%
                            </span>
                        )}
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
