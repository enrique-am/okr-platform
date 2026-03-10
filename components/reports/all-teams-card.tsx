import type { TeamProgressSummary, ProgressStatus } from "@/lib/reports"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ProgressStatus, string> = {
  AHEAD:    "ADELANTE",
  ON_TRACK: "EN CAMINO",
  AT_RISK:  "EN RIESGO",
  BEHIND:   "REZAGADO",
}

// Bar color, row/block background, badge background, text color per status
const STATUS_COLORS: Record<ProgressStatus, { bar: string; bg: string; badgeBg: string; text: string }> = {
  AHEAD:    { bar: "#72bf44", bg: "#f0fae8", badgeBg: "#dcfce7", text: "#166534" },
  ON_TRACK: { bar: "#72bf44", bg: "#f0fae8", badgeBg: "#dcfce7", text: "#166534" },
  AT_RISK:  { bar: "#f59e0b", bg: "#fffbeb", badgeBg: "#fef3c7", text: "#92400e" },
  BEHIND:   { bar: "#ef4444", bg: "#fef2f2", badgeBg: "#fee2e2", text: "#991b1b" },
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

function getStatus(delta: number): ProgressStatus {
  if (delta >= 5) return "AHEAD"
  if (delta >= -10) return "ON_TRACK"
  if (delta >= -20) return "AT_RISK"
  return "BEHIND"
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AllTeamsCard({
  teams,
  companyActual,
  companyExpected,
  quarterLabel,
  today,
}: {
  teams: TeamProgressSummary[]
  companyActual: number
  companyExpected: number
  quarterLabel: string
  today: Date
}) {
  const dateStr = today.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const weekStr = today.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  // Company-level status
  const companyDelta = companyActual - companyExpected
  const companyStatus = getStatus(companyDelta)
  const companyColors = STATUS_COLORS[companyStatus]
  const companyDeltaStr = companyDelta >= 0 ? `+${companyDelta}%` : `${companyDelta}%`
  const barMarker = Math.min(97, Math.max(3, companyExpected))

  return (
    <div
      style={{
        width: "390px",
        backgroundColor: "#ffffff",
        fontFamily: FONT,
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: "14px 16px 11px",
          borderBottom: "1px solid #f3f4f6",
        }}
      >
        {/* Logo + ORCs badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Grupo AM"
            crossOrigin="anonymous"
            style={{ width: "90px", height: "24px", objectFit: "contain", display: "block" }}
          />
          <span
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#72bf44",
              padding: "2px 7px",
              border: "1.5px solid #72bf44",
              borderRadius: "5px",
              letterSpacing: "0.06em",
            }}
          >
            ORCs
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "17px",
            fontWeight: "700",
            color: "#111827",
            marginBottom: "5px",
            lineHeight: "1.2",
          }}
        >
          Reporte de Avance
        </div>

        {/* Date + quarter */}
        <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>{dateStr}</span>
          <span style={{ color: "#d1d5db", fontSize: "13px" }}>·</span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#72bf44",
              padding: "2px 8px",
              backgroundColor: "#f0fdf4",
              borderRadius: "20px",
            }}
          >
            {quarterLabel}
          </span>
        </div>
      </div>

      {/* ── Company score block ── */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: companyColors.bg,
        }}
      >
        {/* Label */}
        <div
          style={{
            fontSize: "10px",
            fontWeight: "700",
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginBottom: "6px",
          }}
        >
          Avance Empresarial
        </div>

        {/* Score row: large % + delta badge + status label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "4px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "30px",
              fontWeight: "800",
              color: "#111827",
              lineHeight: "1",
            }}
          >
            {companyActual}%
          </span>
          <span
            style={{
              padding: "3px 9px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "700",
              backgroundColor: companyColors.badgeBg,
              color: companyColors.text,
            }}
          >
            {companyDeltaStr}
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: companyColors.text,
              letterSpacing: "0.05em",
            }}
          >
            {STATUS_LABELS[companyStatus]}
          </span>
        </div>

        {/* Expected secondary text */}
        <div
          style={{
            fontSize: "11px",
            color: "#9ca3af",
            marginBottom: "8px",
          }}
        >
          esperado: {companyExpected}%
        </div>

        {/* Company progress bar */}
        <div
          style={{
            position: "relative",
            height: "8px",
            backgroundColor: "#e5e7eb",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${Math.min(100, companyActual)}%`,
              backgroundColor: companyColors.bar,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `calc(${barMarker}% - 1px)`,
              width: "2px",
              backgroundColor: "#1f2937",
            }}
          />
        </div>
      </div>

      {/* ── Team rows ── */}
      <div style={{ padding: "2px 0" }}>
        {teams.map((team, i) => {
          const colors = STATUS_COLORS[team.status]
          const deltaStr = team.delta >= 0 ? `+${team.delta}%` : `${team.delta}%`
          const barActual = Math.min(100, team.actualProgress)
          const teamMarker = Math.min(97, Math.max(3, team.expectedProgress))

          return (
            <div
              key={team.teamId}
              style={{
                padding: "11px 16px",
                backgroundColor: colors.bg,
                borderBottom: i < teams.length - 1 ? "1px solid #e8f0e0" : "none",
              }}
            >
              {/* Team name + delta + status */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "7px",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#111827",
                    lineHeight: "1.3",
                    minWidth: 0,
                  }}
                >
                  {team.teamName}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                  <span
                    style={{
                      padding: "2px 7px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: "700",
                      backgroundColor: colors.badgeBg,
                      color: colors.text,
                    }}
                  >
                    {deltaStr}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      color: colors.text,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {STATUS_LABELS[team.status]}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  position: "relative",
                  height: "8px",
                  backgroundColor: "#e5e7eb",
                  borderRadius: "4px",
                  overflow: "hidden",
                  marginBottom: "5px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${barActual}%`,
                    backgroundColor: colors.bar,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `calc(${teamMarker}% - 1px)`,
                    width: "2px",
                    backgroundColor: "#1f2937",
                  }}
                />
              </div>

              {/* Values row */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: "600", color: colors.text }}>
                  Real: {team.actualProgress}%
                </span>
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                  Esperado: {team.expectedProgress}%
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          padding: "9px 16px",
          backgroundColor: "#f9fafb",
          borderTop: "1px solid #f3f4f6",
        }}
      >
        <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0, textAlign: "center" }}>
          Generado por Grupo AM ORCs · semana del {weekStr}
        </p>
      </div>
    </div>
  )
}
