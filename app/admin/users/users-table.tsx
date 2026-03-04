"use client"

import { useState, useTransition, useRef } from "react"
import {
  updateUserRole,
  updateUserTeams,
  inviteUser,
  bulkInviteUsers,
  deactivateUser,
  reactivateUser,
  deleteUser,
  cancelInvite,
  type BulkInviteRow,
} from "./actions"
import { startImpersonation } from "./impersonate-action"
import { Modal } from "@/components/ui/modal"

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string
  name: string | null
  email: string
  role: string
  status: string
  teams: { id: string; name: string }[]
  lastLoginAt: string | null
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

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  ACTIVE: { label: "Activo", classes: "bg-green-50 text-green-700 border-green-200" },
  INACTIVE: { label: "Inactivo", classes: "bg-gray-100 text-gray-500 border-gray-200" },
  PENDING: { label: "Pendiente", classes: "bg-amber-50 text-amber-700 border-amber-200" },
}

function relativeDate(isoString: string | null, status: string): { text: string; color: string } {
  if (!isoString) {
    return status === "ACTIVE"
      ? { text: "Nunca", color: "text-red-500" }
      : { text: "Nunca", color: "text-gray-400" }
  }
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24))

  let text: string
  if (diffDays === 0) text = "Hoy"
  else if (diffDays === 1) text = "Ayer"
  else text = `Hace ${diffDays}d`

  let color: string
  if (diffDays === 0) color = "text-green-600"
  else if (diffDays <= 7) color = "text-gray-500"
  else if (diffDays <= 30) color = "text-amber-600"
  else color = "text-red-500"

  return { text, color }
}

// ─── UserRowComponent ─────────────────────────────────────────────────────────

