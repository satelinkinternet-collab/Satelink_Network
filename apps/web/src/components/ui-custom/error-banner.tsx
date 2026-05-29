import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorBannerProps {
    title?: string;
    message: string;
}

export function ErrorBanner({ title = "Error", message }: ErrorBannerProps) {
    if (!message) return null;

    return (
        <Alert variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/20">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>
                {message}
            </AlertDescription>
        </Alert>
    );
}
