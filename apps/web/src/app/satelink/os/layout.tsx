import { SatelinkOsShell } from "@/components/satelink/os-shell";

export default function SatelinkOsLayout({ children }: { children: React.ReactNode }) {
  return <SatelinkOsShell>{children}</SatelinkOsShell>;
}
