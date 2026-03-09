"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            fontFamily: "system-ui, sans-serif",
            color: "#111827",
          }}
        >
          <p style={{ fontSize: "2rem" }}>⚠️</p>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Algo salió mal</h2>
          <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            Ocurrió un error inesperado. El equipo técnico ha sido notificado.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "8px",
              padding: "10px 20px",
              background: "#72bf44",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  )
}
