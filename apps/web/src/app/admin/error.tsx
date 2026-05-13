"use client";


import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin Error]", error);
  }, [error]);

  const isNetworkError = error.message?.includes("Network Error") || error.message?.includes("fetch");
  const is404 = error.message?.includes("404") || error.message?.includes("Not Found");

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">
          {is404 ? "Page not found" : isNetworkError ? "API connection error" : "Dashboard error"}
        </h2>
        <p className="text-sm text-zinc-400">
          {isNetworkError
            ? "Could not reach the backend API. Check that the server is running."
            : is404
              ? "This admin endpoint may not be available yet."
              : error.message || "An error occurred loading this admin page."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
          <Link
            href="/admin/command-center"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Command Center
          </Link>
        </div>
      </div>
    </div>
  );
}
