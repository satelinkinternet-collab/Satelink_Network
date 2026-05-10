"use client";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          background: "#091413",
          color: "#B0E4CC",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Something went wrong</h1>
        <p style={{ color: "#B0E4CC80", margin: 0 }}>An unexpected error occurred.</p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              background: "#408A71",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              color: "#B0E4CC",
              border: "1px solid #B0E4CC40",
              borderRadius: "0.375rem",
              textDecoration: "none",
            }}
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  );
}
