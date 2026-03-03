"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateCompanyObjective } from "./actions"
import type { EditCompanyKRInput } from "./actions"
import { AiSuggestButton } from "@/components/ai/suggest-button"
import { SuggestKRsButton } from "@/components/ai/suggest-krs-button"
import type { KRSuggestion } from "@/components/ai/suggest-krs-button"

const KeyResultType = {
  PERCENTAGE: "PERCENTAGE",
  NUMBER:     "NUMBER",
  CURRENCY:   "CURRENCY",
  BOOLEAN:    "BOOLEAN",
} as const
type KeyResultType = (typeof KeyResultType)[keyof typeof KeyResultType]

const ObjectiveStatus = {
  ACTIVE:    "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const
type ObjectiveStatus = (typeof ObjectiveStatus)[keyof typeof ObjectiveStatus]

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string
  name: string | null
  role: string
}

interface KRState extends EditCompanyKRInput {
  _id: string
}

interface InitialData {
  title: string
  year: number
  ownerId: string | null
  objectiveStatus: ObjectiveStatus
  keyResults: EditCompanyKRInput[]
}

const KR_TYPE_LABELS: Record<KeyResultType, string> = {
  PERCENTAGE: "Porcentaje",
  NUMBER:     "Número",
  CURRENCY:   "Moneda",
  BOOLEAN:    "Sí / No",
}

const KR_TYPE_UNITS: Record<KeyResultType, string> = {
  PERCENTAGE: "%",
  NUMBER:     "",
  CURRENCY:   "MXN",
  BOOLEAN:    "",
}

const OBJECTIVE_STATUS_OPTIONS = [
  { value: "ACTIVE",    label: "Activo",     activeStyle: "border-brand-500 bg-brand-50 text-brand-700",  style: "border-gray-200 text-gray-500" },
  { value: "COMPLETED", label: "Completado", activeStyle: "border-green-500 bg-green-50 text-green-700", style: "border-gray-200 text-gray-500" },
  { value: "CANCELLED", label: "Cancelado",  activeStyle: "border-red-400 bg-red-50 text-red-600",       style: "border-gray-200 text-gray-500" },
] as const

const CURRENT_YEAR = new Date().getFullYear()

function makeKRState(kr: EditCompanyKRInput): KRState {
  return { ...kr, _id: kr.id ?? Math.random().toString(36).slice(2) }
}

function emptyKR(): KRState {
  return {
    _id: Math.random().toString(36).slice(2),
    title: "", type: "PERCENTAGE", targetValue: 100, currentValue: 0,
    unit: "%", description: "", trackingStatus: "ON_TRACK",
  }
}

// ─── EditCompanyObjectiveForm ──────────────────────────────────────────────────

