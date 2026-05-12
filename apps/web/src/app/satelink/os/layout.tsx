export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { SatelinkOsShell } from "@/components/satelink/os-shell";

export default function SatelinkOsLayout({ children }: { children: React.ReactNode }) {
  return <SatelinkOsShell>{children}</SatelinkOsShell>;
}
