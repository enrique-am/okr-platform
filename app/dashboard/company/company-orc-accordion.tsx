"use client"

import { useState } from "react"
import Link from "next/link"
import type { TrafficLight } from "@/lib/progress"

interface KR {
  id: string
  number: number
  title: string
  type: string
  currentValue: number
  targetValue: number
  unit: string | null
  progress: number
}

interface ObjData {
  id: string
  title: string
  year: number
  owner: { id: string; name: string | null } | null
  ownerId: string | null
  progress: number
  traffic: TrafficLight
  krs: KR[]
}

type TrafficConfig = Record<
  TrafficLight,
  { label: string; badge: string; dot: string; bar: string }
>

// ─── CompanyORCAccordion ──────────────────────────────────────────────────────

export function CompanyORCAccordion({
  obj,
  objNumber,
  traffic,
  canEdit,
}: {
  obj: ObjData
  objNumber: number
  traffic: TrafficConfig
  canEdit: boolean
}) {
  const [open, setOpen] = useState(false)
  const cfg = traffic[obj.traffic]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* ORC header */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex-shrink-0 mt-0.5 inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-600 tabular-nums">
              ORC {objNumber}
            </span>
            <h3 className="text-base font-semibold text-gray-900 leading-snug">
              {obj.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
              {cfg.label}
            </span>
            {canEdit && (
              <Link
                href={`/dashboard/company/${obj.id}/edit`}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                </svg>
                Editar
              </Link>
            )}
          </div>
        </div>

        {/* Responsible lead */}
        {obj.owner && (
          <p className="text-xs text-gray-400 mb-3">
            Responsable: <span className="font-medium text-gray-600">{obj.owner.name}</span>
          </p>
        )}

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
              style={{ width: `${obj.progress}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-600 tabular-nums w-10 text-right">
            {obj.progress}%
          </span>
        </div>
      </div>

      {/* Expand / collapse toggle */}
      {obj.krs.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-2 border-t border-gray-100 text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span>{open ? "Ocultar" : "Ver"} resultados clave ({obj.krs.length})</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {/* KR list */}
          <div
            className={`grid transition-all duration-200 ease-in-out ${
              open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {obj.krs.map((kr) => (
                  <KRRow key={kr.id} objNumber={objNumber} kr={kr} traffic={traffic} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── KRRow ────────────────────────────────────────────────────────────────────

import { progressToTrafficLight } from "@/lib/progress"

const KR_TYPE_SHORT: Record<string, string> = {
  PERCENTAGE: "%",
  NUMBER:     "#",
  CURRENCY:   "$",
  BOOLEAN:    "✓",
}

function KRRow({
  objNumber,
  kr,
  traffic,
}: {
  objNumber: number
  kr: KR
  traffic: TrafficConfig
}) {
  const light = progressToTrafficLight(kr.progress)
  const cfg   = traffic[light]

  const valueLabel =
    kr.type === "BOOLEAN"
      ? kr.currentValue > 0 ? "Completado" : "Pendiente"
      : `${kr.currentValue}${kr.unit ? ` ${kr.unit}` : ""} / ${kr.targetValue}${kr.unit ? ` ${kr.unit}` : ""}`

  return (
    <div className="px-6 py-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className="flex-shrink-0 mt-0.5 text-xs font-bold text-gray-400 tabular-nums">
            RC {objNumber}.{kr.number}
          </span>
          <p className="text-sm font-medium text-gray-800 leading-snug">{kr.title}</p>
        </div>
        <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
            style={{ width: `${kr.progress}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-gray-500 tabular-nums w-8 text-right">
          {kr.progress}%
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <span className="font-mono">{KR_TYPE_SHORT[kr.type] ?? "#"}</span>
        <span>·</span>
        <span className="truncate">{valueLabel}</span>
      </div>
    </div>
  )
}
