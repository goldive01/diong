"use client";

// Root-level error boundary. Replaces the entire document when a render error
// escapes the root layout, so it renders its own <html>/<body> and uses inline
// styles (the stylesheet is not guaranteed to be present here). Never shows a
// stack trace or database detail — only calm, generic copy and a way forward.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
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
          padding: "24px",
          background: "#f7f4ee",
          color: "#1d2420",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <main
          id="main-content"
          style={{
            width: "100%",
            maxWidth: "28rem",
            borderRadius: "1.5rem",
            border: "1px solid #ded7c9",
            background: "#ffffff",
            padding: "2rem",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.8125rem",
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#6f7b4f",
            }}
          >
            Diong
          </p>
          <h1
            style={{
              margin: "0.75rem 0 0",
              fontSize: "1.5rem",
              fontWeight: 600,
            }}
          >
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.75rem", lineHeight: 1.7, color: "#5f6962" }}>
            An unexpected error interrupted the page. Your account and your saved
            work are not affected. You can try again, or return to your home
            page.
          </p>
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                minHeight: "3rem",
                border: "none",
                borderRadius: "9999px",
                background: "#263b2d",
                padding: "0 1.5rem",
                fontWeight: 600,
                fontSize: "1rem",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/home"
              style={{
                minHeight: "3rem",
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "9999px",
                border: "1px solid #cfc8bb",
                padding: "0 1.5rem",
                fontWeight: 600,
                color: "#3e4a41",
                textDecoration: "none",
              }}
            >
              Go to home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
