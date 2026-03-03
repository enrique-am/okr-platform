"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createObjective } from "./actions"
import type { KRInput } from "./actions"
import { AiSuggestButton } from "@/components/ai/suggest-button"
import { SuggestKRsButton } from "@/components/ai/suggest-krs-button"
import type { KRSuggestion } from "@/components/ai/suggest-krs-button"
import { DataSourceSection } from "@/components/kr/data-source-section"
import type { DataSourceValue } from "@/components/kr/data-source-section"

// Local mirrors of the Prisma enums — @prisma/client is server-only and cannot
// be imported from client components (it's in serverComponentsExternalPackages).
const KeyResultType = {
  PERCENTAGE: "PERCENTAGE",
  NUMBER:     "NUMBER",
  CURRENCY:   "CURRENCY",
  BOOLEAN:    "BOOLEAN",
} as const
type KeyResultType = (typeof KeyResultType)[keyof typeof KeyResultType]

const TrackingStatus = {
  ON_TRACK:  "ON_TRACK",
  AT_RISK:   "AT_RISK",
  OFF_TRACK: "OFF_TRACK",
} as const
type TrackingStatus = (typeof TrackingStatus)[keyof typeof TrackingStatus]

// ─── Types ────────────────────────────────────────────────────────────────────

interface Team {
  id: string
  name: string
}

interface KRState extends KRInput {
  _id: string // local key only
  dataSource: DataSourceValue
}

const EMPTY_KR = (): KRState => ({
  _id: Math.random().toString(36).slice(2),
  title: "",
  type: KeyResultType.PERCENTAGE,
  targetValue: 100,
  unit: "%",
  description: "",
  trackingStatus: TrackingStatus.ON_TRACK,
  dataSource: { name: "", url: "", instructions: "" },
})

// ─── Label maps ───────────────────────────────────────────────────────────────

const KR_TYPE_LABELS: Record<KeyResultType, string> = {
  PERCENTAGE: "Porcentaje",
  NUMBER: "Número",
  CURRENCY: "Moneda",
  BOOLEAN: "Sí / No",
}

const KR_TYPE_UNITS: Record<KeyResultType, string> = {
  PERCENTAGE: "%",
  NUMBER: "",
  CURRENCY: "MXN",
  BOOLEAN: "",
}

const TRACKING_OPTIONS: { value: TrackingStatus; label: string; dot: string }[] = [
  { value: TrackingStatus.ON_TRACK, label: "En seguimiento", dot: "bg-brand-500" },
  { value: TrackingStatus.AT_RISK,  label: "En riesgo",       dot: "bg-amber-400" },
  { value: TrackingStatus.OFF_TRACK, label: "Retrasado",      dot: "bg-red-400"   },
]

const CURRENT_YEAR = new Date().getFullYear()

// ─── ObjectiveForm ─────────────────────────────────────────────────────────────

