"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createTeam, updateTeamName } from "./actions"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamRow {
  id: string
  name: string
  slug: string
  activeORCs: number
  members: number
}

// ─── TeamsTable ───────────────────────────────────────────────────────────────

export function TeamsTable({ teams }: { teams: TeamRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Create form
  const [newName, setNewName] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editError, setEditError] = useState<string | null>(null)

  function handleCreate() {
    if (!newName.trim() || isPending) return
    setCreateError(null)
    startTransition(async () => {
      const result = await createTeam(newName)
      if (result.success) {
        setNewName("")
        router.refresh()
      } else {
        setCreateError(result.error)
      }
    })
  }

  function startEdit(team: TeamRow) {
    setEditingId(team.id)
    setEditName(team.name)
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName("")
    setEditError(null)
  }

  function handleSaveEdit(teamId: string) {
    if (!editName.trim() || isPending) return
    setEditError(null)
    startTransition(async () => {
      const result = await updateTeamName(teamId, editName)
      if (result.success) {
        setEditingId(null)
        router.refresh()
      } else {
        setEditError(result.error)
      }
    })
  }

  return (
    <div className="space-y-4">

      {/* ── Create team form ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Nuevo equipo</h3>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Nombre del equipo"
            className="flex-1 min-w-[200px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          <button
            onClick={handleCreate}
            disabled={isPending || !newName.trim()}
            className="px-4 py-2 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Creando…" : "Crear equipo"}
          </button>
        </div>
        {createError && (
          <p className="text-xs text-red-500 mt-2">{createError}</p>
        )}
      </div>

      {/* ── Teams table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Equipos{" "}
            <span className="font-normal text-gray-400">({teams.length})</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="text-left border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Equipo
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">
                  ORCs activos
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">
                  Miembros
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr
                  key={team.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  {/* Name (editable) */}
                  <td className="px-4 py-3">
                    {editingId === team.id ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(team.id)
                              if (e.key === "Escape") cancelEdit()
                            }}
                            className="rounded-lg border border-brand-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            autoFocus
                            disabled={isPending}
                          />
                          <button
                            onClick={() => handleSaveEdit(team.id)}
                            disabled={isPending || !editName.trim()}
                            className="text-xs font-semibold text-brand-700 hover:text-brand-800 disabled:opacity-50 px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                        {editError && (
                          <p className="text-xs text-red-500">{editError}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-gray-900">{team.name}</span>
                    )}
                  </td>

                  {/* Slug */}
                  <td className="px-4 py-3">
                    <code className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-mono">
                      {team.slug}
                    </code>
                  </td>

                  {/* Active ORCs */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-full bg-brand-50 text-brand-700 text-sm font-semibold tabular-nums">
                      {team.activeORCs}
                    </span>
                  </td>

                  {/* Members */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-full bg-gray-100 text-gray-700 text-sm font-semibold tabular-nums">
                      {team.members}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    {editingId !== team.id && (
                      <button
                        onClick={() => startEdit(team)}
                        className="text-xs font-medium text-gray-400 hover:text-brand-600 transition-colors px-2.5 py-1 rounded-lg hover:bg-gray-100"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {teams.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                    No hay equipos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
