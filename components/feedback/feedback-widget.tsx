"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Modal } from "@/components/ui/modal"

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "bug" | "feature"
type Priority = "HIGH" | "MEDIUM" | "LOW"

interface FeedbackWidgetProps {
  userName: string | null
  userEmail: string
  userRole: string
  teamName: string | null
}

// ─── Priority pill selector ───────────────────────────────────────────────────

const PRIORITIES: { value: Priority; label: string; active: string; inactive: string }[] = [
  {
    value: "HIGH",
    label: "Muy importante",
    active: "bg-red-100 text-red-700 border-red-300",
    inactive: "bg-white text-gray-500 border-gray-200 hover:border-gray-300",
  },
  {
    value: "MEDIUM",
    label: "Útil",
    active: "bg-amber-50 text-amber-700 border-amber-300",
    inactive: "bg-white text-gray-500 border-gray-200 hover:border-gray-300",
  },
  {
    value: "LOW",
    label: "Sería bonito tener",
    active: "bg-blue-50 text-blue-700 border-blue-300",
    inactive: "bg-white text-gray-500 border-gray-200 hover:border-gray-300",
  },
]

// ─── Main widget ──────────────────────────────────────────────────────────────

export function FeedbackWidget({ userName, userEmail, userRole, teamName }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>("bug")
  const [success, setSuccess] = useState(false)
  const pathname = usePathname()

  // Reset to bug tab when modal opens
  function handleOpen() {
    setTab("bug")
    setSuccess(false)
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    // Small delay to avoid flash before modal closes
    setTimeout(() => setSuccess(false), 300)
  }

  function handleSuccess() {
    setSuccess(true)
    setTimeout(() => handleClose(), 3000)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        title="Enviar comentario o reportar un error"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-brand-500 hover:bg-brand-600 active:scale-95 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-xl select-none"
        aria-label="Abrir panel de comentarios"
      >
        💬
      </button>

      {/* Modal */}
      <Modal
        open={open}
        onClose={handleClose}
        title="Enviar comentario"
        maxWidth="max-w-lg"
      >
        {success ? (
          <SuccessView />
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-100 mb-5 -mx-6 px-6">
              <TabButton active={tab === "bug"} onClick={() => setTab("bug")}>
                🐛 Reportar error
              </TabButton>
              <TabButton active={tab === "feature"} onClick={() => setTab("feature")}>
                💡 Sugerir mejora
              </TabButton>
            </div>

            {tab === "bug" ? (
              <BugForm
                pageUrl={typeof window !== "undefined" ? window.location.href : pathname}
                userAgent={typeof navigator !== "undefined" ? navigator.userAgent : ""}
                submittedBy={{ name: userName, email: userEmail, role: userRole, teamName }}
                onSuccess={handleSuccess}
              />
            ) : (
              <FeatureForm
                pageUrl={typeof window !== "undefined" ? window.location.href : pathname}
                userAgent={typeof navigator !== "undefined" ? navigator.userAgent : ""}
                submittedBy={{ name: userName, email: userEmail, role: userRole, teamName }}
                onSuccess={handleSuccess}
              />
            )}
          </>
        )}
      </Modal>
    </>
  )
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-brand-500 text-brand-700"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      {children}
    </button>
  )
}

// ─── Success view ─────────────────────────────────────────────────────────────

function SuccessView() {
  return (
    <div className="text-center py-8">
      <div className="text-5xl mb-4">✅</div>
      <h3 className="text-base font-semibold text-gray-900 mb-2">¡Gracias por tu comentario!</h3>
      <p className="text-sm text-gray-500 leading-relaxed">
        Tu reporte ha sido recibido. El equipo de administración lo revisará pronto.
      </p>
      <p className="text-xs text-gray-400 mt-4">Este panel se cerrará automáticamente…</p>
    </div>
  )
}

// ─── Shared form props ────────────────────────────────────────────────────────

interface FormProps {
  pageUrl: string
  userAgent: string
  submittedBy: { name: string | null; email: string; role: string; teamName: string | null }
  onSuccess: () => void
}

// ─── Bug form ─────────────────────────────────────────────────────────────────

function BugForm({ pageUrl, userAgent, submittedBy, onSuccess }: FormProps) {
  const [description, setDescription] = useState("")
  const [steps, setSteps] = useState("")
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [screenshotName, setScreenshotName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen no puede pesar más de 2 MB")
      e.target.value = ""
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setScreenshot(ev.target?.result as string)
      setScreenshotName(file.name)
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "BUG",
            description,
            stepsToReproduce: steps || null,
            screenshotBase64: screenshot || null,
            pageUrl,
            userAgent,
          }),
        })
        if (!res.ok) throw new Error()
        onSuccess()
      } catch {
        setError("Ocurrió un error al enviar. Intenta de nuevo.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ¿Qué pasó? <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe el error que encontraste..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ¿Cómo se reproduce?
          <span className="text-gray-400 font-normal ml-1">(opcional)</span>
        </label>
        <textarea
          rows={2}
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder="Pasos para reproducir el error..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Captura de pantalla
          <span className="text-gray-400 font-normal ml-1">(opcional)</span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif"
          onChange={handleFile}
          className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition-colors"
        />
        {screenshotName && (
          <p className="text-xs text-gray-400 mt-1">
            📎 {screenshotName}
            <button
              type="button"
              onClick={() => {
                setScreenshot(null)
                setScreenshotName(null)
                if (fileRef.current) fileRef.current.value = ""
              }}
              className="ml-2 text-red-400 hover:text-red-600"
            >
              Quitar
            </button>
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !description.trim()}
        className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {isPending ? "Enviando..." : "Enviar reporte"}
      </button>
    </form>
  )
}

// ─── Feature request form ─────────────────────────────────────────────────────

function FeatureForm({ pageUrl, userAgent, submittedBy, onSuccess }: FormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<Priority>("MEDIUM")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "FEATURE",
            title,
            description,
            priority,
            pageUrl,
            userAgent,
          }),
        })
        if (!res.ok) throw new Error()
        onSuccess()
      } catch {
        setError("Ocurrió un error al enviar. Intenta de nuevo.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Título <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Resumen breve de tu idea..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ¿Qué te gustaría y por qué? <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe la mejora y cómo te ayudaría..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Prioridad</label>
        <div className="flex flex-wrap gap-2">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                priority === p.value ? p.active : p.inactive
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !title.trim() || !description.trim()}
        className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {isPending ? "Enviando..." : "Enviar sugerencia"}
      </button>
    </form>
  )
}
