"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { submitCheckIn } from "./actions"

// Local mirror of Prisma enum
const KRType = {
  PERCENTAGE: "PERCENTAGE",
  NUMBER:     "NUMBER",
  CURRENCY:   "CURRENCY",
  BOOLEAN:    "BOOLEAN",
} as const
type KRType = (typeof KRType)[keyof typeof KRType]

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KRItem {
  id: string
  title: string
  type: KRType
  currentValue: number
  targetValue: number
  unit: string | null
  krNumber: number
}

export interface ObjectiveGroup {
  objectiveNumber: number
  objectiveTitle: string
  krs: KRItem[]
}

interface EntryState {
  newValue: number
  originalValue: number
  notes: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcProgress(type: KRType, current: number, target: number): number {
  if (type === KRType.BOOLEAN) return current > 0 ? 100 : 0
  return target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
}

function formatCurrent(kr: KRItem): string {
  if (kr.type === KRType.BOOLEAN) return kr.currentValue > 0 ? "Completado" : "Pendiente"
  const u = kr.unit ? ` ${kr.unit}` : ""
  return `${kr.currentValue}${u}`
}

function formatTarget(kr: KRItem): string {
  if (kr.type === KRType.BOOLEAN) return "Completado"
  const u = kr.unit ? ` ${kr.unit}` : ""
  return `${kr.targetValue}${u}`
}

// ─── CheckInForm ──────────────────────────────────────────────────────────────

export function CheckInForm({
  teamSlug,
  groups,
}: {
  teamSlug: string
  groups: ObjectiveGroup[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Build initial state: one entry per KR keyed by kr.id
  const [entries, setEntries] = useState<Record<string, EntryState>>(() => {
    const init: Record<string, EntryState> = {}
    for (const g of groups) {
      for (const kr of g.krs) {
        init[kr.id] = {
          newValue: kr.currentValue,
          originalValue: kr.currentValue,
          notes: "",
        }
      }
    }
    return init
  })

  function update(krId: string, patch: Partial<EntryState>) {
    setEntries((prev) => ({ ...prev, [krId]: { ...prev[krId], ...patch } }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await submitCheckIn({
        teamSlug,
        entries: Object.entries(entries).map(([krId, e]) => ({ krId, ...e })),
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      router.push(`/dashboard/teams/${teamSlug}`)
    })
  }

  const totalKRs = groups.reduce((s, g) => s + g.krs.length, 0)

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6 pb-28 sm:pb-8">
        {groups.map((group) => (
          <section key={group.objectiveNumber}>
            {/* Objective header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-500 tabular-nums">
                ORC {group.objectiveNumber}
              </span>
              <p className="text-sm font-medium text-gray-700 leading-snug line-clamp-1 min-w-0">
                {group.objectiveTitle}
              </p>
            </div>

            {/* KR cards */}
            <div className="space-y-3">
              {group.krs.map((kr) => {
                const entry = entries[kr.id]
                const progress = calcProgress(kr.type, entry.newValue, kr.targetValue)
                const isBoolean = kr.type === KRType.BOOLEAN
                const changed = entry.newValue !== entry.originalValue

                return (
                  <div
                    key={kr.id}
                    className={`bg-white rounded-2xl border shadow-sm px-4 py-4 space-y-3 transition-colors ${
                      changed ? "border-brand-200" : "border-gray-100"
                    }`}
                  >
                    {/* KR label + title */}
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 mt-0.5 text-xs font-bold text-gray-400 tabular-nums">
                        RC {group.objectiveNumber}.{kr.krNumber}
                      </span>
                      <p className="text-sm font-medium text-gray-800 leading-snug">
                        {kr.title}
                      </p>
                    </div>

                    {/* Current state */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span>Actual:</span>
                      <span className="font-medium text-gray-600">{formatCurrent(kr)}</span>
                      <span>·</span>
                      <span>Objetivo:</span>
                      <span className="font-medium text-gray-600">{formatTarget(kr)}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-gray-500 w-7 text-right">
                        {progress}%
                      </span>
                    </div>

                    {/* Value input */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Nuevo valor
                      </label>
                      {isBoolean ? (
                        <div className="flex gap-2">
                          {[
                            { label: "Pendiente", value: 0 },
                            { label: "Completado", value: 1 },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => update(kr.id, { newValue: opt.value })}
                              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                entry.newValue === opt.value
                                  ? "border-brand-500 bg-brand-50 text-brand-700"
                                  : "border-gray-200 text-gray-500 hover:border-gray-300"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={entry.newValue}
                            onChange={(e) =>
                              update(kr.id, { newValue: Number(e.target.value) })
                            }
                            min={0}
                            step={kr.type === KRType.CURRENCY ? 1000 : 1}
                            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                          />
                          {kr.unit && (
                            <span className="text-sm text-gray-400 flex-shrink-0">{kr.unit}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Notas <span className="font-normal text-gray-400">(opcional)</span>
                      </label>
                      <textarea
                        value={entry.notes}
                        onChange={(e) => update(kr.id, { notes: e.target.value })}
                        placeholder="¿Qué pasó esta semana con este resultado?"
                        rows={2}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </p>
        )}
      </div>

      {/* Sticky bottom action bar (fixed on mobile, static on sm+) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 flex gap-3 sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:pb-8">
        <button
          type="button"
          onClick={() => router.push(`/dashboard/teams/${teamSlug}`)}
          disabled={isPending}
          className="flex-1 sm:flex-none sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 sm:flex-none sm:w-auto px-5 py-2.5 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending
            ? "Guardando…"
            : `Guardar avance · ${totalKRs} ${totalKRs === 1 ? "RC" : "RCs"}`}
        </button>
      </div>
    </form>
  )
}