export function ObjectiveForm({ teams }: { teams: Team[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [title, setTitle]     = useState("")
  const [teamId, setTeamId]   = useState(teams[0]?.id ?? "")
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(1)
  const [year, setYear]       = useState(CURRENT_YEAR)
  const [krs, setKRs]         = useState<KRState[]>([EMPTY_KR()])
  const [error, setError]     = useState<string | null>(null)

  const teamName = teams.find((t) => t.id === teamId)?.name ?? ""

  // ── KR helpers ──────────────────────────────────────────────────────────────

  function updateKR(id: string, patch: Partial<KRState>) {
    setKRs((prev) =>
      prev.map((kr) => {
        if (kr._id !== id) return kr
        const updated = { ...kr, ...patch }
        // Auto-fill unit when type changes
        if (patch.type !== undefined) {
          updated.unit = KR_TYPE_UNITS[patch.type]
        }
        return updated
      })
    )
  }

  function addKR() {
    if (krs.length < 5) setKRs((prev) => [...prev, EMPTY_KR()])
  }

  function addKRFromSuggestion(suggestion: KRSuggestion) {
    if (krs.length >= 5) return
    setKRs((prev) => [
      ...prev,
      {
        _id: Math.random().toString(36).slice(2),
        title: suggestion.title,
        type: suggestion.type as KeyResultType,
        targetValue: suggestion.type === "BOOLEAN" ? 1 : suggestion.targetValue,
        unit: suggestion.unit,
        description: "",
        trackingStatus: TrackingStatus.ON_TRACK,
        dataSource: { name: "", url: "", instructions: "" },
      },
    ])
  }

  function removeKR(id: string) {
    if (krs.length > 1) setKRs((prev) => prev.filter((kr) => kr._id !== id))
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const badKR = krs.find((kr) => kr.type !== "BOOLEAN" && kr.targetValue <= 0)
    if (badKR) {
      setError("El valor objetivo debe ser mayor que 0")
      return
    }
    startTransition(async () => {
      const result = await createObjective({
        title,
        teamId,
        quarter,
        year,
        keyResults: krs.map(({ _id, dataSource, ...rest }) => ({
          ...rest,
          dataSource: dataSource.name.trim()
            ? { name: dataSource.name.trim(), url: dataSource.url.trim() || null, instructions: dataSource.instructions.trim() || null }
            : null,
        })),
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      router.push("/dashboard")
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── Objective fields ── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Objetivo</h2>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="p.ej. Aumentar audiencia digital en 40%"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            required
          />
          <AiSuggestButton
            text={title}
            type="objective"
            teamName={teamName}
            onAccept={setTitle}
          />
        </div>

        {/* Team + Quarter + Year */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equipo <span className="text-red-400">*</span>
            </label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trimestre</label>
            <select
              value={quarter}
              onChange={(e) => setQuarter(Number(e.target.value) as 1 | 2 | 3 | 4)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value={1}>Q1 (Ene – Mar)</option>
              <option value={2}>Q2 (Abr – Jun)</option>
              <option value={3}>Q3 (Jul – Sep)</option>
              <option value={4}>Q4 (Oct – Dic)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              min={2020}
              max={2099}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>
      </section>

      {/* ── Key results ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Resultados clave <span className="font-normal text-gray-400 normal-case">({krs.length}/5)</span>
          </h2>
          {krs.length < 5 && (
            <button
              type="button"
              onClick={addKR}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              <span className="text-lg leading-none">+</span> Agregar resultado
            </button>
          )}
        </div>

        {krs.length < 5 && (
          <SuggestKRsButton
            objectiveTitle={title}
            teamName={teamName}
            onAdd={addKRFromSuggestion}
          />
        )}

        {krs.map((kr, idx) => (
          <KRCard
            key={kr._id}
            index={idx}
            kr={kr}
            teamName={teamName}
            parentObjective={title}
            canRemove={krs.length > 1}
            onChange={(patch) => updateKR(kr._id, patch)}
            onRemove={() => removeKR(kr._id)}
          />
        ))}
      </section>

      {/* ── Error ── */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg border border-gray-200 hover:border-gray-300"
          disabled={isPending}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Guardando…" : "Guardar objetivo"}
        </button>
      </div>
    </form>
  )
}

// ─── KRCard ───────────────────────────────────────────────────────────────────

interface KRCardProps {
  index: number
  kr: KRState
  teamName: string
  parentObjective: string
  canRemove: boolean
  onChange: (patch: Partial<KRState>) => void
  onRemove: () => void
}

function KRCard({ index, kr, teamName, parentObjective, canRemove, onChange, onRemove }: KRCardProps) {
  const isBoolean = kr.type === KeyResultType.BOOLEAN

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          RC {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-gray-400 hover:text-red-500"
          >
            Eliminar
          </button>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Título <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={kr.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="p.ej. Visitantes únicos mensuales: 2.5M"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          required
        />
        <AiSuggestButton
          text={kr.title}
          type="key_result"
          teamName={teamName}
          parentObjective={parentObjective}
          onAccept={(s) => onChange({ title: s })}
        />
      </div>

      {/* Type selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(KR_TYPE_LABELS) as KeyResultType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ type: t })}
              className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors ${
                kr.type === t
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {KR_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Target value + unit (hidden for BOOLEAN) */}
      {!isBoolean && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor objetivo <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={kr.targetValue}
              onChange={(e) => onChange({ targetValue: Number(e.target.value) })}
              min={1}
              step={kr.type === KeyResultType.CURRENCY ? 1000 : 1}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                kr.targetValue <= 0 ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
            />
            {kr.targetValue <= 0 && (
              <p className="text-xs text-red-500 mt-1">Debe ser mayor que 0</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
            <input
              type="text"
              value={kr.unit}
              onChange={(e) => onChange({ unit: e.target.value })}
              placeholder="p.ej. %, MXN, usuarios"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Tracking status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Estado de seguimiento</label>
        <div className="flex gap-2 flex-wrap">
          {TRACKING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ trackingStatus: opt.value })}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                kr.trackingStatus === opt.value
                  ? "border-gray-400 bg-gray-100 text-gray-800"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${opt.dot}`} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea
          value={kr.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Contexto, metodología de medición, comentarios…"
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Data source */}
      <DataSourceSection
        value={kr.dataSource}
        onChange={(patch) => onChange({ dataSource: { ...kr.dataSource, ...patch } })}
      />
    </div>
  )
}