function UserRowComponent({
  user,
  teams,
  currentUserId,
  onDelete,
  onCancelInvite,
}: {
  user: UserRow
  teams: Team[]
  currentUserId: string
  onDelete: (user: UserRow) => void
  onCancelInvite: (user: UserRow) => void
}) {
  const [role, setRole] = useState(user.role)
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(
    user.teams.map((t) => t.id)
  )
  const [teamsOpen, setTeamsOpen] = useState(false)
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

  function handleTeamToggle(teamId: string) {
    const prev = selectedTeamIds
    const next = prev.includes(teamId)
      ? prev.filter((id) => id !== teamId)
      : [...prev, teamId]
    setSelectedTeamIds(next)
    setTeamError(null)
    startTransition(async () => {
      const result = await updateUserTeams(user.id, next)
      if (!result.success) {
        setSelectedTeamIds(prev)
        setTeamError(result.error)
      }
    })
  }

  function handleToggleStatus() {
    startTransition(async () => {
      if (user.status === "INACTIVE") {
        await reactivateUser(user.id)
      } else {
        await deactivateUser(user.id)
      }
    })
  }

  const badgeClass = ROLE_BADGE[role] ?? "bg-gray-100 text-gray-600 border-gray-200"
  const statusInfo = STATUS_BADGE[user.status] ?? STATUS_BADGE.ACTIVE
  const lastLogin = relativeDate(user.lastLoginAt, user.status)
  const isInactive = user.status === "INACTIVE"
  const canImpersonate = user.role !== "ADMIN" && user.id !== currentUserId && !isInactive

  return (
    <tr
      className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${
        isPending ? "opacity-60" : ""
      } ${isInactive ? "opacity-60" : ""}`}
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

      {/* Teams (multi-select) */}
      <td className="px-4 py-3">
        <button
          onClick={() => setTeamsOpen((o) => !o)}
          disabled={isPending}
          className="text-sm text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-left min-w-[120px] max-w-[200px] truncate hover:bg-gray-50 transition-colors"
        >
          {selectedTeamIds.length === 0
            ? "Sin equipo"
            : selectedTeamIds.length === 1
            ? teams.find((t) => t.id === selectedTeamIds[0])?.name ?? "1 equipo"
            : `${selectedTeamIds.length} equipos`}
        </button>
        <Modal
          open={teamsOpen}
          onClose={() => setTeamsOpen(false)}
          title={`Equipos — ${user.name ?? user.email}`}
          maxWidth="max-w-sm"
        >
          <div className="space-y-1">
            {teams.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2.5 px-2 py-2 hover:bg-gray-50 rounded-lg cursor-pointer text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={selectedTeamIds.includes(t.id)}
                  onChange={() => handleTeamToggle(t.id)}
                  className="accent-brand-500 w-4 h-4"
                />
                {t.name}
              </label>
            ))}
            {teams.length === 0 && (
              <p className="text-sm text-gray-400 py-2">No hay equipos disponibles.</p>
            )}
            {teamError && (
              <p className="text-xs text-red-500 mt-2">{teamError}</p>
            )}
          </div>
        </Modal>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${statusInfo.classes}`}
        >
          {statusInfo.label}
        </span>
      </td>

      {/* Last login */}
      <td className="px-4 py-3">
        <span className={`text-sm whitespace-nowrap ${lastLogin.color}`}>{lastLogin.text}</span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {user.status === "PENDING" ? (
            <button
              onClick={() => onCancelInvite(user)}
              disabled={isPending}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancelar invitación
            </button>
          ) : (
            <>
              <button
                onClick={handleToggleStatus}
                disabled={isPending}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  isInactive
                    ? "border-green-200 text-green-700 hover:bg-green-50"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {isInactive ? "Reactivar" : "Desactivar"}
              </button>
              <button
                onClick={() => onDelete(user)}
                disabled={!isInactive || isPending}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Eliminar
              </button>
              {canImpersonate && (
                <button
                  onClick={() => {
                    startTransition(async () => {
                      await startImpersonation(user.id)
                    })
                  }}
                  disabled={isPending}
                  title={`Ver la app como ${user.name ?? user.email}`}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Impersonar
                </button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({
  open,
  onClose,
  teams,
}: {
  open: boolean
  onClose: () => void
  teams: Team[]
}) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("MEMBER")
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "")
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await inviteUser(email, role, teamId)
      if (result.success) {
        setMessage({ type: "success", text: "Invitación enviada correctamente" })
        setEmail("")
      } else {
        setMessage({ type: "error", text: result.error })
      }
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Invitar usuario">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@ejemplo.com"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Equipo</label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {message && (
          <p
            className={`text-sm ${
              message.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm py-2.5 rounded-lg transition-colors disabled:opacity-60"
        >
          {isPending ? "Enviando..." : "Enviar invitación"}
        </button>
      </form>
    </Modal>
  )
}

// ─── CSV Import Modal ─────────────────────────────────────────────────────────

interface CsvRow {
  email: string
  role: string
  teamId: string
  teamName: string
  emailValid: boolean
  roleValid: boolean
  teamValid: boolean
}

function CsvImportModal({
  open,
  onClose,
  teams,
}: {
  open: boolean
  onClose: () => void
  teams: Team[]
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<CsvRow[]>([])
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)

  const teamMap = new Map(teams.map((t) => [t.name.toLowerCase(), t]))
  const validRoles = new Set(Object.keys(ROLE_LABELS))

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setResult(null)
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split("\n").filter((l) => l.trim())
      // Skip header if first line looks like a header
      const startIdx = lines[0]?.toLowerCase().includes("email") ? 1 : 0

      const parsed: CsvRow[] = []
      for (let i = startIdx; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim())
        const email = cols[0] || ""
        const roleName = cols[1]?.toUpperCase() || ""
        const teamName = cols[2] || ""
        const matchedTeam = teamMap.get(teamName.toLowerCase())

        parsed.push({
          email,
          role: roleName,
          teamId: matchedTeam?.id ?? "",
          teamName: matchedTeam?.name ?? teamName,
          emailValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
          roleValid: validRoles.has(roleName),
          teamValid: !!matchedTeam,
        })
      }
      setRows(parsed)
    }
    reader.readAsText(file)
  }

  function handleConfirm() {
    const validRows = rows.filter((r) => r.emailValid && r.roleValid && r.teamValid)
    if (validRows.length === 0) return

    startTransition(async () => {
      const res = await bulkInviteUsers(
        validRows.map((r) => ({
          email: r.email,
          role: r.role,
          teamId: r.teamId,
          teamName: r.teamName,
        }))
      )
      if (res.success) {
        setResult({ created: res.created, skipped: res.skipped })
        setRows([])
        if (fileRef.current) fileRef.current.value = ""
      }
    })
  }

  const validCount = rows.filter((r) => r.emailValid && r.roleValid && r.teamValid).length

  return (
    <Modal open={open} onClose={onClose} title="Importar CSV" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Archivo CSV (columnas: email, rol, equipo)
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
          />
        </div>

        {rows.length > 0 && (
          <>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Rol</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Equipo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className={`px-3 py-2 ${r.emailValid ? "text-gray-700" : "text-red-500"}`}>
                        {r.email || "—"}
                      </td>
                      <td className={`px-3 py-2 ${r.roleValid ? "text-gray-700" : "text-red-500"}`}>
                        {ROLE_LABELS[r.role] || r.role || "—"}
                      </td>
                      <td className={`px-3 py-2 ${r.teamValid ? "text-gray-700" : "text-red-500"}`}>
                        {r.teamName || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500">
              {validCount} de {rows.length} filas válidas
            </p>
            <button
              onClick={handleConfirm}
              disabled={isPending || validCount === 0}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {isPending ? "Importando..." : "Confirmar"}
            </button>
          </>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <p className="text-sm text-green-700">
              {result.created} creados, {result.skipped} omitidos
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteModal({
  user,
  onClose,
}: {
  user: UserRow | null
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!user) return
    startTransition(async () => {
      const result = await deleteUser(user.id)
      if (result.success) onClose()
    })
  }

  return (
    <Modal open={!!user} onClose={onClose} title="Eliminar usuario">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Esta acción es permanente. La cuenta del usuario será eliminada, pero sus ORCs,
          resultados clave y registros de avance se conservarán en el equipo sin autor asignado.
        </p>
        {user && (
          <div className="bg-gray-50 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-gray-900">{user.name ?? "Sin nombre"}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 border border-gray-200 text-gray-700 font-medium text-sm py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {isPending ? "Eliminando..." : "Eliminar permanentemente"}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Cancel Invite Modal ──────────────────────────────────────────────────────

function CancelInviteModal({
  user,
  onClose,
}: {
  user: UserRow | null
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleCancel() {
    if (!user) return
    startTransition(async () => {
      const result = await cancelInvite(user.id)
      if (result.success) onClose()
    })
  }

  return (
    <Modal open={!!user} onClose={onClose} title="Cancelar invitación">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Se eliminará la invitación pendiente. El usuario no podrá iniciar sesión y
          tendrás que volver a invitarlo si cambias de opinión.
        </p>
        {user && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 mb-0.5">Invitación pendiente</p>
            <p className="text-sm text-amber-900">{user.email}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 border border-gray-200 text-gray-700 font-medium text-sm py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Volver
          </button>
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {isPending ? "Cancelando..." : "Cancelar invitación"}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── UsersTable ───────────────────────────────────────────────────────────────

// ─── Role Legend Modal ────────────────────────────────────────────────────────

const ROLE_DESCRIPTIONS = [
  {
    role: "ADMIN",
    badge: "bg-brand-50 text-brand-700 border-brand-200",
    desc: "Acceso total. Gestiona usuarios, equipos y configuración del sistema.",
  },
  {
    role: "EXECUTIVE",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Vista ejecutiva. Puede ver todos los ORCs y dashboards de todos los equipos sin poder editarlos.",
  },
  {
    role: "LEAD",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Líder de equipo. Puede crear y editar ORCs de su equipo y ver los de otros.",
  },
  {
    role: "MEMBER",
    badge: "bg-gray-100 text-gray-600 border-gray-200",
    desc: "Miembro de equipo. Puede actualizar RCs asignados y ver los ORCs de su equipo.",
  },
]

function RoleLegendModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="¿Qué significan los roles?">
      <div className="space-y-3">
        {ROLE_DESCRIPTIONS.map(({ role, badge, desc }) => (
          <div key={role} className="flex gap-3 items-start">
            <span className={`inline-block flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border mt-0.5 ${badge}`}>
              {ROLE_LABELS[role]}
            </span>
            <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </Modal>
  )
}

// ─── UsersTable ───────────────────────────────────────────────────────────────

export function UsersTable({
  users,
  teams,
  currentUserId,
  page,
  totalPages,
  totalUsers,
}: {
  users: UserRow[]
  teams: Team[]
  currentUserId: string
  page: number
  totalPages: number
  totalUsers: number
}) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [cancelInviteTarget, setCancelInviteTarget] = useState<UserRow | null>(null)
  const [roleLegendOpen, setRoleLegendOpen] = useState(false)

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-700">
            Usuarios{" "}
            <span className="font-normal text-gray-400">({totalUsers})</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCsvOpen(true)}
              className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Importar CSV
            </button>
            <button
              onClick={() => setInviteOpen(true)}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors"
            >
              Invitar usuario
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="text-left border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    Rol
                    <button
                      onClick={() => setRoleLegendOpen(true)}
                      title="¿Qué significan los roles?"
                      className="text-gray-300 hover:text-brand-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Equipo
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Último acceso
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRowComponent
                  key={user.id}
                  user={user}
                  teams={teams}
                  currentUserId={currentUserId}
                  onDelete={setDeleteTarget}
                  onCancelInvite={setCancelInviteTarget}
                />
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <a
                  href={`?page=${page - 1}`}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                >
                  ← Anterior
                </a>
              ) : (
                <span className="px-3 py-1.5 rounded-lg border border-gray-100 text-gray-300 cursor-not-allowed font-medium">
                  ← Anterior
                </span>
              )}
              {page < totalPages ? (
                <a
                  href={`?page=${page + 1}`}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                >
                  Siguiente →
                </a>
              ) : (
                <span className="px-3 py-1.5 rounded-lg border border-gray-100 text-gray-300 cursor-not-allowed font-medium">
                  Siguiente →
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} teams={teams} />
      <CsvImportModal open={csvOpen} onClose={() => setCsvOpen(false)} teams={teams} />
      <DeleteModal user={deleteTarget} onClose={() => setDeleteTarget(null)} />
      <CancelInviteModal user={cancelInviteTarget} onClose={() => setCancelInviteTarget(null)} />
      <RoleLegendModal open={roleLegendOpen} onClose={() => setRoleLegendOpen(false)} />
    </>
  )
}
