"use client"

import { useState, useTransition } from "react"
import { SectionEditor } from "./section-editor"
import { deleteSection, reorderSections, togglePublish } from "./actions"

interface Section {
  id: string
  title: string
  slug: string
  content: string
  isPublished: boolean
  order: number
  _count: { documents: number }
  documents: Array<{ id: string; title: string; filename: string; fileSize: number }>
}

interface SectionListProps {
  initialSections: Section[]
}

export function SectionList({ initialSections }: SectionListProps) {
  const [sections, setSections] = useState(initialSections)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // ── Drag-to-reorder ──────────────────────────────────────────────────────────
  function handleDragStart(id: string) {
    setDragId(id)
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (id !== dragId) setDragOverId(id)
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setDragOverId(null)
      return
    }

    const fromIndex = sections.findIndex((s) => s.id === dragId)
    const toIndex = sections.findIndex((s) => s.id === targetId)
    const updated = [...sections]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)

    setSections(updated)
    setDragId(null)
    setDragOverId(null)

    startTransition(() => reorderSections(updated.map((s) => s.id)))
  }

  function handleDragEnd() {
    setDragId(null)
    setDragOverId(null)
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  function handleTogglePublish(id: string, current: boolean) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isPublished: !current } : s))
    )
    startTransition(() => togglePublish(id, !current))
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta sección? También se eliminarán todos sus documentos adjuntos.")) return
    setSections((prev) => prev.filter((s) => s.id !== id))
    startTransition(() => deleteSection(id))
  }

  const editingSection = sections.find((s) => s.id === editingId) ?? null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Create button */}
      <div className="px-4 py-3 border-b border-gray-100 flex justify-end">
        <button
          onClick={() => { setShowCreate(true); setEditingId(null) }}
          className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
        >
          + Nueva sección
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="border-b border-gray-100">
          <SectionEditor onClose={() => setShowCreate(false)} />
        </div>
      )}

      {/* Section rows */}
      <div>
        {sections.map((section) => (
          <div key={section.id}>
            {editingId === section.id ? (
              <div className="border-b border-gray-100">
                <SectionEditor
                  section={section}
                  onClose={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div
                draggable
                onDragStart={() => handleDragStart(section.id)}
                onDragOver={(e) => handleDragOver(e, section.id)}
                onDrop={() => handleDrop(section.id)}
                onDragEnd={handleDragEnd}
                className={`px-4 py-3 border-b border-gray-100 last:border-0 flex items-center gap-3 transition-colors ${
                  dragOverId === section.id
                    ? "bg-brand-50"
                    : ""
                } ${dragId === section.id ? "opacity-50" : ""}`}
              >
                {/* Drag handle */}
                <span className="text-gray-300 cursor-grab active:cursor-grabbing text-lg select-none flex-shrink-0">
                  ⠿
                </span>

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{section.title}</p>
                  <p className="text-xs text-gray-400">
                    /{section.slug} · {section._count.documents} doc{section._count.documents !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Published badge */}
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                    section.isPublished
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {section.isPublished ? "Publicada" : "Oculta"}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={`/ayuda#${section.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-gray-600 font-medium"
                  >
                    Ver ↗
                  </a>
                  <button
                    onClick={() => setEditingId(section.id)}
                    className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleTogglePublish(section.id, section.isPublished)}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                  >
                    {section.isPublished ? "Ocultar" : "Publicar"}
                  </button>
                  <button
                    onClick={() => handleDelete(section.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {sections.length === 0 && !showCreate && (
        <div className="text-center py-12 text-gray-400 text-sm">
          No hay secciones. Crea la primera haciendo clic en "Nueva sección".
        </div>
      )}
    </div>
  )
}
