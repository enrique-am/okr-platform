"use client"

import { useState, useTransition, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  updateNotificationSettings,
  triggerWeeklyReminders,
  triggerWeeklyDigest,
  triggerSecondReminder,
  triggerComplianceReport,
} from "./actions"
import { ToastList, ToastItem } from "@/components/ui/toast"
import { EditorModal, EmailTemplateData } from "./email-templates-section"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Settings {
  weeklyReminderEnabled: boolean
  deadlineReminderEnabled: boolean
  deadlineReminderDays: number
  weeklyDigestEnabled: boolean
  welcomeEmailEnabled: boolean
  secondReminderEnabled: boolean
  deadlineDay: number
  deadlineHour: number
  complianceReportEnabled: boolean
  customReminderMessage: string | null
  customDigestMessage: string | null
}

interface ConfirmAction {
  name: string
  recipients: string
  onConfirm: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
]

const HOURS = Array.from({ length: 17 }, (_, i) => {
  const h = i + 6
  const ampm = h < 12 ? "am" : "pm"
  const display = h <= 12 ? h : h - 12
  return { value: h, label: `${display}:00 ${ampm}` }
})

const DEADLINE_DAYS_OPTIONS = [3, 5, 7, 14]

const NOTIFICATION_META = [
  { key: "weeklyReminderEnabled" as keyof Settings, label: "Recordatorio semanal" },
  { key: "weeklyDigestEnabled" as keyof Settings, label: "Digest ejecutivo" },
  { key: "secondReminderEnabled" as keyof Settings, label: "Recordatorio urgente" },
  { key: "complianceReportEnabled" as keyof Settings, label: "Reporte de cumplimiento" },
  { key: "deadlineReminderEnabled" as keyof Settings, label: "Alertas de vencimiento" },
  { key: "welcomeEmailEnabled" as keyof Settings, label: "Emails de bienvenida" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Compute next occurrence of weekday+hour in Mexico City (UTC-6 approximate). */
function getNextSendDate(weekday: number, hour: number): string {
  const now = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000
  const mxNow = new Date(utcMs - 6 * 60 * 60 * 1000)

  const target = new Date(mxNow)
  target.setHours(hour, 0, 0, 0)

  const currentDay = mxNow.getDay()
  const daysUntil = (weekday - currentDay + 7) % 7

  if (daysUntil === 0 && mxNow >= target) {
    target.setDate(target.getDate() + 7)
  } else if (daysUntil > 0) {
    target.setDate(target.getDate() + daysUntil)
  }

  return target.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(!enabled) }}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 flex-shrink-0 ${enabled ? "bg-brand-500" : "bg-gray-200"}`}
      aria-pressed={enabled}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  )
}

// ─── Send confirmation modal ──────────────────────────────────────────────────

function SendConfirmationModal({ action, onClose }: { action: ConfirmAction; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">¿Enviar notificación ahora?</h3>
        <p className="text-sm text-gray-500 mb-6">
          Esto enviará <span className="font-medium text-gray-700">{action.name}</span> a{" "}
          {action.recipients}. Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => { action.onConfirm(); onClose() }}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Sí, enviar ahora
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Notification card (accordion) ───────────────────────────────────────────

interface NotificationCardProps {
  id: string
  name: string
  description: string
  isActive: boolean
  onToggle: (v: boolean) => void
  schedule?: string
  nextSendDate?: string
  editTemplateType?: string
  onEditTemplate?: (type: string) => void
  hasSendNow?: boolean
  onSendNowRequest?: () => void
  sendingNow?: boolean
  savedShow?: boolean
  isOpen: boolean
  onOpen: (id: string | null) => void
  children?: React.ReactNode
}

function NotificationCard({
  id, name, description, isActive, onToggle,
  schedule, nextSendDate,
  editTemplateType, onEditTemplate,
  hasSendNow, onSendNowRequest, sendingNow,
  savedShow, isOpen, onOpen, children,
}: NotificationCardProps) {
  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-shadow ${isOpen ? "border-brand-200 shadow-sm" : "border-gray-200"}`}>
      {/* Collapsed header */}
      <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-gray-50 transition-colors">
        {/* Toggle — outside the expand button to avoid nesting */}
        <div className="flex-shrink-0">
          <Toggle enabled={isActive} onChange={onToggle} />
        </div>

        {/* Expand/collapse area */}
        <button
          type="button"
          onClick={() => onOpen(isOpen ? null : id)}
          className="flex-1 flex items-center gap-2 text-left min-w-0"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 leading-snug">{name}</span>
              <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${isActive ? "bg-green-500" : "bg-gray-300"}`} />
              {savedShow && (
                <span className="text-xs font-medium text-brand-600">✓ Guardado</span>
              )}
            </div>
            {(schedule || nextSendDate) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {schedule}
                {nextSendDate && <span className="ml-1">· Próximo envío: {nextSendDate}</span>}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <span className="text-xs font-medium text-gray-400 hidden sm:inline">
              {isOpen ? "Cerrar" : "Configurar"}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            >
              <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </button>
      </div>

      {/* Expanded content */}
      {isOpen && (
        <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-gray-100">
          <p className="text-sm text-gray-500 mb-4">{description}</p>

          {children}

          {/* Footer actions */}
          {(editTemplateType || hasSendNow) && (
            <div className="flex items-center gap-3 flex-wrap mt-4 pt-4 border-t border-gray-50">
              {editTemplateType && onEditTemplate && (
                <button
                  type="button"
                  onClick={() => onEditTemplate(editTemplateType)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 hover:border-brand-400 hover:text-brand-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M13.488 2.513a1.75 1.75 0 00-2.475 0L6.75 6.774a2.75 2.75 0 00-.596.892l-.83 2.322a.75.75 0 00.95.95l2.322-.83a2.75 2.75 0 00.892-.596l4.26-4.263a1.75 1.75 0 000-2.476zM4.75 8.75A.75.75 0 004 9.5v1a.75.75 0 00.75.75h1a.75.75 0 000-1.5H5v-.25a.75.75 0 00-.75-.75z" />
                  </svg>
                  Editar plantilla
                </button>
              )}

              {hasSendNow && onSendNowRequest && (
                <button
                  type="button"
                  onClick={onSendNowRequest}
                  disabled={sendingNow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sendingNow ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Enviando…
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M2.87 2.298a.75.75 0 00-.812 1.021L3.39 6.624a1 1 0 00.928.626H8.25a.75.75 0 010 1.5H4.318a1 1 0 00-.927.626l-1.333 3.305a.75.75 0 00.811 1.021l11.5-4.25a.75.75 0 000-1.396l-11.5-4.25z" />
                      </svg>
                      Enviar ahora
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Notification group ───────────────────────────────────────────────────────

function NotificationGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
          {label}
        </span>
        <div className="flex-1 border-t border-gray-100" />
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

// ─── Summary bar ──────────────────────────────────────────────────────────────

function NotificationsSummaryBar({ settings }: { settings: Settings }) {
  const activeCount = NOTIFICATION_META.filter(({ key }) => settings[key] as boolean).length
  const total = NOTIFICATION_META.length

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
        {activeCount} de {total} notificaciones activas
      </span>
      <div className="flex items-center gap-3 flex-wrap">
        {NOTIFICATION_META.map(({ key, label }) => {
          const active = settings[key] as boolean
          return (
            <div key={key} className="flex items-center gap-1.5" title={label}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "bg-green-500" : "bg-gray-300"}`} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Deadline config block ────────────────────────────────────────────────────

