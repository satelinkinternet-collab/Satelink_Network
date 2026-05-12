export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

"use client";

import { redirect } from "next/navigation";

export default function SatelinkDocsRedirect() {
  redirect("https://docs.satelink.network");
}
