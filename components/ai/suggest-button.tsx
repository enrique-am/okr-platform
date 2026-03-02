"use client"

import { useState } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

type SuggestState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "result"; suggestion: string }
  | { phase: "error"; message: string }

export interface AiSuggestButtonProps {
  text: string
  type: "objective" | "key_result"
  teamName: string
  onAccept: (suggestion: string) => void
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

// ─── AiSuggestButton ──────────────────────────────────────────────────────────

export function AiSuggestButton({ text, type, teamName, onAccept }: AiSuggestButtonProps) {
  const [state, setState] = useState<SuggestState>({ phase: "idle" })

  async function fetchSuggestion() {
    if (!text.trim()) return
    setState({ phase: "loading" })
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), type, teamName }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setState({ phase: "error", message: data.error ?? "Error inesperado" })
        return
      }
      setState({ phase: "result", suggestion: data.suggestion })
    } catch {
      setState({ phase: "error", message: "No se pudo conectar con el servicio de IA." })
    }
  }

  function accept() {
    if (state.phase !== "result") return
    onAccept(state.suggestion)
    setState({ phase: "idle" })
  }

  const isLoading = state.phase === "loading"

  return (
    <div className="mt-1.5">
      {/* Trigger */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={fetchSuggestion}
          disabled={isLoading || !text.trim()}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Spinner className="w-3.5 h-3.5" />
          ) : (
            <SparklesIcon className="w-3.5 h-3.5" />
          )}
          {isLoading ? "Generando…" : "Sugerir con IA"}
        </button>
      </div>

      {/* Suggestion result */}
      {state.phase === "result" && (
        <div className="mt-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-3 space-y-2.5">
          <div className="flex items-start gap-2">
            <SparklesIcon className="w-3.5 h-3.5 text-brand-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-brand-900 leading-relaxed flex-1">
              {state.suggestion}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={accept}
              className="px-3 py-1 text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
            >
              Aceptar
            </button>
            <button
              type="button"
              onClick={() => setState({ phase: "idle" })}
              className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {state.phase === "error" && (
        <p className="mt-1 text-xs text-red-500">
          {(state as { phase: "error"; message: string }).message}{" "}
          <button
            type="button"
            onClick={fetchSuggestion}
            className="underline hover:no-underline"
          >
            Reintentar
          </button>
        </p>
      )}
    </div>
  )
}
