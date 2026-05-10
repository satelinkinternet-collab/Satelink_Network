"use client";

export const runtime = "edge";
export const preferredRegion = "auto";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
        }}
      >
        <h1>Something went wrong</h1>
        <button onClick={() => reset()}>Try again</button>
        <a href="/">Go home</a>
      </body>
    </html>
  );
}
