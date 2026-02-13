"use client";

import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function ForbiddenPage() {
    return (
        <div className="flex h-screen items-center justify-center bg-zinc-950 p-4">
            <div className="text-center space-y-6">
                <div className="flex justify-center">
                    <div className="p-6 rounded-full bg-red-500/10 text-red-500">
                        <ShieldAlert className="h-16 w-16" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold text-zinc-100 tracking-tight">403 - Access Denied</h1>
                    <p className="text-zinc-400 max-w-md mx-auto">
                        You do not have the necessary permissions to access this page. Please contact your administrator if you believe this is an error.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-6">
                        <Link href="/">Return to Dashboard</Link>
                    </Button>
                    <Button variant="outline" className="border-zinc-800 text-zinc-400 hover:text-zinc-100 py-6">
                        Request Access
                    </Button>
                </div>
            </div>
        </div>
    );
}
