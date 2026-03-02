import type { TeamData, Objective, OKRStatus } from "@/lib/mock-data"

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OKRStatus,
  { label: string; dot: string; bar: string; badge: string }
> = {
  on_track: {
    label: "En seguimiento",
    dot: "bg-brand-500",
    bar: "bg-brand-500",
    badge: "bg-brand-50 text-brand-700",
  },
  at_risk: {
    label: "En riesgo",
    dot: "bg-amber-400",
    bar: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700",
  },
  off_track: {
    label: "Retrasado",
    dot: "bg-red-400",
    bar: "bg-red-400",
    badge: "bg-red-50 text-red-600",
  },
}

// ─── TeamCard ─────────────────────────────────────────────────────────────────

interface TeamCardProps {
  team: TeamData
}

export function TeamCard({ team }: TeamCardProps) {
  const avgProgress =
    team.objectives.length > 0
      ? Math.round(
          team.objectives.reduce((sum, o) => sum + o.progress, 0) /
            team.objectives.length
        )
      : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{team.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{team.lead}</p>
          </div>
          <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
            {team.objectives.length}{" "}
            {team.objectives.length === 1 ? "objetivo" : "objetivos"}
          </span>
        </div>
      </div>

      {/* Objectives */}
      <div className="flex-1 px-5 py-4 space-y-5">
        {team.objectives.map((obj) => (
          <ObjectiveRow key={obj.id} objective={obj} />
        ))}
      </div>

      {/* Footer: team average */}
      <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">Promedio del equipo</span>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-400 rounded-full"
              style={{ width: `${avgProgress}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-600 w-8 text-right">
            {avgProgress}%
          </span>
        </div>
      </div>

    </div>
  )
}

// ─── ObjectiveRow ─────────────────────────────────────────────────────────────

function ObjectiveRow({ objective }: { objective: Objective }) {
  const cfg = STATUS_CONFIG[objective.status]

  return (
    <div>
      {/* Title */}
      <p className="text-sm font-medium text-gray-800 leading-snug mb-2 line-clamp-2">
        {objective.title}
      </p>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
            style={{ width: `${objective.progress}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-gray-500 w-8 text-right tabular-nums">
          {objective.progress}%
        </span>
      </div>

      {/* Status badge + KR count */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
          {cfg.label}
        </span>
        <span className="text-xs text-gray-400">
          {objective.keyResults.length} resultado
          {objective.keyResults.length !== 1 ? "s" : ""} clave
        </span>
      </div>
    </div>
  )
}
