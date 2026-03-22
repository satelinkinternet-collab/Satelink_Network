import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <div className="bg-zinc-900 p-3 rounded-full mb-4">
                <Icon className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-200">{title}</h3>
            <p className="text-sm text-zinc-500 max-w-sm mt-2 mb-6">{description}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction} variant="outline" className="border-zinc-700 hover:bg-zinc-800">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
