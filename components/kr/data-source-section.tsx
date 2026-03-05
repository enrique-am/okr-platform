"use client"

import { useState } from "react"

export interface DataSourceValue {
  name: string
  url: string
  instructions: string
}

interface Props {
  value: DataSourceValue
  onChange: (patch: Partial<DataSourceValue>) => void
}

export function DataSourceSection({ value, onChange }: Props) {
  const hasSource = value.name.trim().length > 0
  const [open, setOpen] = useState(hasSource)

  return (
    <div className="pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasSource ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-medium border border-brand-200">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
              Fuente vinculada
            </span>
          ) : (
            <span className="text-xs font-medium text-gray-500">Fuente de datos</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          {open ? "Ocultar" : hasSource ? "Editar fuente" : "Agregar fuente"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nombre de la fuente <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={value.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="p.ej. Google Analytics, Reporte Semanal de Ventas"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              URL{" "}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="url"
              value={value.url}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Instrucciones{" "}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={value.instructions}
              onChange={(e) => onChange({ instructions: e.target.value })}
              placeholder="p.ej. Filtrar por fecha actual → usar columna Sesiones Totales"
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}
