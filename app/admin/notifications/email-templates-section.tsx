"use client"

import { useState, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import { EmailBodyEditor } from "./email-body-editor"
import { saveEmailTemplate, resetEmailTemplate } from "./actions"
import { ToastList, ToastItem } from "@/components/ui/toast"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailTemplateData {
  id: string
  type: string
  subject: string
  bodyHtml: string
  isCustom: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_ORDER = [
  "WELCOME",
  "WEEKLY_REMINDER",
  "DEADLINE_REMINDER",
  "URGENT_REMINDER",
  "WEEKLY_DIGEST",
  "COMPLIANCE_REPORT",
] as const

const TYPE_LABELS: Record<string, string> = {
  WELCOME: "Bienvenida",
  WEEKLY_REMINDER: "Recordatorio semanal",
  DEADLINE_REMINDER: "Alerta de vencimiento",
  URGENT_REMINDER: "Recordatorio urgente",
  WEEKLY_DIGEST: "Digest ejecutivo",
  COMPLIANCE_REPORT: "Reporte de cumplimiento",
}

const TYPE_DESCRIPTIONS: Record<string, string> = {
  WELCOME: "Se envía al invitar a un nuevo usuario.",
  WEEKLY_REMINDER: "Se envía a quien no ha registrado avance en 7 días.",
  DEADLINE_REMINDER: "Se envía cuando un ORC está próximo a su fecha límite.",
  URGENT_REMINDER: "Se envía el día del deadline de check-in semanal.",
  WEEKLY_DIGEST: "Resumen ejecutivo enviado a ejecutivos y admins.",
  COMPLIANCE_REPORT: "Reporte de cumplimiento de check-ins enviado a admins.",
}

// ─── Client-side email preview builder ───────────────────────────────────────

function buildEmailPreview(bodyHtml: string): string {
  const filled = bodyHtml
    .replace(/\{\{nombre\}\}/g, "María García")
    .replace(/\{\{equipo\}\}/g, "Equipo Editorial")
    .replace(/\{\{progreso\}\}/g, "75%")
    .replace(/\{\{enlace\}\}/g, "#")

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Vista previa</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    <tr>
      <td style="padding:40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:560px;margin:0 auto;">
          <tr>
            <td style="text-align:center;padding-bottom:24px;">
              <span style="font-size:18px;font-weight:700;color:#111827;">Grupo AM</span>
              <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Sistema ORC</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;padding:32px 28px;">
              ${filled}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.7;">
                Este es un mensaje automático del sistema ORC de Grupo AM.<br>
                Uso interno exclusivo para colaboradores.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Full-screen editor modal ─────────────────────────────────────────────────

interface EditorModalProps {
  template: EmailTemplateData
  onClose: () => void
  onSaved: (updated: Pick<EmailTemplateData, "type" | "subject" | "bodyHtml" | "isCustom">) => void
}

export function EditorModal({ template, onClose, onSaved }: EditorModalProps) {
  const [tab, setTab] = useState<"editor" | "preview" | "html">("editor")
  const [editorKey, setEditorKey] = useState(0)
  const [subject, setSubject] = useState(template.subject)
  const [bodyHtml, setBodyHtml] = useState(template.bodyHtml)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Sync state when template changes (e.g. after reset)
  useEffect(() => {
    setSubject(template.subject)
    setBodyHtml(template.bodyHtml)
  }, [template.type]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  // Escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleSave() {
    setSaving(true)
    try {
      const result = await saveEmailTemplate(template.type, subject, bodyHtml)
      if (result.success) {
        onSaved({ type: template.type, subject, bodyHtml, isCustom: true })
        setToast("✅ Plantilla guardada correctamente.")
      } else {
        setToast(`❌ Error: ${result.error}`)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!confirm("¿Restaurar la plantilla original? Se perderán los cambios personalizados.")) return
    setResetting(true)
    try {
      const result = await resetEmailTemplate(template.type)
      if (result.success) {
        setSubject(result.subject)
        setBodyHtml(result.bodyHtml)
        onSaved({ type: template.type, subject: result.subject, bodyHtml: result.bodyHtml, isCustom: false })
        setToast("↩ Plantilla restaurada a los valores originales.")
      } else {
        setToast(`❌ Error: ${result.error}`)
      }
    } finally {
      setResetting(false)
    }
  }

  const modal = (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Cerrar editor"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Editar plantilla — {TYPE_LABELS[template.type] ?? template.type}
            </h2>
            {template.isCustom && (
              <span className="text-xs text-brand-600 font-medium">Personalizada</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {toast && (
            <span className="text-xs text-gray-500 max-w-xs truncate">{toast}</span>
          )}
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || saving}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetting ? "Restaurando…" : "Restaurar original"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || resetting}
            className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando…" : "Guardar plantilla"}
          </button>
        </div>
      </div>

      {/* Subject field */}
      <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0 flex items-center gap-3">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-14 flex-shrink-0">
          Asunto
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          placeholder="Asunto del email…"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-6 flex-shrink-0 bg-white">
        {(["editor", "preview", "html"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              if (tab === "html" && t === "editor") setEditorKey((k) => k + 1)
              setTab(t)
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "editor" ? "Editor visual" : t === "preview" ? "Vista previa" : <span className="font-mono">HTML</span>}
          </button>
        ))}
        {tab === "preview" && (
          <span className="ml-auto self-center text-xs text-gray-400 italic">
            Las variables se muestran con valores de ejemplo
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === "editor" ? (
          <div className="h-full p-4">
            <EmailBodyEditor key={editorKey} value={bodyHtml} onChange={setBodyHtml} />
          </div>
        ) : tab === "preview" ? (
          <iframe
            srcDoc={buildEmailPreview(bodyHtml)}
            title="Vista previa del email"
            className="w-full h-full border-0"
            sandbox="allow-same-origin"
          />
        ) : (
          <textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            className="w-full h-full px-6 py-5 font-mono text-xs text-gray-700 bg-gray-50 outline-none resize-none"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onEdit,
}: {
  template: EmailTemplateData
  onEdit: () => void
}) {
  return (
    <div className="flex flex-col gap-2 p-5 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{TYPE_LABELS[template.type]}</span>
            {template.isCustom && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                Personalizada
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{TYPE_DESCRIPTIONS[template.type]}</p>
          <p className="text-xs text-gray-500 mt-1.5 truncate">
            <span className="font-medium text-gray-400">Asunto:</span>{" "}
            {template.subject || "—"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="mt-1 self-start inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 hover:border-brand-400 hover:text-brand-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M13.488 2.513a1.75 1.75 0 00-2.475 0L6.75 6.774a2.75 2.75 0 00-.596.892l-.83 2.322a.75.75 0 00.95.95l2.322-.83a2.75 2.75 0 00.892-.596l4.26-4.263a1.75 1.75 0 000-2.476zM4.75 8.75A.75.75 0 004 9.5v1a.75.75 0 00.75.75h1a.75.75 0 000-1.5H5v-.25a.75.75 0 00-.75-.75z" />
        </svg>
        Editar plantilla
      </button>
    </div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function EmailTemplatesSection({ initialTemplates }: { initialTemplates: EmailTemplateData[] }) {
  const [templates, setTemplates] = useState<EmailTemplateData[]>(initialTemplates)
  const [editingType, setEditingType] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  function addToast(message: string, primary = false) {
    const id = String(Date.now())
    setToasts((prev) => [...prev, { id, message, primary }])
  }

  const editingTemplate = templates.find((t) => t.type === editingType) ?? null

  function handleSaved(updated: Pick<EmailTemplateData, "type" | "subject" | "bodyHtml" | "isCustom">) {
    setTemplates((prev) =>
      prev.map((t) => t.type === updated.type ? { ...t, ...updated } : t)
    )
    if (updated.isCustom) {
      addToast("✅ Plantilla guardada y activa.", true)
    } else {
      addToast("↩ Plantilla restaurada a los valores originales.")
    }
  }

  // Build ordered list — types without a DB record get a placeholder
  const orderedTemplates = TYPE_ORDER.map((type) => {
    return templates.find((t) => t.type === type) ?? {
      id: type,
      type,
      subject: "",
      bodyHtml: "",
      isCustom: false,
    }
  })

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Plantillas de email</h2>
          <p className="text-sm text-gray-500 mt-1">
            Personaliza el contenido de los correos automáticos. Usa variables como{" "}
            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono text-brand-700">
              {"{{nombre}}"}
            </code>
            ,{" "}
            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono text-brand-700">
              {"{{equipo}}"}
            </code>{" "}
            para insertar datos dinámicos.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
          {orderedTemplates.map((template) => (
            <TemplateCard
              key={template.type}
              template={template}
              onEdit={() => setEditingType(template.type)}
            />
          ))}
        </div>
      </div>

      {editingTemplate && (
        <EditorModal
          template={editingTemplate}
          onClose={() => setEditingType(null)}
          onSaved={handleSaved}
        />
      )}

      <ToastList toasts={toasts} onRemove={removeToast} />
    </>
  )
}
