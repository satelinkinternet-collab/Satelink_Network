"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ background: "#091413", color: "#B0E4CC", padding: "2rem", fontFamily: "system-ui" }}>
        <h1>Something went wrong</h1>
        <p>An unexpected error occurred.</p>
        <button onClick={reset} style={{ marginRight: "0.5rem", padding: "0.5rem 1rem", background: "#408A71", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          Try again
        </button>
        <a href="/" style={{ padding: "0.5rem 1rem", color: "#B0E4CC" }}>Go home</a>
      </body>
    </html>
  );
}
