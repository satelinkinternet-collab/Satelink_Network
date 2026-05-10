"use client";

import { useEffect } from "react";

export default function SatelinkDocsRedirect() {
  useEffect(() => {
    window.location.href = "https://docs.satelink.network";
  }, []);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00D1FF] border-t-transparent" />
      <p className="mt-4 text-[#B0E4CC]">Redirecting to documentation...</p>
    </div>
  );
}
