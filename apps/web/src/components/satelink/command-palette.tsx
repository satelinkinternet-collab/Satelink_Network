"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Search } from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-24">
      <Command className="w-full max-w-xl rounded-xl border border-white/10 bg-[#0b1615] p-2 text-white shadow-2xl">
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 px-3">
          <Search className="h-4 w-4 text-[#B0E4CC]/60" />
          <Command.Input className="h-11 w-full bg-transparent text-sm outline-none" placeholder="Search nodes, deployments, and commands..." />
        </div>
        <Command.List className="max-h-64 overflow-auto">
          <Command.Empty className="px-3 py-4 text-sm text-[#B0E4CC]/70">No matching command.</Command.Empty>
          <Command.Group heading="Quick Actions" className="text-xs text-[#B0E4CC]/70">
            <Command.Item className="cursor-pointer rounded-md px-3 py-2 data-[selected=true]:bg-[#285A48]/60">Deploy active graph</Command.Item>
            <Command.Item className="cursor-pointer rounded-md px-3 py-2 data-[selected=true]:bg-[#285A48]/60">Open network health panel</Command.Item>
            <Command.Item className="cursor-pointer rounded-md px-3 py-2 data-[selected=true]:bg-[#285A48]/60">Switch to APAC environment</Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
