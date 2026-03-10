import type { TeamProgressSummary, KRSummary, ProgressStatus } from "@/lib/reports"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ProgressStatus, string> = {
  AHEAD:    "ADELANTE",
  ON_TRACK: "EN CAMINO",
  AT_RISK:  "EN RIESGO",
  BEHIND:   "REZAGADO",
}

const STATUS_COLORS: Record<ProgressStatus, { bg: string; text: string }> = {
  AHEAD:    { bg: "#dcfce7", text: "#16a34a" },
  ON_TRACK: { bg: "#dbeafe", text: "#1d4ed8" },
  AT_RISK:  { bg: "#fef3c7", text: "#d97706" },
  BEHIND:   { bg: "#fee2e2", text: "#dc2626" },
}

const TRACKING_DOT: Record<string, string> = {
  ON_TRACK:  "#16a34a",
  AT_RISK:   "#d97706",
  OFF_TRACK: "#dc2626",
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const BRAND = "#72bf44"

// ─── KR value formatters ─────────────────────────────────────────────────────

function fmtValue(kr: KRSummary): string {
  if (kr.type === "BOOLEAN") return kr.currentValue >= 1 ? "✓ Completado" : "○ Pendiente"
  if (kr.type === "PERCENTAGE") return `${Math.round(kr.currentValue)}%`
  if (kr.type === "CURRENCY")
    return `$${kr.currentValue.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`
  const suffix = kr.unit ? ` ${kr.unit}` : ""
  return `${kr.currentValue.toLocaleString("es-MX", { maximumFractionDigits: 1 })}${suffix}`
}

function fmtTarget(kr: KRSummary): string {
  if (kr.type === "BOOLEAN") return ""
  if (kr.type === "PERCENTAGE") return `${Math.round(kr.targetValue)}%`
  if (kr.type === "CURRENCY")
    return `$${kr.targetValue.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`
  const suffix = kr.unit ? ` ${kr.unit}` : ""
  return `${kr.targetValue.toLocaleString("es-MX", { maximumFractionDigits: 1 })}${suffix}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TeamCard({
  team,
  quarterLabel,
  today,
}: {
  team: TeamProgressSummary
  quarterLabel: string
  today: Date
}) {
  const colors = STATUS_COLORS[team.status]
  const deltaStr = team.delta >= 0 ? `+${team.delta}%` : `${team.delta}%`

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
          padding: "14px 16px 12px",
          borderBottom: "1px solid #f3f4f6",
          backgroundColor: "#fafffe",
        }}
      >
        {/* Logo branding */}
        <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Grupo AM"
            crossOrigin="anonymous"
            style={{ width: "80px", height: "21px", objectFit: "contain", display: "block" }}
          />
          <span
            style={{
              fontSize: "10px",
              fontWeight: "700",
              color: BRAND,
              padding: "1px 6px",
              border: `1.5px solid ${BRAND}`,
              borderRadius: "4px",
              letterSpacing: "0.06em",
            }}
          >
            ORCs
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "11px",
            fontWeight: "600",
            color: "#9ca3af",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            marginBottom: "3px",
          }}
        >
          Reporte de Avance
        </div>

        {/* Team name */}
        <div
          style={{
            fontSize: "18px",
            fontWeight: "800",
            color: "#111827",
            marginBottom: "4px",
            lineHeight: "1.2",
          }}
        >
          {team.teamName}
        </div>

        {/* Quarter + date */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            marginBottom: "11px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: BRAND,
              padding: "2px 8px",
              backgroundColor: "#f0fdf4",
              borderRadius: "20px",
            }}
          >
            {quarterLabel}
          </span>
          <span style={{ color: "#d1d5db", fontSize: "12px" }}>·</span>
          <span style={{ fontSize: "11px", color: "#6b7280" }}>{dateStr}</span>
        </div>

        {/* Progress summary block */}
        <div
          style={{
            backgroundColor: "#f9fafb",
            borderRadius: "10px",
            padding: "10px 12px",
            border: "1px solid #f3f4f6",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "2px" }}>
                Avance real
              </div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: BRAND, lineHeight: "1" }}>
                {team.actualProgress}%
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "2px" }}>
                Esperado
              </div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#9ca3af", lineHeight: "1" }}>
                {team.expectedProgress}%
              </div>
            </div>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "700",
                backgroundColor: colors.bg,
                color: colors.text,
              }}
            >
              {deltaStr}
            </span>
          </div>

          {/* Progress bar */}
          <div
            style={{
              position: "relative",
              height: "8px",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
              overflow: "hidden",
              marginBottom: "3px",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${Math.min(100, team.actualProgress)}%`,
                backgroundColor: BRAND,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `calc(${Math.min(97, Math.max(3, team.expectedProgress))}% - 1px)`,
                width: "2px",
                backgroundColor: "#1f2937",
              }}
            />
          </div>

          {/* Status label */}
          <div style={{ textAlign: "center", marginTop: "4px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: colors.text,
                letterSpacing: "0.06em",
              }}
            >
              {STATUS_LABELS[team.status]}
            </span>
          </div>
        </div>
      </div>

      {/* ── Check-in compliance ── */}
      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid #f3f4f6",
          backgroundColor: team.hasCheckinThisWeek ? "#f0fdf4" : "#fff7ed",
          display: "flex",
          alignItems: "center",
          gap: "7px",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            color: team.hasCheckinThisWeek ? BRAND : "#d97706",
            lineHeight: "1",
          }}
        >
          {team.hasCheckinThisWeek ? "✓" : "✗"}
        </span>
        <span
          style={{
            fontSize: "12px",
            fontWeight: "600",
            color: team.hasCheckinThisWeek ? "#15803d" : "#d97706",
          }}
        >
          {team.hasCheckinThisWeek
            ? "Check-in enviado esta semana"
            : "Check-in pendiente esta semana"}
        </span>
      </div>

      {/* ── Objectives ── */}
      <div style={{ padding: "3px 0" }}>
        {team.objectives.length === 0 ? (
          <div
            style={{
              padding: "16px",
              textAlign: "center",
              color: "#9ca3af",
              fontSize: "12px",
            }}
          >
            Sin ORCs activos este trimestre
          </div>
        ) : (
          team.objectives.map((obj, oi) => {
            const dotColor = TRACKING_DOT[obj.trackingStatus] ?? "#9ca3af"
            return (
              <div
                key={obj.id}
                style={{
                  padding: "10px 16px",
                  borderBottom: oi < team.objectives.length - 1 ? "1px solid #f3f4f6" : "none",
                }}
              >
                {/* ORC header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "7px",
                    marginBottom: "7px",
                  }}
                >
                  {/* Traffic light dot */}
                  <div
                    style={{
                      width: "9px",
                      height: "9px",
                      borderRadius: "50%",
                      backgroundColor: dotColor,
                      marginTop: "3px",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#111827",
                        lineHeight: "1.3",
                        marginBottom: "1px",
                      }}
                    >
                      {obj.title}
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: BRAND }}>
                      {obj.progress}% completado
                    </div>
                  </div>
                </div>

                {/* Key Results */}
                {obj.keyResults.length > 0 && (
                  <div
                    style={{
                      paddingLeft: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "7px",
                    }}
                  >
                    {obj.keyResults.map((kr) => {
                      const krBarWidth = Math.min(100, Math.round(kr.progress))
                      const isBoolean = kr.type === "BOOLEAN"
                      return (
                        <div key={kr.id}>
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: "600",
                              color: "#374151",
                              marginBottom: "3px",
                              lineHeight: "1.3",
                            }}
                          >
                            {kr.title}
                          </div>

                          {!isBoolean && (
                            <div
                              style={{
                                height: "5px",
                                backgroundColor: "#e5e7eb",
                                borderRadius: "3px",
                                overflow: "hidden",
                                marginBottom: "3px",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${krBarWidth}%`,
                                  backgroundColor: BRAND,
                                  borderRadius: "3px",
                                }}
                              />
                            </div>
                          )}

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span style={{ fontSize: "11px", color: "#6b7280" }}>
                              {fmtValue(kr)}
                              {!isBoolean && fmtTarget(kr) && (
                                <span style={{ color: "#9ca3af" }}> / {fmtTarget(kr)}</span>
                              )}
                            </span>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                color: isBoolean
                                  ? kr.currentValue >= 1
                                    ? BRAND
                                    : "#9ca3af"
                                  : BRAND,
                              }}
                            >
                              {isBoolean ? "" : `${Math.round(kr.progress)}%`}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          padding: "8px 16px",
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
