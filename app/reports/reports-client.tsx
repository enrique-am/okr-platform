"use client"

import { useState, useRef, useCallback } from "react"
import { AllTeamsCard } from "@/components/reports/all-teams-card"
import { TeamCard } from "@/components/reports/team-card"
import type { TeamProgressSummary } from "@/lib/reports"

interface ReportsClientProps {
  teams: TeamProgressSummary[]
  expectedProgress: number
  companyActual: number
  companyExpected: number
  quarterLabel: string
  todayIso: string
}

function dateToFilename(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0")
  const m = (date.getMonth() + 1).toString().padStart(2, "0")
  const y = date.getFullYear()
  return `${d}-${m}-${y}`
}

export function ReportsClient({
  teams,
  expectedProgress,
  companyActual,
  companyExpected,
  quarterLabel,
  todayIso,
}: ReportsClientProps) {
  const today = new Date(todayIso)
  const [activeTab, setActiveTab] = useState<"resumen" | "equipo">("resumen")
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.teamId ?? "")
  const [exporting, setExporting] = useState(false)

  const allTeamsRef = useRef<HTMLDivElement>(null)
  const teamCardRef = useRef<HTMLDivElement>(null)

  const selectedTeam = teams.find((t) => t.teamId === selectedTeamId) ?? teams[0]

  const exportPNG = useCallback(
    async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
      if (!ref.current) return
      setExporting(true)
      try {
        const { default: html2canvas } = await import("html2canvas")
        const canvas = await html2canvas(ref.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        })
        const url = canvas.toDataURL("image/png")
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        a.click()
      } finally {
        setExporting(false)
      }
    },
    []
  )

  const exportAllTeams = () =>
    exportPNG(allTeamsRef, `reporte-general-semana-${dateToFilename(today)}.png`)

  const exportTeamCard = () => {
    if (!selectedTeam) return
    exportPNG(teamCardRef, `reporte-${selectedTeam.teamSlug}-semana-${dateToFilename(today)}.png`)
  }

  // ── Styles ──────────────────────────────────────────────────────────────────

  const tabBase =
    "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
  const tabActive = "border-brand-500 text-brand-600"
  const tabInactive = "border-transparent text-gray-500 hover:text-gray-700"

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("resumen")}
          className={`${tabBase} ${activeTab === "resumen" ? tabActive : tabInactive}`}
        >
          Resumen general
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("equipo")}
          className={`${tabBase} ${activeTab === "equipo" ? tabActive : tabInactive}`}
        >
          Por equipo
        </button>
      </div>

      {/* ── Resumen general ── */}
      {activeTab === "resumen" && (
        <div>
          {/* Export button */}
          <div className="flex justify-end mb-4">
            <ExportButton onClick={exportAllTeams} loading={exporting} />
          </div>

          {/* Preview */}
          <div className="flex justify-center">
            <div
              className="rounded-2xl overflow-hidden shadow-md"
              style={{ display: "inline-block" }}
            >
              <div ref={allTeamsRef}>
                <AllTeamsCard
                  teams={teams}
                  companyActual={companyActual}
                  companyExpected={companyExpected}
                  quarterLabel={quarterLabel}
                  today={today}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Por equipo ── */}
      {activeTab === "equipo" && (
        <div>
          {/* Team selector + export */}
          <div className="flex items-center gap-3 justify-between mb-4 flex-wrap">
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[200px]"
            >
              {teams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.teamName}
                </option>
              ))}
            </select>
            <ExportButton onClick={exportTeamCard} loading={exporting} />
          </div>

          {/* Preview */}
          {selectedTeam && (
            <div className="flex justify-center">
              <div
                className="rounded-2xl overflow-hidden shadow-md"
                style={{ display: "inline-block" }}
              >
                <div ref={teamCardRef}>
                  <TeamCard
                    team={selectedTeam}
                    quarterLabel={quarterLabel}
                    today={today}
                  />
                </div>
              </div>
            </div>
          )}

          {!selectedTeam && (
            <p className="text-center text-sm text-gray-400 py-12">
              Selecciona un equipo para ver su reporte.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Export button ────────────────────────────────────────────────────────────

function ExportButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Exportando…
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
          Exportar PNG
        </>
      )}
    </button>
  )
}