function SelectField({
  value,
  onChange,
  options,
}: {
  value: number
  onChange: (v: number) => void
  options: { value: number; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function DeadlineConfigBlock({
  deadlineDay,
  deadlineHour,
  savedShow,
  onSave,
}: {
  deadlineDay: number
  deadlineHour: number
  savedShow: boolean
  onSave: (patch: { deadlineDay?: number; deadlineHour?: number }) => void
}) {
  return (
    <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Configuración de deadline semanal</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Define el día y hora límite que se muestra en los recordatorios de check-in.
          </p>
        </div>
        {savedShow && (
          <span className="text-xs font-medium text-brand-600 flex-shrink-0">✓ Guardado</span>
        )}
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 w-24 flex-shrink-0">Día límite</span>
          <SelectField
            value={deadlineDay}
            onChange={(v) => onSave({ deadlineDay: v })}
            options={DAYS}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 w-24 flex-shrink-0">Hora límite</span>
          <SelectField
            value={deadlineHour}
            onChange={(v) => onSave({ deadlineHour: v })}
            options={HOURS}
          />
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Esta hora se muestra en el email de recordatorio urgente. Para cambiar cuándo se envía el recordatorio, actualiza el cron job.
      </p>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function NotificationSettingsForm({
  initial,
  initialTemplates,
}: {
  initial: Settings
  initialTemplates: EmailTemplateData[]
}) {
  const [settings, setSettings] = useState<Settings>(initial)
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({})
  const [templates, setTemplates] = useState<EmailTemplateData[]>(initialTemplates)
  const [editingType, setEditingType] = useState<string | null>(null)
  const [openCard, setOpenCard] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const [sendingReminders, setSendingReminders] = useState(false)
  const [sendingDigest, setSendingDigest] = useState(false)
  const [sendingSecondReminder, setSendingSecondReminder] = useState(false)
  const [sendingComplianceReport, setSendingComplianceReport] = useState(false)

  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [, startTransition] = useTransition()

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message: string, primary = false) => {
    const id = String(Date.now())
    setToasts((prev) => [...prev, { id, message, primary }])
  }, [])

  function showSaved(key: string) {
    setSavedKeys((prev) => ({ ...prev, [key]: true }))
    setTimeout(() => setSavedKeys((prev) => ({ ...prev, [key]: false })), 2000)
  }

  function save(patch: Partial<Settings>, savedKey: string) {
    setSettings((prev) => ({ ...prev, ...patch }))
    startTransition(async () => {
      await updateNotificationSettings(patch)
      showSaved(savedKey)
    })
  }

  async function doSendReminders() {
    setSendingReminders(true)
    try {
      const result = await triggerWeeklyReminders()
      if (result.success) {
        const d = result.data as { sent?: number; skipped?: boolean }
        if (d.skipped) {
          addToast("⚠️ Los recordatorios están desactivados en la configuración.")
        } else {
          addToast(`✅ Recordatorios enviados (${d.sent ?? 0} destinatarios).`, true)
        }
      } else {
        addToast(`❌ Error: ${result.error}`)
      }
    } finally {
      setSendingReminders(false)
    }
  }

  async function doSendDigest() {
    setSendingDigest(true)
    try {
      const result = await triggerWeeklyDigest()
      if (result.success) {
        const d = result.data as { sent?: number; skipped?: boolean }
        if (d.skipped) {
          addToast("⚠️ El digest está desactivado en la configuración.")
        } else {
          addToast(`✅ Digest enviado (${d.sent ?? 0} destinatarios).`, true)
        }
      } else {
        addToast(`❌ Error: ${result.error}`)
      }
    } finally {
      setSendingDigest(false)
    }
  }

  async function doSendSecondReminder() {
    setSendingSecondReminder(true)
    try {
      const result = await triggerSecondReminder()
      if (result.success) {
        const d = result.data as { sent?: number; skipped?: boolean }
        if (d.skipped) {
          addToast("⚠️ El recordatorio urgente está desactivado en la configuración.")
        } else {
          addToast(`✅ Recordatorio urgente enviado (${d.sent ?? 0} destinatarios).`, true)
        }
      } else {
        addToast(`❌ Error: ${result.error}`)
      }
    } finally {
      setSendingSecondReminder(false)
    }
  }

  async function doSendComplianceReport() {
    setSendingComplianceReport(true)
    try {
      const result = await triggerComplianceReport()
      if (result.success) {
        const d = result.data as { sent?: number; skipped?: boolean; complianceRate?: number }
        if (d.skipped) {
          addToast("⚠️ El reporte de cumplimiento está desactivado en la configuración.")
        } else {
          addToast(`✅ Reporte enviado (${d.sent ?? 0} admins, ${d.complianceRate ?? 0}% cumplimiento).`, true)
        }
      } else {
        addToast(`❌ Error: ${result.error}`)
      }
    } finally {
      setSendingComplianceReport(false)
    }
  }

  function templateFor(type: string): EmailTemplateData {
    return templates.find((t) => t.type === type) ?? { id: type, type, subject: "", bodyHtml: "", isCustom: false }
  }

  function handleTemplateSaved(updated: Pick<EmailTemplateData, "type" | "subject" | "bodyHtml" | "isCustom">) {
    setTemplates((prev) =>
      prev.some((t) => t.type === updated.type)
        ? prev.map((t) => t.type === updated.type ? { ...t, ...updated } : t)
        : [...prev, { id: updated.type, ...updated }]
    )
  }

  function requestSendNow(name: string, recipients: string, onConfirm: () => void) {
    setConfirmAction({ name, recipients, onConfirm })
  }

  // Precomputed next send dates
  const nextWeeklyDate = getNextSendDate(1, 8)   // Monday 8am
  const nextDigestDate = getNextSendDate(1, 7)   // Monday 7am
  const nextUrgentDate = getNextSendDate(2, 18)  // Tuesday 6pm
  const nextComplianceDate = getNextSendDate(3, 9) // Wednesday 9am

  return (
    <div className="space-y-5">
      {/* Status overview */}
      <NotificationsSummaryBar settings={settings} />

      {/* Global deadline config */}
      <DeadlineConfigBlock
        deadlineDay={settings.deadlineDay}
        deadlineHour={settings.deadlineHour}
        savedShow={!!savedKeys["deadline-config"]}
        onSave={(patch) => save(patch, "deadline-config")}
      />

      {/* Recurring notifications */}
      <NotificationGroup label="Notificaciones recurrentes">
        <NotificationCard
          id="weekly"
          name="Recordatorios de avance semanal"
          description="Envía un recordatorio a los miembros de equipo que no han registrado avance en 7 días."
          isActive={settings.weeklyReminderEnabled}
          onToggle={(v) => save({ weeklyReminderEnabled: v }, "weekly")}
          schedule="Lunes 8:00 am (hora Ciudad de México)"
          nextSendDate={nextWeeklyDate}
          editTemplateType="WEEKLY_REMINDER"
          onEditTemplate={setEditingType}
          hasSendNow
          onSendNowRequest={() =>
            requestSendNow(
              "Recordatorios de avance semanal",
              "los miembros de equipo que no han registrado avance",
              doSendReminders
            )
          }
          sendingNow={sendingReminders}
          savedShow={!!savedKeys["weekly"]}
          isOpen={openCard === "weekly"}
          onOpen={setOpenCard}
        />

        <NotificationCard
          id="digest"
          name="Digest ejecutivo semanal"
          description="Resume el progreso de todos los equipos y lo envía a ejecutivos y administradores."
          isActive={settings.weeklyDigestEnabled}
          onToggle={(v) => save({ weeklyDigestEnabled: v }, "digest")}
          schedule="Lunes 7:00 am (hora Ciudad de México)"
          nextSendDate={nextDigestDate}
          editTemplateType="WEEKLY_DIGEST"
          onEditTemplate={setEditingType}
          hasSendNow
          onSendNowRequest={() =>
            requestSendNow(
              "Digest ejecutivo semanal",
              "ejecutivos y administradores",
              doSendDigest
            )
          }
          sendingNow={sendingDigest}
          savedShow={!!savedKeys["digest"]}
          isOpen={openCard === "digest"}
          onOpen={setOpenCard}
        />

        <NotificationCard
          id="urgent"
          name="Recordatorio urgente (día del deadline)"
          description="Se envía el día del deadline de check-in semanal a quienes aún no han registrado avance."
          isActive={settings.secondReminderEnabled}
          onToggle={(v) => save({ secondReminderEnabled: v }, "urgent")}
          schedule="Martes 6:00 pm (hora Ciudad de México)"
          nextSendDate={nextUrgentDate}
          editTemplateType="URGENT_REMINDER"
          onEditTemplate={setEditingType}
          hasSendNow
          onSendNowRequest={() =>
            requestSendNow(
              "Recordatorio urgente",
              "los miembros que no han hecho check-in esta semana",
              doSendSecondReminder
            )
          }
          sendingNow={sendingSecondReminder}
          savedShow={!!savedKeys["urgent"]}
          isOpen={openCard === "urgent"}
          onOpen={setOpenCard}
        />

        <NotificationCard
          id="compliance"
          name="Reporte de cumplimiento"
          description="Reporte semanal de cumplimiento de check-ins enviado a los administradores."
          isActive={settings.complianceReportEnabled}
          onToggle={(v) => save({ complianceReportEnabled: v }, "compliance")}
          schedule="Miércoles 9:00 am (hora Ciudad de México)"
          nextSendDate={nextComplianceDate}
          editTemplateType="COMPLIANCE_REPORT"
          onEditTemplate={setEditingType}
          hasSendNow
          onSendNowRequest={() =>
            requestSendNow(
              "Reporte de cumplimiento",
              "los administradores del sistema",
              doSendComplianceReport
            )
          }
          sendingNow={sendingComplianceReport}
          savedShow={!!savedKeys["compliance"]}
          isOpen={openCard === "compliance"}
          onOpen={setOpenCard}
        />
      </NotificationGroup>

      {/* Event-based notifications */}
      <NotificationGroup label="Notificaciones por evento">
        <NotificationCard
          id="deadline"
          name="Alertas de vencimiento de ORCs"
          description="Notifica al equipo cuando un ORC está próximo a su fecha límite."
          isActive={settings.deadlineReminderEnabled}
          onToggle={(v) => save({ deadlineReminderEnabled: v }, "deadline")}
          editTemplateType="DEADLINE_REMINDER"
          onEditTemplate={setEditingType}
          savedShow={!!savedKeys["deadline"]}
          isOpen={openCard === "deadline"}
          onOpen={setOpenCard}
        >
          <div className="mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Enviar alerta con anticipación de:
            </p>
            <div className="flex gap-2 flex-wrap">
              {DEADLINE_DAYS_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={!settings.deadlineReminderEnabled}
                  onClick={() => save({ deadlineReminderDays: d }, "deadline")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    settings.deadlineReminderDays === d
                      ? "bg-brand-500 text-white border-brand-500"
                      : "bg-white text-gray-600 border-gray-300 hover:border-brand-400 hover:text-brand-600"
                  }`}
                >
                  {d} días
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Se enviará {settings.deadlineReminderDays} días antes de la fecha límite del ORC.
            </p>
          </div>
        </NotificationCard>

        <NotificationCard
          id="welcome"
          name="Emails de bienvenida"
          description="Envía un email de bienvenida cuando se invita a un nuevo usuario a la plataforma."
          isActive={settings.welcomeEmailEnabled}
          onToggle={(v) => save({ welcomeEmailEnabled: v }, "welcome")}
          editTemplateType="WELCOME"
          onEditTemplate={setEditingType}
          savedShow={!!savedKeys["welcome"]}
          isOpen={openCard === "welcome"}
          onOpen={setOpenCard}
        />
      </NotificationGroup>

      <ToastList toasts={toasts} onRemove={removeToast} />

      {confirmAction && (
        <SendConfirmationModal
          action={confirmAction}
          onClose={() => setConfirmAction(null)}
        />
      )}

      {editingType && (
        <EditorModal
          template={templateFor(editingType)}
          onClose={() => setEditingType(null)}
          onSaved={handleTemplateSaved}
        />
      )}
    </div>
  )
}
