export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

"use client";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="p-6 bg-[#091413] min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#B0E4CC]">Notifications</h1>
        <p className="text-[#408A71] text-sm mt-1">Stay updated on network activity and your earnings</p>
      </div>

      <div className="bg-[#0d1f1d] border border-[#285A48] rounded-lg p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#0a1816] border border-[#285A48] flex items-center justify-center">
          <Bell className="w-8 h-8 text-[#408A71]" />
        </div>
        <h2 className="text-xl font-bold text-[#B0E4CC] mb-2">No Notifications Yet</h2>
        <p className="text-[#408A71] max-w-md mx-auto">
          Notifications will appear here for epoch closures, claim availability, and network events.
        </p>

        <div className="mt-8 pt-8 border-t border-[#285A48]">
          <h3 className="text-sm font-medium text-[#B0E4CC] mb-4">You&apos;ll be notified about:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-[#0a1816] border border-[#285A48] rounded-lg p-4">
              <div className="text-[#00D1FF] font-medium mb-1">Epoch Closures</div>
              <div className="text-[#408A71] text-xs">When epochs close and settlement is ready</div>
            </div>
            <div className="bg-[#0a1816] border border-[#285A48] rounded-lg p-4">
              <div className="text-[#00D1FF] font-medium mb-1">Claim Available</div>
              <div className="text-[#408A71] text-xs">When USDT rewards are ready to claim</div>
            </div>
            <div className="bg-[#0a1816] border border-[#285A48] rounded-lg p-4">
              <div className="text-[#00D1FF] font-medium mb-1">Network Events</div>
              <div className="text-[#408A71] text-xs">Important network status updates</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
