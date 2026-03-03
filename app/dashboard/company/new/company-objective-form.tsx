"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createCompanyObjective } from "./actions"
import type { CompanyKRInput } from "./actions"
import { AiSuggestButton } from "@/components/ai/suggest-button"
import { SuggestKRsButton } from "@/components/ai/suggest-krs-button"
import type { KRSuggestion } from "@/components/ai/suggest-krs-button"

// Local mirrors of Prisma enums (client components cannot import @prisma/client)
const KeyResultType = {
  PERCENTAGE: "PERCENTAGE",
  NUMBER:     "NUMBER",
  CURRENCY:   "CURRENCY",
  BOOLEAN:    "BOOLEAN",
} as const
type KeyResultType = (typeof KeyResultType)[keyof typeof KeyResultType]

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string
  name: string | null
  role: string
}

interface KRState extends CompanyKRInput {
  _id: string
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

const CURRENT_YEAR = new Date().getFullYear()

function emptyKR(): KRState {
  return {
    _id: Math.random().toString(36).slice(2),
    title: "",
    type: "PERCENTAGE",
    targetValue: 100,
    unit: "%",
    description: "",
    trackingStatus: "ON_TRACK",
  }
}

// ─── CompanyObjectiveForm ─────────────────────────────────────────────────────

export function CompanyObjectiveForm({ leads }: { leads: Lead[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [title,   setTitle]   = useState("")
  const [year,    setYear]    = useState(CURRENT_YEAR)
  const [ownerId, setOwnerId] = useState(leads[0]?.id ?? "")
  const [krs,     setKRs]     = useState<KRState[]>([emptyKR()])
  const [error,   setError]   = useState<string | null>(null)

  function updateKR(id: string, patch: Partial<KRState>) {
    setKRs((prev) =>
      prev.map((kr) => {
        if (kr._id !== id) return kr
        const updated = { ...kr, ...patch }
        if (patch.type !== undefined) updated.unit = KR_TYPE_UNITS[patch.type as KeyResultType]
        return updated
      })
    )
  }

  function addKR() {
    if (krs.length < 5) setKRs((prev) => [...prev, emptyKR()])
  }

  function removeKR(id: string) {
    if (krs.length > 1) setKRs((prev) => prev.filter((kr) => kr._id !== id))
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
        trackingStatus: "ON_TRACK",
      },
    ])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createCompanyObjective({
        title,
        year,
        ownerId: ownerId || null,
        keyResults: krs.map(({ _id, ...rest }) => rest),
      })
      if (!result.success) { setError(result.error); return }
      router.push("/dashboard/company")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── Objective fields ── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">ORC Empresarial</h2>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="p.ej. Consolidar posición de liderazgo en el mercado"
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

        {/* Year + Responsible Lead */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Año <span className="text-red-400">*</span>
            </label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value={CURRENT_YEAR}>{CURRENT_YEAR}</option>
              <option value={CURRENT_YEAR + 1}>{CURRENT_YEAR + 1}</option>
              <option value={CURRENT_YEAR - 1}>{CURRENT_YEAR - 1}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsable
            </label>
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

        {/* Level badge */}
        <div className="flex items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M4 16.5v-13h-.25a.75.75 0 010-1.5h12.5a.75.75 0 010 1.5H16v13h.25a.75.75 0 010 1.5h-3.5a.75.75 0 01-.75-.75v-2.5a.75.75 0 00-.75-.75h-2.5a.75.75 0 00-.75.75v2.5a.75.75 0 01-.75.75h-3.5a.75.75 0 010-1.5H4zm3-11a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zm.5 3.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zm2.5-4a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zm.5 3.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1z" clipRule="evenodd" />
            </svg>
            Nivel Empresarial · Anual
          </span>
        </div>
      </section>

      {/* ── Key results ── */}
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
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </p>
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
          className="px-5 py-2 text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Guardando…" : "Guardar ORC"}
        </button>
      </div>
    </form>
  )
}

// ─── KRCard ───────────────────────────────────────────────────────────────────

function KRCard({
  index,
  kr,
  objectiveTitle,
  canRemove,
  onChange,
  onRemove,
  onAiSuggest,
}: {
  index: number
  kr: KRState
  objectiveTitle: string
  canRemove: boolean
  onChange: (patch: Partial<KRState>) => void
  onRemove: () => void
  onAiSuggest: (suggestion: string) => void
}) {
  const isBoolean = kr.type === "BOOLEAN"

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">RC {index + 1}</span>
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
          placeholder="p.ej. Ingresos anuales totales: $500M MXN"
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor objetivo</label>
            <input
              type="number"
              value={kr.targetValue}
              onChange={(e) => onChange({ targetValue: Number(e.target.value) })}
              min={0}
              step={kr.type === "CURRENCY" ? 1000 : 1}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
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
    </div>
  )
}
