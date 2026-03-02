"use client"

import { useRouter, usePathname } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string
  action: string
  metadata: Record<string, unknown>
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
    teamName: string | null
  }
}

interface UserOption {
  id: string
  name: string | null
  email: string
}

interface TeamOption {
  id: string
  name: string
}

interface Filters {
  user: string
  team: string
  action: string
  from: string
  to: string
}

// ─── Action labels ────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, { label: string; classes: string }> = {
  LOGIN: { label: "Inicio de sesión", classes: "bg-blue-50 text-blue-700 border-blue-200" },
  CREATE_OBJECTIVE: { label: "Creó un ORC", classes: "bg-brand-50 text-brand-700 border-brand-200" },
  SUBMIT_CHECKIN: { label: "Registró avance", classes: "bg-green-50 text-green-700 border-green-200" },
  INVITE_USER: { label: "Invitó usuario", classes: "bg-purple-50 text-purple-700 border-purple-200" },
  BULK_INVITE: { label: "Importó usuarios", classes: "bg-purple-50 text-purple-700 border-purple-200" },
  DEACTIVATE_USER: { label: "Desactivó usuario", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  REACTIVATE_USER: { label: "Reactivó usuario", classes: "bg-green-50 text-green-700 border-green-200" },
  DELETE_USER: { label: "Eliminó usuario", classes: "bg-red-50 text-red-700 border-red-200" },
}

const ALL_ACTIONS = Object.keys(ACTION_LABELS)

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivityTable({
  logs,
  users,
  teams,
  filters,
}: {
  logs: LogEntry[]
  users: UserOption[]
  teams: TeamOption[]
  filters: Filters
}) {
  const router = useRouter()
  const pathname = usePathname()

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams()
    const current = { ...filters, [key]: value }
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
          <label className="block text-xs font-medium text-gray-500 mb-1">Usuario</label>
          <select
            value={filters.user}
            onChange={(e) => updateFilter("user", e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Equipo</label>
          <select
            value={filters.team}
            onChange={(e) => updateFilter("team", e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Acción</label>
          <select
            value={filters.action}
            onChange={(e) => updateFilter("action", e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            <option value="">Todas</option>
            {ALL_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter("from", e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter("to", e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="text-left border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Equipo
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Acción
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Fecha
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                  No se encontraron registros
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const actionInfo = ACTION_LABELS[log.action] ?? {
                  label: log.action,
                  classes: "bg-gray-100 text-gray-600 border-gray-200",
                }
                return (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.user.name ?? "Sin nombre"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{log.user.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.user.teamName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${actionInfo.classes}`}
                      >
                        {actionInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("es-MX", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
