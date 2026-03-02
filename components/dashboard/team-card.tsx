"use client"

import { useState } from "react"
import Link from "next/link"
import type { TeamData, Objective, KeyResult, OKRStatus } from "@/lib/mock-data"

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

const TS_CONFIG: Record<
  "ON_TRACK" | "AT_RISK" | "OFF_TRACK",
  { dot: string; bar: string }
> = {
  ON_TRACK:  { dot: "bg-brand-500", bar: "bg-brand-500" },
  AT_RISK:   { dot: "bg-amber-400", bar: "bg-amber-400" },
  OFF_TRACK: { dot: "bg-red-400",   bar: "bg-red-400"   },
}

// ─── TeamCard ─────────────────────────────────────────────────────────────────

export function TeamCard({ team }: { team: TeamData }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

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
            <Link
              href={`/dashboard/teams/${team.slug}`}
              className="group inline-flex items-center gap-1"
            >
              <h3 className="font-semibold text-gray-900 truncate group-hover:text-brand-600 transition-colors">
                {team.name}
              </h3>
              {/* External link icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-3 h-3 text-gray-300 group-hover:text-brand-500 transition-colors flex-shrink-0 mb-px"
              >
                <path
                  fillRule="evenodd"
                  d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
                  clipRule="evenodd"
                />
                <path
                  fillRule="evenodd"
                  d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{team.lead}</p>
          </div>
          <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
            {team.objectives.length}{" "}
            {team.objectives.length === 1 ? "objetivo" : "objetivos"}
          </span>
        </div>
      </div>

      {/* Objectives */}
      <div className="flex-1 px-4 py-3 space-y-1.5">
        {team.objectives.map((obj) => (
          <ObjectiveAccordion
            key={obj.id}
            objective={obj}
            isOpen={!!expanded[obj.id]}
            onToggle={() => toggle(obj.id)}
          />
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

      {/* Footer: check-in CTA */}
      <div className="px-4 pb-4">
        <Link
          href={`/dashboard/teams/${team.slug}/checkin`}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-3.5 h-3.5"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z"
              clipRule="evenodd"
            />
          </svg>
          Registrar avance
        </Link>
      </div>

    </div>
  )
}

// ─── ObjectiveAccordion ───────────────────────────────────────────────────────

function ObjectiveAccordion({
  objective,
  isOpen,
  onToggle,
}: {
  objective: Objective
  isOpen: boolean
  onToggle: () => void
}) {
  const cfg = STATUS_CONFIG[objective.status]

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      {/* Header row — click to expand */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none hover:bg-gray-50 transition-colors"
        onClick={onToggle}
        role="button"
        aria-expanded={isOpen}
      >
        {/* Chevron */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
        >
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>

        {/* OKR label */}
        <span className="text-xs font-bold text-gray-400 flex-shrink-0 tabular-nums">
          OKR {objective.number}
        </span>

        {/* Title */}
        <p className="text-sm font-medium text-gray-800 leading-snug flex-1 min-w-0 truncate">
          {objective.title}
        </p>

        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />

        {/* Progress */}
        <span className="text-xs font-semibold text-gray-500 flex-shrink-0 tabular-nums w-8 text-right">
          {objective.progress}%
        </span>

        {/* Edit link — stops propagation so it doesn't toggle the accordion */}
        <Link
          href={`/dashboard/${objective.id}/edit`}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 p-1 -mr-1 text-gray-300 hover:text-brand-500 transition-colors rounded"
          title="Editar objetivo"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-3.5 h-3.5"
          >
            <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
          </svg>
        </Link>
      </div>

      {/* Progress bar (always visible) */}
      <div className="h-0.5 bg-gray-100 mx-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
          style={{ width: `${objective.progress}%` }}
        />
      </div>

      {/* Expandable KR list */}
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3 pt-2 pb-3 space-y-2">
            {objective.keyResults.map((kr) => (
              <KRRow key={kr.id} objectiveNumber={objective.number} kr={kr} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── KRRow ────────────────────────────────────────────────────────────────────

const KR_TYPE_SHORT: Record<string, string> = {
  PERCENTAGE: "%",
  NUMBER: "#",
  CURRENCY: "$",
  BOOLEAN: "✓",
}

function KRRow({
  objectiveNumber,
  kr,
}: {
  objectiveNumber: number
  kr: KeyResult
}) {
  const ts = TS_CONFIG[kr.trackingStatus]

  const valueLabel =
    kr.type === "BOOLEAN"
      ? kr.currentValue > 0
        ? "Completado"
        : "Pendiente"
      : `${kr.currentValue}${kr.unit ? ` ${kr.unit}` : ""} / ${kr.targetValue}${kr.unit ? ` ${kr.unit}` : ""}`

  return (
    <div className="pl-5">
      {/* KR number + title */}
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-xs font-bold text-gray-400 flex-shrink-0 tabular-nums">
          KR {objectiveNumber}.{kr.number}
        </span>
        <span className="text-xs text-gray-700 leading-snug line-clamp-1 min-w-0">
          {kr.title}
        </span>
      </div>

      {/* Progress bar + % */}
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${ts.bar}`}
            style={{ width: `${kr.progress}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-gray-500 flex-shrink-0 w-7 text-right">
          {kr.progress}%
        </span>
      </div>

      {/* Type + values */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <span className="font-mono">{KR_TYPE_SHORT[kr.type]}</span>
        <span>·</span>
        <span className="truncate">{valueLabel}</span>
        <span className="ml-auto flex-shrink-0 flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ts.dot}`} />
        </span>
      </div>
    </div>
  )
}
