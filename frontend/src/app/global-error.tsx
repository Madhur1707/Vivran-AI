"use client";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#fafafa",
          color: "#171717",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: "#737373", marginBottom: 16 }}>
            {error.message}
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 8,
              border: "none",
              backgroundColor: "#18181b",
              color: "white",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
