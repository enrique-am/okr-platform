"use client"

import { useState, useTransition } from "react"
import { updateUserRole, updateUserTeam } from "./actions"

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string
  name: string | null
  email: string
  role: string
  teamId: string | null
  team: { id: string; name: string } | null
  memberSince: string
}

interface Team {
  id: string
  name: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const ROLE_LABELS: Record<string, string> = {
  EXECUTIVE: "Ejecutivo",
  LEAD: "Líder",
  MEMBER: "Miembro",
  ADMIN: "Admin",
}

const ROLE_BADGE: Record<string, string> = {
  EXECUTIVE: "bg-purple-50 text-purple-700 border-purple-200",
  LEAD: "bg-blue-50 text-blue-700 border-blue-200",
  MEMBER: "bg-gray-100 text-gray-600 border-gray-200",
  ADMIN: "bg-brand-50 text-brand-700 border-brand-200",
}

// ─── UserRow ──────────────────────────────────────────────────────────────────

function UserRow({ user, teams }: { user: UserRow; teams: Team[] }) {
  const [role, setRole] = useState(user.role)
  const [teamId, setTeamId] = useState(user.teamId ?? "")
  const [isPending, startTransition] = useTransition()
  const [roleError, setRoleError] = useState<string | null>(null)
  const [teamError, setTeamError] = useState<string | null>(null)

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const prev = role
    const next = e.target.value
    setRole(next)
    setRoleError(null)
    startTransition(async () => {
      const result = await updateUserRole(user.id, next)
      if (!result.success) {
        setRole(prev)
        setRoleError(result.error)
      }
    })
  }

  function handleTeamChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const prev = teamId
    const next = e.target.value
    setTeamId(next)
    setTeamError(null)
    startTransition(async () => {
      const result = await updateUserTeam(user.id, next || null)
      if (!result.success) {
        setTeamId(prev)
        setTeamError(result.error)
      }
    })
  }

  const badgeClass = ROLE_BADGE[role] ?? "bg-gray-100 text-gray-600 border-gray-200"

  return (
    <tr
      className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${
        isPending ? "opacity-60" : ""
      }`}
    >
      {/* User */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-xs">{getInitials(user.name)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name ?? "Sin nombre"}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-4 py-3">
        <div>
          <select
            value={role}
            onChange={handleRoleChange}
            disabled={isPending}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 transition-colors ${badgeClass}`}
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {roleError && <p className="text-xs text-red-500 mt-0.5">{roleError}</p>}
        </div>
      </td>

      {/* Team */}
      <td className="px-4 py-3">
        <div>
          <select
            value={teamId}
            onChange={handleTeamChange}
            disabled={isPending}
            className="text-sm text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent max-w-[200px] truncate"
          >
            <option value="">Sin equipo</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {teamError && <p className="text-xs text-red-500 mt-0.5">{teamError}</p>}
        </div>
      </td>

      {/* Member since */}
      <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{user.memberSince}</td>
    </tr>
  )
}

// ─── UsersTable ───────────────────────────────────────────────────────────────

export function UsersTable({ users, teams }: { users: UserRow[]; teams: Team[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Usuarios{" "}
          <span className="font-normal text-gray-400">({users.length})</span>
        </h2>
        <p className="text-xs text-gray-400">Los cambios se guardan automáticamente</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="text-left border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Equipo
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Miembro desde
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserRow key={user.id} user={user} teams={teams} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
