"use client"

import { useState } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KRSuggestion {
  title: string
  type: "PERCENTAGE" | "NUMBER" | "CURRENCY" | "BOOLEAN"
  targetValue: number
  unit: string
}

type SuggestState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "result"; suggestions: KRSuggestion[] }
  | { phase: "error"; message: string }

export interface SuggestKRsButtonProps {
  objectiveTitle: string
  teamName: string
  onAdd: (kr: KRSuggestion) => void
}

// ─── Label maps ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<KRSuggestion["type"], string> = {
  PERCENTAGE: "Porcentaje",
  NUMBER: "Número",
  CURRENCY: "Moneda",
  BOOLEAN: "Sí / No",
}

const TYPE_BADGE: Record<KRSuggestion["type"], string> = {
  PERCENTAGE: "bg-blue-50 text-blue-600",
  NUMBER: "bg-gray-100 text-gray-600",
  CURRENCY: "bg-green-50 text-green-600",
  BOOLEAN: "bg-purple-50 text-purple-600",
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.897l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684zM13.949 13.684a1 1 0 00-1.898 0l-.184.551a1 1 0 01-.632.633l-.551.183a1 1 0 000 1.898l.551.183a1 1 0 01.633.633l.183.551a1 1 0 001.898 0l.184-.551a1 1 0 01.632-.633l.551-.183a1 1 0 000-1.898l-.551-.184a1 1 0 01-.633-.632l-.183-.551z" />
    </svg>
  )
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

// ─── SuggestKRsButton ─────────────────────────────────────────────────────────

export function SuggestKRsButton({ objectiveTitle, teamName, onAdd }: SuggestKRsButtonProps) {
  const [state, setState] = useState<SuggestState>({ phase: "idle" })

  async function fetchSuggestions() {
    if (!objectiveTitle.trim()) return
    setState({ phase: "loading" })
    try {
      const res = await fetch("/api/ai/suggest-krs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectiveTitle: objectiveTitle.trim(), teamName }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setState({ phase: "error", message: data.error ?? "Error inesperado" })
        return
      }
      if (!Array.isArray(data.suggestions) || data.suggestions.length === 0) {
        setState({ phase: "error", message: "El modelo no devolvió sugerencias." })
        return
      }
      setState({ phase: "result", suggestions: data.suggestions })
    } catch {
      setState({ phase: "error", message: "No se pudo conectar con el servicio de IA." })
    }
  }

  function addSuggestion(suggestion: KRSuggestion) {
    if (state.phase !== "result") return
    onAdd(suggestion)
    const remaining = state.suggestions.filter((s) => s !== suggestion)
    if (remaining.length === 0) {
      setState({ phase: "idle" })
    } else {
      setState({ phase: "result", suggestions: remaining })
    }
  }

  const isLoading = state.phase === "loading"

  return (
    <div>
      {/* Trigger button */}
      <button
        type="button"
        onClick={fetchSuggestions}
        disabled={isLoading || !objectiveTitle.trim()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <Spinner className="w-3.5 h-3.5" />
        ) : (
          <SparklesIcon className="w-3.5 h-3.5" />
        )}
        {isLoading ? "Generando…" : "Sugerir RCs con IA"}
      </button>

      {/* Suggestions card */}
      {state.phase === "result" && state.suggestions.length > 0 && (
        <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <SparklesIcon className="w-3.5 h-3.5 text-brand-500" />
              <span className="text-xs font-semibold text-brand-700">
                Sugerencias de RCs ({state.suggestions.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setState({ phase: "idle" })}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cerrar
            </button>
          </div>

          <div className="space-y-2">
            {state.suggestions.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-white rounded-lg border border-gray-100 px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug mb-1">{s.title}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[s.type]}`}
                    >
                      {TYPE_LABELS[s.type]}
                    </span>
                    {s.type !== "BOOLEAN" && (
                      <span className="text-xs text-gray-400">
                        Meta: {s.targetValue}{s.unit ? ` ${s.unit}` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => addSuggestion(s)}
                  className="flex-shrink-0 px-3 py-1 text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
                >
                  Agregar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {state.phase === "error" && (
        <p className="mt-2 text-xs text-red-500">
          {state.message}{" "}
          <button
            type="button"
            onClick={fetchSuggestions}
            className="underline hover:no-underline"
          >
            Reintentar
          </button>
        </p>
      )}
    </div>
  )
}
