import { InternalAccessShell } from "@/components/internal/access-shell";

export default function InternalAccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InternalAccessShell>{children}</InternalAccessShell>;
}