export function EditCompanyObjectiveForm({
  objectiveId,
  objectiveNumber,
  leads,
  initialData,
}: {
  objectiveId: string
  objectiveNumber: number | null
  leads: Lead[]
  initialData: InitialData
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [title,           setTitle]           = useState(initialData.title)
  const [year,            setYear]            = useState(initialData.year)
  const [ownerId,         setOwnerId]         = useState(initialData.ownerId ?? "")
  const [objectiveStatus, setObjectiveStatus] = useState<ObjectiveStatus>(initialData.objectiveStatus)
  const [krs,             setKRs]             = useState<KRState[]>(
    initialData.keyResults.length > 0 ? initialData.keyResults.map(makeKRState) : [emptyKR()]
  )
  const [error, setError] = useState<string | null>(null)

  function updateKR(localId: string, patch: Partial<KRState>) {
    setKRs((prev) =>
      prev.map((kr) => {
        if (kr._id !== localId) return kr
        const updated = { ...kr, ...patch }
        if (patch.type !== undefined) updated.unit = KR_TYPE_UNITS[patch.type as KeyResultType]
        return updated
      })
    )
  }

  function addKR() {
    if (krs.length < 5) setKRs((prev) => [...prev, emptyKR()])
  }

  function removeKR(localId: string) {
    if (krs.length > 1) setKRs((prev) => prev.filter((kr) => kr._id !== localId))
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
        currentValue: 0,
        unit: suggestion.unit,
        description: "",
        trackingStatus: "ON_TRACK",
      },
    ])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateCompanyObjective({
        objectiveId,
        title,
        year,
        ownerId: ownerId || null,
        objectiveStatus: objectiveStatus as import("@prisma/client").ObjectiveStatus,
        keyResults: krs.map(({ _id, ...rest }) => rest),
      })
      if (!result.success) { setError(result.error); return }
      router.push("/dashboard/company")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">ORC Empresarial</h2>
          {objectiveNumber != null && (
            <span className="text-xs font-bold text-gray-400 tabular-nums">ORC {objectiveNumber}</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            required
          />
          <AiSuggestButton
            text={title}
            type="objective"
            teamName="Nivel Empresarial"
            onAccept={(s) => setTitle(s)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="">Sin responsable</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name ?? l.id} ({l.role === "LEAD" ? "Líder" : "Ejecutivo"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Estado del objetivo</label>
          <div className="flex gap-2 flex-wrap">
            {OBJECTIVE_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setObjectiveStatus(opt.value as ObjectiveStatus)}
                className={`px-4 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                  objectiveStatus === opt.value ? opt.activeStyle : opt.style
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Resultados clave <span className="font-normal text-gray-400 normal-case">({krs.length}/5)</span>
          </h2>
          {krs.length < 5 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addKR}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                <span className="text-lg leading-none">+</span> Agregar resultado
              </button>
              <SuggestKRsButton
                objectiveTitle={title}
                teamName="Nivel Empresarial"
                onAdd={addKRFromSuggestion}
              />
            </div>
          )}
        </div>

        {krs.map((kr, idx) => (
          <KRCard
            key={kr._id}
            index={idx}
            objectiveNumber={objectiveNumber}
            kr={kr}
            objectiveTitle={title}
            canRemove={krs.length > 1}
            onChange={(patch) => updateKR(kr._id, patch)}
            onRemove={() => removeKR(kr._id)}
            onAiSuggest={(s) => updateKR(kr._id, { title: s })}
          />
        ))}
      </section>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="flex items-center justify-end gap-3 pb-8">
        <button
          type="button"
          onClick={() => router.push("/dashboard/company")}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg border border-gray-200 hover:border-gray-300"
          disabled={isPending}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-lg disabled:opacity-60 transition-colors"
        >
          {isPending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  )
}

// ─── KRCard ───────────────────────────────────────────────────────────────────

function KRCard({
  index,
  objectiveNumber,
  kr,
  objectiveTitle,
  canRemove,
  onChange,
  onRemove,
  onAiSuggest,
}: {
  index: number
  objectiveNumber: number | null
  kr: KRState
  objectiveTitle: string
  canRemove: boolean
  onChange: (patch: Partial<KRState>) => void
  onRemove: () => void
  onAiSuggest: (suggestion: string) => void
}) {
  const label = objectiveNumber != null ? `RC ${objectiveNumber}.${index + 1}` : `RC ${index + 1}`
  const isBoolean = kr.type === "BOOLEAN"

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-xs text-gray-400 hover:text-red-500">
            Eliminar
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Título <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={kr.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          required
        />
        <AiSuggestButton
          text={kr.title}
          type="key_result"
          teamName="Nivel Empresarial"
          parentObjective={objectiveTitle}
          onAccept={onAiSuggest}
        />
      </div>

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

      {!isBoolean && (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor objetivo</label>
            <input
              type="number"
              value={kr.targetValue}
              onChange={(e) => onChange({ targetValue: Number(e.target.value) })}
              min={0}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor actual</label>
            <input
              type="number"
              value={kr.currentValue}
              onChange={(e) => onChange({ currentValue: Number(e.target.value) })}
              min={0}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
            <input
              type="text"
              value={kr.unit}
              onChange={(e) => onChange({ unit: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea
          value={kr.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
        />
      </div>
    </div>
  )
}
