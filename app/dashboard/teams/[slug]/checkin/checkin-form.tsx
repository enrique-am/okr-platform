"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { submitCheckIn, type Milestone } from "./actions"
import { ToastList, type ToastItem } from "@/components/ui/toast"

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
  startValue: number | null
  unit: string | null
  krNumber: number
  dataSource: {
    name: string
    url: string | null
    instructions: string | null
  } | null
}

export interface ObjectiveGroup {
  objectiveNumber: number
  objectiveTitle: string
  krs: KRItem[]
}

interface EntryState {
  newValue: number | null  // null = not touched; will be skipped on submit
  originalValue: number
  notes: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcProgress(type: KRType, current: number, target: number, startValue?: number | null): number {
  if (type === KRType.BOOLEAN) return current > 0 ? 100 : 0
  if (startValue != null && target !== startValue) {
    return Math.min(100, Math.max(0, Math.round(((current - startValue) / (target - startValue)) * 100)))
  }
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

// Milestone level order (higher = more important)
const LEVEL_ORDER: Record<Milestone["level"], number> = {
  rc: 0, orc: 1, team: 2, company: 3,
}

function toastMessageFor(m: Milestone): string {
  switch (m.level) {
    case "rc":      return `🎯 ${m.title} alcanzó el 70%!`
    case "orc":     return `🚀 ${m.title} alcanzó el 70%!`
    case "team":    return `🏆 ¡El equipo ${m.title} alcanzó el 70% general!`
    case "company": return `🎉 ¡Grupo AM alcanzó el 70% de sus objetivos!`
  }
}

async function fireConfetti(level: Milestone["level"]) {
  const confetti = (await import("canvas-confetti")).default
  const brand = "#72bf44"
  const white = "#ffffff"

  if (level === "rc") {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: [brand, "#a8d878", "#c5e8a0"],
    })
  } else if (level === "orc") {
    confetti({
      particleCount: 160,
      spread: 80,
      origin: { y: 0.6 },
      colors: [brand, white, "#a8d878"],
    })
  } else if (level === "team") {
    confetti({
      particleCount: 300,
      spread: 100,
      origin: { y: 0.5 },
      colors: [brand, white],
    })
  } else if (level === "company") {
    // Full-screen burst from both sides
    const fire = (ox: number) =>
      confetti({
        particleCount: 200,
        angle: ox > 0.5 ? 120 : 60,
        spread: 80,
        origin: { x: ox, y: 0.6 },
        colors: [brand, white, "#f0fae8"],
      })
    fire(0.1)
    setTimeout(() => fire(0.9), 150)
    setTimeout(() => fire(0.5), 400)
  }
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
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Build initial state: one entry per KR keyed by kr.id
  // Boolean KRs pre-populate with currentValue (no "empty" state makes sense).
  // Numeric KRs start as null (empty) so users must actively enter a value.
  const [entries, setEntries] = useState<Record<string, EntryState>>(() => {
    const init: Record<string, EntryState> = {}
    for (const g of groups) {
      for (const kr of g.krs) {
        init[kr.id] = {
          newValue: kr.type === KRType.BOOLEAN ? kr.currentValue : null,
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
      // Only submit entries where the user actually entered a value (newValue !== null)
      const toSubmit = Object.entries(entries)
        .filter(([, e]) => e.newValue !== null)
        .map(([krId, e]) => ({ krId, newValue: e.newValue as number, originalValue: e.originalValue, notes: e.notes }))

      const result = await submitCheckIn({
        teamSlug,
        entries: toSubmit,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      const { milestones } = result

      if (milestones.length === 0) {
        router.push(`/dashboard/teams/${teamSlug}`)
        return
      }

      // Sort by level descending — highest first
      const sorted = [...milestones].sort(
        (a, b) => LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level]
      )

      // Fire confetti for the highest-level milestone
      await fireConfetti(sorted[0].level)

      // Build toasts: primary for highest, secondary for the rest
      const newToasts: ToastItem[] = sorted.map((m, i) => ({
        id: `milestone-${i}`,
        message: toastMessageFor(m),
        primary: i === 0,
      }))
      setToasts(newToasts)

      // Navigate after delay proportional to milestone level
      const delay = LEVEL_ORDER[sorted[0].level] >= 2 ? 3500 : 2500
      setTimeout(() => router.push(`/dashboard/teams/${teamSlug}`), delay)
    })
  }

  const totalKRs = groups.reduce((s, g) => s + g.krs.length, 0)
  const filledKRs = Object.values(entries).filter((e) => e.newValue !== null).length

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="space-y-6 pb-28 sm:pb-8">
          {groups.map((group) => (
            <section key={group.objectiveNumber}>
              {/* Objective header */}
              <div className="flex items-start gap-2 mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-500 tabular-nums flex-shrink-0 mt-px">
                  ORC {group.objectiveNumber}
                </span>
                <p className="text-sm font-medium text-gray-700 leading-snug min-w-0">
                  {group.objectiveTitle}
                </p>
              </div>

              {/* KR cards */}
              <div className="space-y-3">
                {group.krs.map((kr) => {
                  const entry = entries[kr.id]
                  const isBoolean = kr.type === KRType.BOOLEAN
                  // For display: use entered value if present, otherwise fall back to currentValue
                  const displayValue = entry.newValue ?? kr.currentValue
                  const progress = calcProgress(kr.type, displayValue, kr.targetValue, kr.startValue)
                  // A card is "changed" when a value has been entered (non-null) and differs from original, or for booleans when toggled
                  const changed = isBoolean
                    ? entry.newValue !== entry.originalValue
                    : entry.newValue !== null

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
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
                        {kr.startValue != null && kr.type !== KRType.BOOLEAN && (
                          <>
                            <span>Inicio:</span>
                            <span className="font-medium text-gray-600">
                              {kr.startValue}{kr.unit ? ` ${kr.unit}` : ""}
                            </span>
                            <span>→</span>
                          </>
                        )}
                        <span>Actual:</span>
                        <span className="font-medium text-gray-600">{formatCurrent(kr)}</span>
                        <span>·</span>
                        <span>Meta:</span>
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

                      {/* Data source */}
                      {kr.dataSource && (
                        <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-brand-800">
                              {kr.dataSource.name}
                            </p>
                            {kr.dataSource.url && (
                              <a
                                href={kr.dataSource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors flex-shrink-0"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 16 16"
                                  fill="currentColor"
                                  className="w-3 h-3"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-4.95-4.95l1.5-1.5a.75.75 0 0 1 1.06 1.06l-1.5 1.5a2 2 0 0 0 2.83 2.83l2-2a2 2 0 0 0 0-2.83.75.75 0 0 1 0-1.06Z"
                                    clipRule="evenodd"
                                  />
                                  <path
                                    fillRule="evenodd"
                                    d="M7.086 9.975a.75.75 0 0 1-1.06 0 3.5 3.5 0 0 1 0-4.95l2-2a3.5 3.5 0 0 1 4.95 4.95l-1.5 1.5a.75.75 0 0 1-1.06-1.06l1.5-1.5a2 2 0 0 0-2.83-2.83l-2 2a2 2 0 0 0 0 2.83.75.75 0 0 1 0 1.06Z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Abrir fuente
                              </a>
                            )}
                          </div>
                          {kr.dataSource.instructions && (
                            <p className="text-xs text-brand-700 leading-relaxed">
                              {kr.dataSource.instructions}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Value input */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-medium text-gray-600">
                            Nuevo valor
                          </label>
                          {!isBoolean && entry.newValue === null && (
                            <span className="text-xs text-gray-400 italic">Sin cambios</span>
                          )}
                        </div>
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
                              value={entry.newValue ?? ""}
                              onChange={(e) =>
                                update(kr.id, {
                                  newValue: e.target.value === "" ? null : Number(e.target.value),
                                })
                              }
                              min={0}
                              step={kr.type === KRType.CURRENCY ? 1000 : "any"}
                              placeholder="Ingresa el valor actual..."
                              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder:text-gray-300"
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

        {/* Sticky bottom action bar */}
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
              : filledKRs === 0
              ? "Guardar avance"
              : `Guardar avance · ${filledKRs} ${filledKRs === 1 ? "RC" : "RCs"}`}
          </button>
        </div>
      </form>

      <ToastList toasts={toasts} onRemove={removeToast} />
    </>
  )
}
