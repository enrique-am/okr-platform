"use client"

import { useState, useTransition, useCallback } from "react"
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

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
]

const HOURS = Array.from({ length: 17 }, (_, i) => {
  const h = i + 6 // 6am to 10pm
  const ampm = h < 12 ? "am" : h === 12 ? "pm" : "pm"
  const display = h <= 12 ? h : h - 12
  return { value: h, label: `${display}:00 ${ampm}` }
})

const DEADLINE_DAYS_OPTIONS = [3, 5, 7, 14]

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-5">
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-gray-900 mb-4">{children}</h2>
}

function ToggleRow({
  label,
  enabled,
  onChange,
}: {
  label: string
  enabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
          enabled ? "bg-brand-500" : "bg-gray-200"
        }`}
        aria-pressed={enabled}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  )
}

function FieldRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-sm text-gray-600 w-32 flex-shrink-0">{label}</span>
      {children}
    </div>
  )
}

function SelectField({
  value,
  onChange,
  options,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  options: { value: number; label: string }[]
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function SavedIndicator({ show }: { show: boolean }) {
  return (
    <span
      className={`text-xs font-medium text-brand-600 transition-opacity duration-500 ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      ✓ Guardado
    </span>
  )
}

function FixedScheduleNote({ label }: { label: string }) {
  return (
    <p className="text-sm text-gray-400 mb-4">
      Envío fijo: <span className="font-medium">{label}</span>
    </p>
  )
}

