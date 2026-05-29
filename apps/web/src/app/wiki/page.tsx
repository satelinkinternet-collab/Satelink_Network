import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wiki | Satelink Network",
  description: "Redirecting to Satelink documentation on GitHub.",
};

export default function WikiPage() {
  redirect("https://github.com/Satelink-Protocol/Satelink_Network/wiki");
}
