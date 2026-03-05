"use client"

import { useState, useTransition } from "react"
import { useRouter, usePathname } from "next/navigation"
import { markFeedbackRead } from "./actions"

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedbackRow {
  id: string
  type: "BUG" | "FEATURE"
  title: string | null
  description: string
  stepsToReproduce: string | null
  screenshotBase64: string | null
  priority: "HIGH" | "MEDIUM" | "LOW" | null
  pageUrl: string
  userAgent: string
  read: boolean
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
    teamName: string | null
  }
}

interface UserOption { id: string; name: string | null; email: string }

interface Filters {
  type: string
  user: string
  status: string
  from: string
  to: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  BUG: {
    label: "Error",
    emoji: "🐛",
    classes: "bg-red-50 text-red-700 border-red-200",
  },
  FEATURE: {
    label: "Mejora",
    emoji: "💡",
    classes: "bg-green-50 text-green-700 border-green-200",
  },
}

const PRIORITY_CONFIG = {
  HIGH:   { label: "Muy importante", classes: "bg-red-50 text-red-700 border-red-200" },
  MEDIUM: { label: "Útil",           classes: "bg-amber-50 text-amber-700 border-amber-200" },
  LOW:    { label: "Sería bonito",   classes: "bg-blue-50 text-blue-700 border-blue-200" },
}

// ─── Row component ────────────────────────────────────────────────────────────

function FeedbackRowComponent({ report }: { report: FeedbackRow }) {
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isRead, setIsRead] = useState(report.read)

  const typeCfg = TYPE_CONFIG[report.type]

  function handleExpand() {
    setExpanded((v) => !v)
  }

  function handleMarkRead(e: React.MouseEvent) {
    e.stopPropagation() // don't collapse the row
    if (isRead) return
    setIsRead(true)
    startTransition(async () => {
      await markFeedbackRead(report.id)
    })
  }

  const dateStr = new Date(report.createdAt).toLocaleString("es-MX", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })

  const pagePath = (() => {
    try { return new URL(report.pageUrl).pathname }
    catch { return report.pageUrl }
  })()

  return (
    <>
      <tr
        onClick={handleExpand}
        className={`border-b border-gray-100 cursor-pointer transition-colors ${
          expanded ? "bg-gray-50" : isRead ? "hover:bg-gray-50" : "bg-amber-50/40 hover:bg-amber-50/60"
        } ${isPending ? "opacity-70" : ""}`}
      >
        {/* Unread dot */}
        <td className="px-4 py-3 w-6">
          {!isRead && (
            <span className="inline-block w-2 h-2 rounded-full bg-brand-500 mt-0.5" />
          )}
        </td>

        {/* Type */}
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${typeCfg.classes}`}>
            {typeCfg.emoji} {typeCfg.label}
          </span>
        </td>

        {/* Summary */}
        <td className="px-4 py-3 max-w-xs">
          <p className="text-sm font-medium text-gray-900 truncate">
            {report.type === "FEATURE" && report.title
              ? report.title
              : report.description.slice(0, 80) + (report.description.length > 80 ? "…" : "")}
          </p>
          <p className="text-xs text-gray-400 truncate mt-0.5">{pagePath}</p>
        </td>

        {/* User */}
        <td className="px-4 py-3">
          <p className="text-sm text-gray-700">{report.user.name ?? "Sin nombre"}</p>
          <p className="text-xs text-gray-400">{report.user.teamName ?? "—"}</p>
        </td>

        {/* Priority (features) */}
        <td className="px-4 py-3">
          {report.priority && (
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_CONFIG[report.priority].classes}`}>
              {PRIORITY_CONFIG[report.priority].label}
            </span>
          )}
        </td>

        {/* Date */}
        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{dateStr}</td>

        {/* Chevron */}
        <td className="px-4 py-3 text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-4 h-4 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr className="border-b border-gray-100 bg-gray-50">
          <td colSpan={7} className="px-8 py-5">
            <div className="space-y-4">

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  {report.type === "BUG" ? "¿Qué pasó?" : "¿Qué te gustaría y por qué?"}
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{report.description}</p>
              </div>

              {/* Steps to reproduce */}
              {report.stepsToReproduce && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">¿Cómo se reproduce?</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{report.stepsToReproduce}</p>
                </div>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap gap-6 text-xs text-gray-500 bg-white rounded-lg border border-gray-100 px-4 py-3">
                <div>
                  <span className="font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">Enviado por</span>
                  {report.user.name} · {report.user.email} · {report.user.teamName ?? "Sin equipo"}
                </div>
                <div>
                  <span className="font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">Página</span>
                  <span className="break-all">{report.pageUrl}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">Navegador</span>
                  <span className="break-all">{report.userAgent}</span>
                </div>
              </div>

              {/* Screenshot */}
              {report.screenshotBase64 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Captura de pantalla</p>
                  <img
                    src={report.screenshotBase64}
                    alt="Screenshot"
                    className="max-w-full max-h-96 rounded-lg border border-gray-200 object-contain"
                  />
                </div>
              )}

              {/* Mark as read */}
              {!isRead && (
                <div className="pt-1">
                  <button
                    onClick={handleMarkRead}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-50 transition-colors disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    {isPending ? "Guardando…" : "Marcar como leído"}
                  </button>
                </div>
              )}
              {isRead && (
                <p className="text-xs text-gray-400 pt-1 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-brand-500">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  Leído
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Main table ───────────────────────────────────────────────────────────────

export function FeedbackTable({
  reports,
  users,
  filters,
}: {
  reports: FeedbackRow[]
  users: UserOption[]
  filters: Filters
}) {
  const router = useRouter()
  const pathname = usePathname()

  function updateFilter(key: string, value: string) {
    const current = { ...filters, [key]: value }
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(current)) {
      if (v) params.set(k, v)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
          <select
            value={filters.type}
            onChange={(e) => updateFilter("type", e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Todos</option>
            <option value="BUG">🐛 Errores</option>
            <option value="FEATURE">💡 Mejoras</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
          <select
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Todos</option>
            <option value="unread">No leídos</option>
            <option value="read">Leídos</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Usuario</label>
          <select
            value={filters.user}
            onChange={(e) => updateFilter("user", e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter("to", e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="text-left border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 w-6" />
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Resumen</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Usuario</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Prioridad</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha</th>
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                  No hay reportes con los filtros seleccionados
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <FeedbackRowComponent key={report.id} report={report} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
