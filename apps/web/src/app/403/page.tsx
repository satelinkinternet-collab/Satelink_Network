"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#090909",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "520px",
        }}
      >
        <h1
          style={{
            fontSize: "48px",
            fontWeight: 700,
            marginBottom: "12px",
          }}
        >
          403
        </h1>

        <p
          style={{
            opacity: 0.7,
            marginBottom: "32px",
            lineHeight: 1.6,
          }}
        >
          Access denied. You do not have permission to view this page.
        </p>

        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "12px 20px",
            background: "#0E8388",
            color: "#ffffff",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
