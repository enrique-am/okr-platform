"use client"

import { useState } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface CheckIn {
  id: string
  value: number
  note: string | null
  createdAt: Date
  author: { name: string | null } | null
}

interface KRChangelogAccordionProps {
  checkIns: CheckIn[]
  krType: string
  unit: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatCheckInValue(type: string, value: number, unit: string | null): string {
  if (type === "BOOLEAN") return value > 0 ? "Completado" : "Pendiente"
  const u = unit ? ` ${unit}` : ""
  return `${value}${u}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KRChangelogAccordion({ checkIns, krType, unit }: KRChangelogAccordionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors py-0.5"
        aria-expanded={open}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
        {open ? "Ocultar historial" : `Ver historial (${checkIns.length})`}
      </button>

      <div
        className={`grid transition-all duration-200 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 pt-2">
            {checkIns.map((ci, ciIdx) => (
              <div key={ci.id} className="flex items-start gap-2.5">
                <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      ciIdx === 0 ? "bg-brand-500" : "bg-gray-300"
                    }`}
                  />
                  {ciIdx < checkIns.length - 1 && (
                    <span className="w-px flex-1 bg-gray-200 mt-1 min-h-[12px]" />
                  )}
                </div>
                <div className="pb-2 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs text-gray-400">
                      {formatDate(ci.createdAt)}
                    </span>
                    <span className="text-xs font-semibold text-gray-700 tabular-nums">
                      → {formatCheckInValue(krType, ci.value, unit)}
                    </span>
                    {ci.author ? (
                      ci.author.name && (
                        <span className="text-xs text-gray-400">
                          — {ci.author.name.split(" ")[0]}
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        — Usuario eliminado
                      </span>
                    )}
                  </div>
                  {ci.note && (
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {ci.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
