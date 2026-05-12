"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);

  return (
    <html lang="en">
      <body
        style={{
          background: "#0b0e0d",
          color: "#b0e4cc",
          fontFamily: "monospace",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            color: "#408a71",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          SATELINK · SYSTEM ERROR
        </div>

        <div style={{ fontSize: "13px", color: "#b0e4cc" }}>
          {error?.message || "Something went wrong"}
        </div>

        <button
          onClick={() => reset()}
          style={{
            padding: "6px 16px",
            background: "#408a71",
            color: "#0b0e0d",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          Retry
        </button>
      </body>
    </html>
  );
}
