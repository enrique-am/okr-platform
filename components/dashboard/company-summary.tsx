import type { TeamData } from "@/lib/mock-data"

interface CompanySummaryProps {
  teams: TeamData[]
}

export function CompanySummary({ teams }: CompanySummaryProps) {
  const allObjectives = teams.flatMap((t) => t.objectives)
  const total = allObjectives.length
  const onTrack = allObjectives.filter((o) => o.status === "on_track").length
  const atRisk = allObjectives.filter((o) => o.status === "at_risk").length
  const offTrack = allObjectives.filter((o) => o.status === "off_track").length
  const overallProgress =
    total > 0
      ? Math.round(allObjectives.reduce((sum, o) => sum + o.progress, 0) / total)
      : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Brand accent line */}
      <div className="h-1 bg-brand-500" />

      <div className="p-6">
        {/* Header row */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Grupo AM</h2>
            <p className="text-sm text-gray-400 mt-0.5">Resumen corporativo · Q1 2026</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-gray-900">{overallProgress}%</span>
            <p className="text-xs text-gray-400 mt-0.5">Progreso general</p>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Stat chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatChip label="Total" value={total} variant="neutral" />
          <StatChip label="En seguimiento" value={onTrack} variant="green" />
          <StatChip label="En riesgo" value={atRisk} variant="amber" />
          <StatChip label="Retrasados" value={offTrack} variant="red" />
        </div>
      </div>
    </div>
  )
}

// ─── StatChip ────────────────────────────────────────────────────────────────

type Variant = "neutral" | "green" | "amber" | "red"

const VARIANT_STYLES: Record<Variant, { wrap: string; dot: string; value: string }> = {
  neutral: {
    wrap: "bg-gray-50 border border-gray-100",
    dot: "bg-gray-400",
    value: "text-gray-900",
  },
  green: {
    wrap: "bg-brand-50 border border-brand-100",
    dot: "bg-brand-500",
    value: "text-brand-700",
  },
  amber: {
    wrap: "bg-amber-50 border border-amber-100",
    dot: "bg-amber-400",
    value: "text-amber-700",
  },
  red: {
    wrap: "bg-red-50 border border-red-100",
    dot: "bg-red-400",
    value: "text-red-600",
  },
}

function StatChip({
  label,
  value,
  variant,
}: {
  label: string
  value: number
  variant: Variant
}) {
  const s = VARIANT_STYLES[variant]
  return (
    <div className={`rounded-xl px-4 py-3 ${s.wrap}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
        <span className="text-xs text-gray-500 truncate">{label}</span>
      </div>
      <span className={`text-2xl font-bold ${s.value}`}>{value}</span>
    </div>
  )
}
