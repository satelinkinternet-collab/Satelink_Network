export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { redirect } from "next/navigation";

export default function PrivacyRedirect() {
  redirect("/legal/privacy");
}
