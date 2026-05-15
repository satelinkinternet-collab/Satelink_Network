"use client";

import dynamic from "next/dynamic";

const WithdrawClient = dynamic(() => import("./WithdrawClient"), {
  loading: () => (
    <div className="min-h-screen bg-[#091413] flex items-center justify-center">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-[#285A48] border-t-[#408A71] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[11px] text-[#285A48]">Loading withdraw...</p>
      </div>
    </div>
  ),
});

export default function WithdrawPage() {
  return <WithdrawClient />;
}
