"use client"

import { useState, useTransition, useCallback } from "react"
import {
  updateNotificationSettings,
  triggerWeeklyReminders,
  triggerWeeklyDigest,
} from "./actions"
import { ToastList, ToastItem } from "@/components/ui/toast"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Settings {
  weeklyReminderEnabled: boolean
  weeklyReminderDay: number
  weeklyReminderHour: number
  deadlineReminderEnabled: boolean
  deadlineReminderDays: number
  weeklyDigestEnabled: boolean
  weeklyDigestDay: number
  weeklyDigestHour: number
  welcomeEmailEnabled: boolean
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

export function NotificationSettingsForm({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState<Settings>(initial)
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({})
  const [sendingReminders, setSendingReminders] = useState(false)
  const [sendingDigest, setSendingDigest] = useState(false)
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

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">

        {/* ── Recordatorios de avance semanal ── */}
        <SectionCard>
          <div className="flex items-center justify-between mb-1">
            <SectionTitle>Recordatorios de avance semanal</SectionTitle>
            <SavedIndicator show={!!savedKeys["weekly"]} />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Envía un recordatorio a los miembros de equipo que no han registrado avance en 7 días.
          </p>

          <ToggleRow
            label="Activado"
            enabled={settings.weeklyReminderEnabled}
            onChange={(v) => save({ weeklyReminderEnabled: v }, "weekly")}
          />

          <FieldRow label="Día de envío">
            <SelectField
              value={settings.weeklyReminderDay}
              onChange={(v) => save({ weeklyReminderDay: v }, "weekly")}
              options={DAYS}
              disabled={!settings.weeklyReminderEnabled}
            />
          </FieldRow>

          <FieldRow label="Hora de envío">
            <SelectField
              value={settings.weeklyReminderHour}
              onChange={(v) => save({ weeklyReminderHour: v }, "weekly")}
              options={HOURS}
              disabled={!settings.weeklyReminderEnabled}
            />
          </FieldRow>

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
            <SavedIndicator show={!!savedKeys["deadline"]} />
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
            <SavedIndicator show={!!savedKeys["digest"]} />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Resume el progreso de todos los equipos y lo envía a ejecutivos y administradores.
          </p>

          <ToggleRow
            label="Activado"
            enabled={settings.weeklyDigestEnabled}
            onChange={(v) => save({ weeklyDigestEnabled: v }, "digest")}
          />

          <FieldRow label="Día de envío">
            <SelectField
              value={settings.weeklyDigestDay}
              onChange={(v) => save({ weeklyDigestDay: v }, "digest")}
              options={DAYS}
              disabled={!settings.weeklyDigestEnabled}
            />
          </FieldRow>

          <FieldRow label="Hora de envío">
            <SelectField
              value={settings.weeklyDigestHour}
              onChange={(v) => save({ weeklyDigestHour: v }, "digest")}
              options={HOURS}
              disabled={!settings.weeklyDigestEnabled}
            />
          </FieldRow>

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

        {/* ── Emails de bienvenida ── */}
        <SectionCard>
          <div className="flex items-center justify-between mb-1">
            <SectionTitle>Emails de bienvenida</SectionTitle>
            <SavedIndicator show={!!savedKeys["welcome"]} />
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
    </>
  )
}