function SendNowButton({
  onClick,
  loading,
}: {
  onClick: () => void
  loading: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-brand-500 text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Enviando…
        </>
      ) : (
        "Enviar ahora"
      )}
    </button>
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

  async function handleSendReminders() {
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

  async function handleSendDigest() {
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

  async function handleSendSecondReminder() {
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

  async function handleSendComplianceReport() {
    setSendingComplianceReport(true)
    try {
      const result = await triggerComplianceReport()
      if (result.success) {
        const d = result.data as { sent?: number; skipped?: boolean; complianceRate?: number }
        if (d.skipped) {
          addToast("⚠️ El reporte de cumplimiento está desactivado en la configuración.")
        } else {
          addToast(`✅ Reporte de cumplimiento enviado (${d.sent ?? 0} admins, ${d.complianceRate ?? 0}% cumplimiento).`, true)
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

  function EditBtn({ type }: { type: string }) {
    return (
      <button
        type="button"
        onClick={() => setEditingType(type)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 hover:border-brand-400 hover:text-brand-700 transition-colors flex-shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M13.488 2.513a1.75 1.75 0 00-2.475 0L6.75 6.774a2.75 2.75 0 00-.596.892l-.83 2.322a.75.75 0 00.95.95l2.322-.83a2.75 2.75 0 00.892-.596l4.26-4.263a1.75 1.75 0 000-2.476zM4.75 8.75A.75.75 0 004 9.5v1a.75.75 0 00.75.75h1a.75.75 0 000-1.5H5v-.25a.75.75 0 00-.75-.75z" />
        </svg>
        Editar plantilla
      </button>
    )
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">

        {/* ── Recordatorios de avance semanal ── */}
        <SectionCard>
          <div className="flex items-center justify-between mb-1">
            <SectionTitle>Recordatorios de avance semanal</SectionTitle>
            <div className="flex items-center gap-3">
              <SavedIndicator show={!!savedKeys["weekly"]} />
              <EditBtn type="WEEKLY_REMINDER" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Envía un recordatorio a los miembros de equipo que no han registrado avance en 7 días.
          </p>

          <ToggleRow
            label="Activado"
            enabled={settings.weeklyReminderEnabled}
            onChange={(v) => save({ weeklyReminderEnabled: v }, "weekly")}
          />

          <FixedScheduleNote label="lunes 8:00 am (hora Ciudad de México)" />

          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1.5">
              Mensaje personalizado <span className="text-gray-400">(opcional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Agrega un mensaje adicional al recordatorio…"
              value={settings.customReminderMessage ?? ""}
              disabled={!settings.weeklyReminderEnabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  customReminderMessage: e.target.value || null,
                }))
              }
              onBlur={(e) =>
                save({ customReminderMessage: e.target.value || null }, "weekly")
              }
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>

          <SendNowButton onClick={handleSendReminders} loading={sendingReminders} />
        </SectionCard>

        {/* ── Alertas de vencimiento ── */}
        <SectionCard>
          <div className="flex items-center justify-between mb-1">
            <SectionTitle>Alertas de vencimiento de ORCs</SectionTitle>
            <div className="flex items-center gap-3">
              <SavedIndicator show={!!savedKeys["deadline"]} />
              <EditBtn type="DEADLINE_REMINDER" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Notifica al equipo cuando un ORC está próximo a su fecha límite.
          </p>

          <ToggleRow
            label="Activado"
            enabled={settings.deadlineReminderEnabled}
            onChange={(v) => save({ deadlineReminderEnabled: v }, "deadline")}
          />

          <FieldRow label="Días de anticipación">
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
                      : "bg-white text-gray-700 border-gray-300 hover:border-brand-400"
                  }`}
                >
                  {d} días
                </button>
              ))}
            </div>
          </FieldRow>
        </SectionCard>

        {/* ── Digest ejecutivo semanal ── */}
        <SectionCard>
          <div className="flex items-center justify-between mb-1">
            <SectionTitle>Digest ejecutivo semanal</SectionTitle>
            <div className="flex items-center gap-3">
              <SavedIndicator show={!!savedKeys["digest"]} />
              <EditBtn type="WEEKLY_DIGEST" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Resume el progreso de todos los equipos y lo envía a ejecutivos y administradores.
          </p>

          <ToggleRow
            label="Activado"
            enabled={settings.weeklyDigestEnabled}
            onChange={(v) => save({ weeklyDigestEnabled: v }, "digest")}
          />

          <FixedScheduleNote label="lunes 7:00 am (hora Ciudad de México)" />

          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1.5">
              Mensaje personalizado <span className="text-gray-400">(opcional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Agrega un mensaje adicional al digest ejecutivo…"
              value={settings.customDigestMessage ?? ""}
              disabled={!settings.weeklyDigestEnabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  customDigestMessage: e.target.value || null,
                }))
              }
              onBlur={(e) =>
                save({ customDigestMessage: e.target.value || null }, "digest")
              }
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>

          <SendNowButton onClick={handleSendDigest} loading={sendingDigest} />
        </SectionCard>

        {/* ── Deadline de check-in semanal ── */}
        <SectionCard>
          <div className="flex items-center justify-between mb-1">
            <SectionTitle>Deadline de check-in semanal</SectionTitle>
            <SavedIndicator show={!!savedKeys["checkin-deadline"]} />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Define la hora límite semanal que se muestra en los emails de recordatorio urgente, activa o desactiva cada tipo de notificación, y envía el reporte de cumplimiento a los administradores.
          </p>

          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Hora límite semanal</p>
            <FieldRow label="Día límite">
              <SelectField
                value={settings.deadlineDay}
                onChange={(v) => save({ deadlineDay: v }, "checkin-deadline")}
                options={DAYS}
              />
            </FieldRow>
            <div className="mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-32 flex-shrink-0">Hora límite</span>
                <SelectField
                  value={settings.deadlineHour}
                  onChange={(v) => save({ deadlineHour: v }, "checkin-deadline")}
                  options={HOURS}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5 ml-[8.75rem]">
                Esta hora se muestra en el email de recordatorio urgente. Para cambiar cuándo se envía el recordatorio, actualiza el cron job.
              </p>
            </div>
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recordatorio urgente (día del deadline)</p>
              <EditBtn type="URGENT_REMINDER" />
            </div>
            <ToggleRow
              label="Activado"
              enabled={settings.secondReminderEnabled}
              onChange={(v) => save({ secondReminderEnabled: v }, "checkin-deadline")}
            />
            <FixedScheduleNote label="martes 6:00 pm (hora Ciudad de México)" />
            <SendNowButton onClick={handleSendSecondReminder} loading={sendingSecondReminder} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reporte de cumplimiento (miércoles para admins)</p>
              <EditBtn type="COMPLIANCE_REPORT" />
            </div>
            <ToggleRow
              label="Activado"
              enabled={settings.complianceReportEnabled}
              onChange={(v) => save({ complianceReportEnabled: v }, "checkin-deadline")}
            />
            <FixedScheduleNote label="miércoles 9:00 am (hora Ciudad de México)" />
            <SendNowButton onClick={handleSendComplianceReport} loading={sendingComplianceReport} />
          </div>
        </SectionCard>

        {/* ── Emails de bienvenida ── */}
        <SectionCard>
          <div className="flex items-center justify-between mb-1">
            <SectionTitle>Emails de bienvenida</SectionTitle>
            <div className="flex items-center gap-3">
              <SavedIndicator show={!!savedKeys["welcome"]} />
              <EditBtn type="WELCOME" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Envía un email de bienvenida cuando se invita a un nuevo usuario a la plataforma.
          </p>

          <ToggleRow
            label="Activado"
            enabled={settings.welcomeEmailEnabled}
            onChange={(v) => save({ welcomeEmailEnabled: v }, "welcome")}
          />
        </SectionCard>

      </div>

      <ToastList toasts={toasts} onRemove={removeToast} />

      {editingType && (
        <EditorModal
          template={templateFor(editingType)}
          onClose={() => setEditingType(null)}
          onSaved={handleTemplateSaved}
        />
      )}
    </>
  )
}
