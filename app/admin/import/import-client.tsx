"use client"

import { useState, useTransition, useRef } from "react"
import Link from "next/link"
import { checkExistingObjectives, importCSV } from "./actions"
import type { ImportInput } from "./actions"

// ─── Types ────────────────────────────────────────────────────────────────────

type KRType = "PERCENTAGE" | "NUMBER" | "CURRENCY" | "BOOLEAN"
type Phase = "configure" | "preview" | "success"

interface ParsedKR {
  rcNumber: string
  title: string
  type: KRType
  startValue: number | null
  targetValue: number | null
  currentValue: number | null
  unit: string | null
  responsible: string | null
  issues: string[]
}

interface ParsedObjective {
  rcNumber: string
  title: string
  responsible: string | null
  krs: ParsedKR[]
  issues: string[]
}

// ─── CSV Parsing Utilities ────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = ""
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if ((ch === "," || ch === ";") && !inQ) {
      cells.push(cur.trim())
      cur = ""
    } else {
      cur += ch
    }
  }
  cells.push(cur.trim())
  return cells
}

function normH(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function parseNum(s: string): number | null {
  if (!s || !s.trim() || s.trim() === "-" || s.trim().toLowerCase() === "n/a") return null
  let v = s
    .trim()
    .replace(/[$€MXN\s]/gi, "")
    .replace(/%$/, "")
  // European format: 1.234,56 → 1234.56
  if (/^\d+(\.\d{3})+(,\d*)?$/.test(v)) {
    v = v.replace(/\./g, "").replace(",", ".")
  } else {
    // American or plain: remove commas
    v = v.replace(/,/g, "")
  }
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function inferType(methodology: string, unit: string | null): KRType {
  const m = normH(methodology)
  if (m.includes("porcent") || m.includes("%") || unit === "%") return "PERCENTAGE"
  if (
    m.includes("moneda") ||
    m.includes("mxn") ||
    m.includes("peso") ||
    unit?.toLowerCase().includes("$")
  )
    return "CURRENCY"
  if (
    m.includes("bool") ||
    m.includes("si no") ||
    m.includes("cumplimiento") ||
    m.includes("binario")
  )
    return "BOOLEAN"
  return "NUMBER"
}

interface ColMap {
  rc: number
  title: number
  resp: number
  meth: number
  inicio: number
  meta: number
  curr: number
  unit: number
}

function detectColumns(headers: string[]): ColMap {
  const n = headers.map(normH)

  const find = (tests: Array<(h: string) => boolean>): number => {
    for (const t of tests) {
      const i = n.findIndex(t)
      if (i !== -1) return i
    }
    return -1
  }

  const rc = find([
    (h) => h === "rc",
    (h) => /^n[uú]m\.?$/.test(h) || h === "no",
  ])
  const title = find([
    (h) => h.includes("objetivo") && h.includes("resultado"),
    (h) => h === "objetivos" || h === "resultados clave",
    (h) => h.includes("objetivo") || h.includes("descripcion") || h.includes("titulo"),
    (h) => h.includes("resultado"),
  ])
  const resp = find([
    (h) => h.includes("responsable"),
    (h) => h.includes("lider") || h === "owner",
  ])
  const meth = find([
    (h) => h.includes("metodolog"),
    (h) => h.includes("tipo") && h.includes("med"),
    (h) => h === "tipo" || h === "medicion",
  ])
  const inicio = find([
    (h) => h === "inicio",
    (h) => h.includes("valor ini") || h.includes("base"),
  ])
  const meta = find([
    (h) => h === "meta",
    (h) => h.includes("valor meta"),
  ])
  // Current value: look for "actual" / "avance"; fallback to column after META
  let curr = find([
    (h) => h === "avance actual" || h === "actual" || h.startsWith("avance"),
    (h) => h.includes("progreso"),
  ])
  if (curr === -1 && meta !== -1 && meta + 1 < headers.length) curr = meta + 1

  const unit = find([
    (h) => h === "unidad" || h === "u" || h === "ud",
    (h) => h.includes("unidad"),
  ])

  return { rc, title, resp, meth, inicio, meta, curr, unit }
}

function parseCSV(text: string): ParsedObjective[] {
  const rows = text.split(/\r?\n/).map(parseCsvLine)
  if (rows.length < 8) return []

  const headers = rows[6]       // 0-indexed: row 7 = index 6
  const dataRows = rows.slice(7) // row 8 onwards
  const c = detectColumns(headers)

  const get = (row: string[], i: number): string =>
    i !== -1 && i < row.length ? (row[i] ?? "").trim() : ""

  const objectives: ParsedObjective[] = []
  let curObj: ParsedObjective | null = null

  for (const row of dataRows) {
    if (row.every((cell) => !cell)) continue

    const rc = get(row, c.rc)
    if (!rc) continue
    if (/^ac/i.test(rc)) continue

    if (/^\d+$/.test(rc)) {
      // Objective row
      const title = get(row, c.title)
      const responsible = get(row, c.resp) || null
      curObj = {
        rcNumber: rc,
        title: title || "(Sin título)",
        responsible,
        krs: [],
        issues: title ? [] : ["Sin título"],
      }
      objectives.push(curObj)
    } else if (/^\d+\.\d+$/.test(rc)) {
      // KR row
      if (!curObj) continue

      const title = get(row, c.title)
      const meth = get(row, c.meth)
      const unit = get(row, c.unit) || null
      const type = inferType(meth, unit)
      const startValue = parseNum(get(row, c.inicio))
      const targetValue = parseNum(get(row, c.meta))
      const currentValue = parseNum(get(row, c.curr))
      const responsible = get(row, c.resp) || null
      const issues: string[] = []
      if (!title) issues.push("Sin título")
      if (targetValue === null && type !== "BOOLEAN") issues.push("Sin valor meta")

      curObj.krs.push({
        rcNumber: rc,
        title: title || "(Sin título)",
        type,
        startValue,
        targetValue,
        currentValue,
        unit,
        responsible,
        issues,
      })
    }
  }

  return objectives
}

// ─── AI parsing ──────────────────────────────────────────────────────────────

type ImportMode = "standard" | "ai"

async function parseCSVWithAI(csvText: string): Promise<ParsedObjective[]> {
  const res = await fetch("/api/import/parse-csv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csvText }),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error ?? "Error al analizar el archivo con IA")
  }
  return data.objectives as ParsedObjective[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const KR_TYPE_LABELS: Record<KRType, string> = {
  PERCENTAGE: "Porcentaje",
  NUMBER: "Número",
  CURRENCY: "Moneda",
  BOOLEAN: "Sí / No",
}

const QUARTERS = [1, 2, 3, 4] as const

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportClient({
  teams,
}: {
  teams: { id: string; name: string; slug: string }[]
}) {
  const [phase, setPhase] = useState<Phase>("configure")
  const [isPending, startTransition] = useTransition()

  // Import mode
  const [importMode, setImportMode] = useState<ImportMode>("standard")

  // Configure state
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "")
  const [year, setYear] = useState(new Date().getFullYear())
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(1)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Preview state
  const [parsed, setParsed] = useState<ParsedObjective[]>([])
  const [existingCount, setExistingCount] = useState(0)
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  // Success state
  const [successData, setSuccessData] = useState<{
    objectivesCreated: number
    krsCreated: number
    teamSlug: string
    teamName: string
  } | null>(null)

  const selectedTeam = teams.find((t) => t.id === teamId)

  // ─── File handlers ────────────────────────────────────────────────────────

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.name.toLowerCase().endsWith(".csv")) {
      setFile(dropped)
      setConfigError(null)
    } else {
      setConfigError("Por favor sube un archivo .csv")
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setConfigError(null) }
  }

  // ─── Navigate to preview ──────────────────────────────────────────────────

  function handleGoToPreview() {
    if (!file) { setConfigError("Selecciona un archivo CSV."); return }
    if (!teamId) { setConfigError("Selecciona un equipo."); return }

    if (importMode === "ai") {
      handleGoToPreviewAI()
      return
    }

    startTransition(async () => {
      const text = await file.text()
      const objectives = parseCSV(text)

      if (objectives.length === 0) {
        setConfigError(
          "No se encontraron objetivos en el CSV. " +
          "Verifica que la fila 7 contenga los encabezados (RC, Objetivos, INICIO, META…)."
        )
        return
      }

      const { count } = await checkExistingObjectives(teamId, year)
      setParsed(objectives)
      setExistingCount(count)
      setReplaceExisting(false)
      setImportError(null)
      setPhase("preview")
    })
  }

  function handleGoToPreviewAI() {
    startTransition(async () => {
      let text: string
      try {
        text = await file!.text()
      } catch {
        setConfigError("No se pudo leer el archivo.")
        return
      }

      let objectives: ParsedObjective[]
      try {
        objectives = await parseCSVWithAI(text)
      } catch (e) {
        setConfigError(
          e instanceof Error
            ? e.message
            : "Error al analizar con IA. Intenta con la importación estándar."
        )
        return
      }

      if (objectives.length === 0) {
        setConfigError(
          "La IA no encontró objetivos en el archivo. " +
          "Intenta con la importación estándar o verifica que el archivo contenga datos."
        )
        return
      }

      const { count } = await checkExistingObjectives(teamId, year)
      setParsed(objectives)
      setExistingCount(count)
      setReplaceExisting(false)
      setImportError(null)
      setPhase("preview")
    })
  }

  // ─── Confirm import ───────────────────────────────────────────────────────

  function handleConfirmImport() {
    setImportError(null)

    startTransition(async () => {
      const input: ImportInput = {
        teamId,
        year,
        quarter,
        replaceExisting,
        objectives: parsed.map((obj) => ({
          title: obj.title,
          responsible: obj.responsible,
          krs: obj.krs.map((kr) => ({
            title: kr.title,
            type: kr.type,
            startValue: kr.type === "BOOLEAN" ? null : (kr.startValue ?? null),
            targetValue: kr.type === "BOOLEAN" ? 1 : (kr.targetValue ?? 0),
            currentValue: kr.currentValue,
            unit: kr.unit,
          })),
        })),
      }

      const result = await importCSV(input)

      if (!result.success) {
        setImportError(result.error)
        return
      }

      setSuccessData({
        objectivesCreated: result.objectivesCreated,
        krsCreated: result.krsCreated,
        teamSlug: selectedTeam?.slug ?? "",
        teamName: selectedTeam?.name ?? "",
      })
      setPhase("success")
    })
  }

  const totalKRs = parsed.reduce((s, o) => s + o.krs.length, 0)
  const totalIssues = parsed.reduce(
    (s, o) =>
      s + o.issues.length + o.krs.reduce((ks, kr) => ks + kr.issues.length, 0),
    0
  )

  // ─── Phase: Configure ─────────────────────────────────────────────────────

  if (phase === "configure") {
    return (
      <div className="max-w-xl">
        {/* Mode toggle */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modo de importación
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setImportMode("standard")}
              className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-colors text-left ${
                importMode === "standard"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <span className="font-semibold">Importación estándar</span>
              <span className="block text-xs font-normal opacity-75 mt-0.5">
                Usa el parser automático de columnas
              </span>
            </button>
            <button
              type="button"
              onClick={() => setImportMode("ai")}
              className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-colors text-left ${
                importMode === "ai"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <span className="font-semibold">Importación con IA ✨</span>
              <span className="block text-xs font-normal opacity-75 mt-0.5">
                Usa OpenAI para interpretar el archivo
              </span>
            </button>
          </div>
          {importMode === "ai" && (
            <p className="text-xs text-gray-400 mt-2">
              Recomendado para archivos con formato irregular o diferente a la plantilla estándar.
            </p>
          )}
        </div>

        {/* Team selector */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Equipo
          </label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Year + Quarter */}
        <div className="mb-5 flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Año
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              min={2020}
              max={2030}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Trimestre
            </label>
            <div className="flex gap-2">
              {QUARTERS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuarter(q)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    quarter === q
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  Q{q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* File upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Archivo CSV
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl px-6 py-10 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-brand-400 bg-brand-50"
                : file
                ? "border-brand-300 bg-brand-50/50"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="sr-only"
            />
            {file ? (
              <>
                <div className="text-2xl mb-2">📄</div>
                <p className="text-sm font-medium text-gray-700">{file.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {(file.size / 1024).toFixed(1)} KB · Haz clic para cambiar
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl mb-2">📂</div>
                <p className="text-sm font-medium text-gray-600">
                  Arrastra tu CSV aquí o haz clic para seleccionar
                </p>
                <p className="text-xs text-gray-400 mt-1">Solo archivos .csv</p>
              </>
            )}
          </div>
        </div>

        {configError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">
            {configError}
          </p>
        )}

        <button
          type="button"
          onClick={handleGoToPreview}
          disabled={isPending || !file}
          className="px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending
            ? importMode === "ai"
              ? "Analizando archivo con IA…"
              : "Procesando…"
            : "Ver previsualización →"}
        </button>

        {/* Format hint — standard mode only */}
        {importMode === "standard" && (
        <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">
            Formato esperado del CSV
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>· Filas 1–6: encabezados / metadata del reporte (se ignoran)</li>
            <li>· Fila 7: encabezados de columnas (RC, Objetivos, Responsable, INICIO, META…)</li>
            <li>· Fila 8+: datos — objetivos = número entero (1, 2…), RCs = notación punto (1.1, 1.2…)</li>
            <li>· Filas con prefijo "ac" y filas en blanco se omiten automáticamente</li>
          </ul>
        </div>
        )}
      </div>
    )
  }

  // ─── Phase: Preview ───────────────────────────────────────────────────────

  if (phase === "preview") {
    return (
      <div>
        {/* Summary bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap text-sm">
          <span className="font-medium text-gray-700">
            {parsed.length} objetivo{parsed.length !== 1 ? "s" : ""} ·{" "}
            {totalKRs} RC{totalKRs !== 1 ? "s" : ""}
          </span>
          {totalIssues > 0 && (
            <span className="text-amber-600 font-medium">
              ⚠ {totalIssues} advertencia{totalIssues !== 1 ? "s" : ""}
            </span>
          )}
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">
            {selectedTeam?.name} · Q{quarter} {year}
          </span>
          {importMode === "ai" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-medium">
              ✨ IA
            </span>
          )}
        </div>

        {/* Existing ORC warning */}
        {existingCount > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">
              Este equipo ya tiene {existingCount} ORC
              {existingCount !== 1 ? "s" : ""} activo
              {existingCount !== 1 ? "s" : ""} para {year}
            </p>
            <p className="text-xs text-amber-700 mb-3">
              Elige qué hacer con los ORCs existentes:
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setReplaceExisting(false)}
                className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                  !replaceExisting
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                <span className="font-semibold">Añadir</span>
                <span className="block text-xs font-normal opacity-75 mt-0.5">
                  Importar junto a los existentes
                </span>
              </button>
              <button
                type="button"
                onClick={() => setReplaceExisting(true)}
                className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                  replaceExisting
                    ? "border-red-400 bg-red-50 text-red-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                <span className="font-semibold">Reemplazar</span>
                <span className="block text-xs font-normal opacity-75 mt-0.5">
                  Eliminar existentes e importar
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Preview table */}
        <div className="space-y-3 mb-6">
          {parsed.map((obj) => (
            <div
              key={obj.rcNumber}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Objective header row */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 tabular-nums flex-shrink-0">
                  ORC {obj.rcNumber}
                </span>
                <span className="text-sm font-semibold text-gray-800 flex-1 min-w-0 truncate">
                  {obj.title}
                </span>
                {obj.responsible && (
                  <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                    {obj.responsible}
                  </span>
                )}
                {obj.issues.length > 0 && (
                  <span className="text-xs text-amber-600 flex-shrink-0">
                    ⚠ {obj.issues[0]}
                  </span>
                )}
              </div>

              {obj.krs.length === 0 ? (
                <p className="px-4 py-3 text-xs text-gray-400 italic">
                  Sin RCs detectados
                </p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {obj.krs.map((kr) => (
                    <div
                      key={kr.rcNumber}
                      className="px-4 py-3 flex items-start gap-3"
                    >
                      <span className="text-xs font-bold text-gray-400 tabular-nums flex-shrink-0 mt-0.5">
                        RC {kr.rcNumber}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 leading-snug">
                          {kr.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                            {KR_TYPE_LABELS[kr.type]}
                          </span>
                          {kr.startValue !== null && (
                            <span>
                              Inicio: {kr.startValue}
                              {kr.unit ? ` ${kr.unit}` : ""}
                            </span>
                          )}
                          {kr.targetValue !== null ? (
                            <span>
                              Meta: {kr.targetValue}
                              {kr.unit ? ` ${kr.unit}` : ""}
                            </span>
                          ) : kr.type !== "BOOLEAN" ? (
                            <span className="text-amber-500">Sin meta</span>
                          ) : null}
                          {kr.currentValue !== null && (
                            <span>
                              Actual: {kr.currentValue}
                              {kr.unit ? ` ${kr.unit}` : ""}
                            </span>
                          )}
                        </div>
                        {kr.issues.length > 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            ⚠ {kr.issues.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {importError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">
            {importError}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPhase("configure")}
            disabled={isPending}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            ← Volver
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={isPending || parsed.length === 0}
            className="px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isPending
              ? "Importando…"
              : `Confirmar importación · ${parsed.length} ORC${parsed.length !== 1 ? "s" : ""}, ${totalKRs} RC${totalKRs !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    )
  }

  // ─── Phase: Success ───────────────────────────────────────────────────────

  if (phase === "success" && successData) {
    return (
      <div className="max-w-md py-8">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          ¡Importación exitosa!
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Se crearon{" "}
          <strong>
            {successData.objectivesCreated} ORC
            {successData.objectivesCreated !== 1 ? "s" : ""}
          </strong>{" "}
          y{" "}
          <strong>
            {successData.krsCreated} RC
            {successData.krsCreated !== 1 ? "s" : ""}
          </strong>{" "}
          para <strong>{successData.teamName}</strong> · Q{quarter} {year}
        </p>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/teams/${successData.teamSlug}`}
            className="px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
          >
            Ver equipo →
          </Link>
          <button
            type="button"
            onClick={() => {
              setPhase("configure")
              setFile(null)
              setParsed([])
              setExistingCount(0)
              setSuccessData(null)
              setConfigError(null)
              setImportError(null)
            }}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            Importar otro
          </button>
        </div>
      </div>
    )
  }

  return null
}
