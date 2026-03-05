"use client"

import { useRef, useState, useTransition } from "react"
import { createSection, updateSection, uploadDocument, deleteDocument } from "./actions"
import { RichTextEditor } from "@/components/ui/rich-text-editor"

interface Document {
  id: string
  title: string
  filename: string
  fileSize: number
}

interface SectionEditorProps {
  section?: {
    id: string
    title: string
    slug: string
    content: string
    isPublished: boolean
    documents: Document[]
  }
  onClose: () => void
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function SectionEditor({ section, onClose }: SectionEditorProps) {
  const isEdit = Boolean(section)
  const [title, setTitle] = useState(section?.title ?? "")
  const [slug, setSlug] = useState(section?.slug ?? "")
  const [content, setContent] = useState(section?.content ?? "")
  const [isPublished, setIsPublished] = useState(section?.isPublished ?? true)
  const [documents, setDocuments] = useState<Document[]>(section?.documents ?? [])
  const [docTitle, setDocTitle] = useState("")
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!isEdit) setSlug(slugify(value))
  }

  function handleSave() {
    if (!title.trim() || !slug.trim()) {
      setError("El título y el slug son obligatorios.")
      return
    }
    setError(null)
    startTransition(async () => {
      if (isEdit && section) {
        await updateSection(section.id, { title, slug, content, isPublished })
      } else {
        await createSection({ title, slug, content, isPublished })
      }
      onClose()
    })
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!section?.id || !file) return
    setIsUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("title", docTitle || file.name)
    try {
      await uploadDocument(section.id, fd)
      setDocuments((prev) => [
        ...prev,
        { id: Date.now().toString(), title: docTitle || file.name, filename: file.name, fileSize: file.size },
      ])
      setDocTitle("")
      if (fileRef.current) fileRef.current.value = ""
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDeleteDoc(id: string) {
    await deleteDocument(id)
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
      <h2 className="text-base font-semibold text-gray-900">
        {isEdit ? "Editar sección" : "Nueva sección"}
      </h2>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Título</label>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Ej: ¿Qué son los ORCs?"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Slug (URL)</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="que-son-los-orcs"
        />
        <p className="text-xs text-gray-400 mt-1">
          Aparecerá en la URL como: /ayuda#{slug}
        </p>
      </div>

      {/* Content */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Contenido</label>
        <RichTextEditor value={content} onChange={setContent} />
      </div>

      {/* Published toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setIsPublished((v) => !v)}
          className={`relative w-10 h-5 rounded-full transition-colors ${isPublished ? "bg-brand-500" : "bg-gray-300"}`}
        >
          <div
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublished ? "translate-x-5" : ""}`}
          />
        </div>
        <span className="text-sm text-gray-700">Publicada</span>
      </label>

      {/* Document upload (only for existing sections) */}
      {isEdit && section && (
        <div className="border-t border-gray-100 pt-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Documentos PDF adjuntos
          </p>

          {/* Existing docs */}
          {documents.length > 0 && (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-400">{doc.filename} · {formatBytes(doc.fileSize)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Upload form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="Nombre del documento"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0"
            >
              Elegir PDF
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="px-3 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors flex-shrink-0 disabled:opacity-50"
            >
              {isUploading ? "Subiendo…" : "Subir"}
            </button>
          </div>
          {fileRef.current?.files?.[0] && (
            <p className="text-xs text-gray-500">{fileRef.current.files[0].name}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex gap-2">
          {isEdit && (
            <a
              href="/ayuda"
              target="_blank"
              className="px-4 py-2 text-sm text-brand-600 hover:underline"
            >
              Vista previa ↗
            </a>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}
