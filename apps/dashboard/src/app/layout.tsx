import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/hooks/use-auth";

export const metadata: Metadata = {
  title: "Satelink Dashboard",
  description: "Control panel"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif" }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
