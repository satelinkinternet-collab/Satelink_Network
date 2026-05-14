"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { WalletProvider } from "@/providers/WalletProvider";

const AuthProvider = dynamic(
  () => import("@/hooks/use-auth").then((mod) => mod.AuthProvider),
  {
    ssr: false,
  },
);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <AuthProvider>{children}</AuthProvider>
      <Toaster position="top-right" />
    </WalletProvider>
  );
}
