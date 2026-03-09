"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { EmailTemplateType } from "@prisma/client"

// ─── Default email template content ──────────────────────────────────────────
// These are the canonical defaults used for seeding and for "reset to default".

export const TEMPLATE_DEFAULTS: Record<EmailTemplateType, { subject: string; bodyHtml: string }> = {
  WELCOME: {
    subject: "Bienvenido/a a ORC Platform — Grupo AM",
    bodyHtml: `<h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">¡Bienvenido/a a ORC Platform!</h1>
<p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.7;">
  Hola <strong style="color:#111827;">{{nombre}}</strong>, has sido invitado/a a <strong style="color:#111827;">ORC Platform</strong>, la plataforma de seguimiento de Objetivos y Resultados Clave de <strong style="color:#111827;">Grupo AM</strong>.
</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
  <tr>
    <td style="background-color:#f0fdf4;border-radius:10px;padding:16px;border-left:3px solid #72bf44;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Tu equipo</p>
      <p style="margin:0;font-size:15px;font-weight:700;color:#15803d;">{{equipo}}</p>
    </td>
  </tr>
</table>
<div style="text-align:center;margin:28px 0 10px;">
  <a href="{{enlace}}" style="display:inline-block;background-color:#72bf44;color:#ffffff;font-weight:600;font-size:14px;padding:13px 36px;border-radius:10px;text-decoration:none;">Iniciar sesión con Google</a>
</div>
<p style="margin:10px 0 0;font-size:12px;color:#9ca3af;text-align:center;">Usa tu cuenta corporativa de Google Workspace.</p>`,
  },
  WEEKLY_REMINDER: {
    subject: "Recordatorio: registra tu avance semanal — {{equipo}}",
    bodyHtml: `<h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">¡Hola, {{nombre}}! 👋</h1>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
  Esta semana aún no has registrado ningún avance en los ORCs de <strong style="color:#111827;">{{equipo}}</strong>. Tómate un momento para actualizar tu progreso y mantener a todos alineados.
</p>
<div style="text-align:center;margin:24px 0 10px;">
  <a href="{{enlace}}" style="display:inline-block;background-color:#72bf44;color:#ffffff;font-weight:600;font-size:14px;padding:13px 36px;border-radius:10px;text-decoration:none;">Registrar avance</a>
</div>
<p style="margin:10px 0 0;font-size:12px;color:#9ca3af;text-align:center;font-style:italic;">"Los pequeños avances constantes construyen los grandes resultados."</p>`,
  },
  DEADLINE_REMINDER: {
    subject: "ORC por vencer pronto — {{equipo}}",
    bodyHtml: `<h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">¡Hola, {{nombre}}!</h1>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
  Uno de los ORCs de <strong style="color:#111827;">{{equipo}}</strong> está próximo a vencer. Es el momento de hacer el último esfuerzo y cerrar fuerte el periodo.
</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
  <tr>
    <td style="background-color:#fff7ed;border-radius:10px;padding:16px;border-left:3px solid #f59e0b;">
      <p style="margin:0;font-size:13px;font-weight:600;color:#92400e;">Avance actual del ORC: <span style="font-size:18px;color:#b45309;">{{progreso}}</span></p>
    </td>
  </tr>
</table>
<div style="text-align:center;margin:24px 0 10px;">
  <a href="{{enlace}}" style="display:inline-block;background-color:#72bf44;color:#ffffff;font-weight:600;font-size:14px;padding:13px 36px;border-radius:10px;text-decoration:none;">Ver ORC del equipo</a>
</div>
<p style="margin:10px 0 0;font-size:12px;color:#9ca3af;text-align:center;font-style:italic;">¡El esfuerzo final de tu equipo hace la diferencia!</p>`,
  },
  URGENT_REMINDER: {
    subject: "⏰ Tu check-in vence hoy — {{equipo}}",
    bodyHtml: `<div style="text-align:center;margin-bottom:20px;">
  <span style="display:inline-block;background-color:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:8px;padding:6px 16px;font-size:13px;font-weight:700;">⏰ El check-in cierra hoy</span>
</div>
<h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">¡{{nombre}}, no olvides tu check-in!</h1>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
  Tu check-in semanal vence hoy. Regístralo ahora para mantener el seguimiento de los ORCs de <strong style="color:#111827;">{{equipo}}</strong>.
</p>
<div style="text-align:center;margin:0 0 12px;">
  <a href="{{enlace}}" style="display:inline-block;background-color:#72bf44;color:#ffffff;font-weight:700;font-size:15px;padding:14px 40px;border-radius:10px;text-decoration:none;">Registrar avance ahora →</a>
</div>
<p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Solo toma unos minutos. ¡Tu equipo cuenta contigo!</p>`,
  },
  WEEKLY_DIGEST: {
    subject: "Digest Ejecutivo Semanal – Grupo AM",
    bodyHtml: `<h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">Hola, {{nombre}} — Digest Ejecutivo Semanal</h1>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
  Aquí tienes el resumen de progreso de todos los equipos de Grupo AM para esta semana.
</p>
<div style="text-align:center;margin:24px 0 10px;">
  <a href="{{enlace}}" style="display:inline-block;background-color:#72bf44;color:#ffffff;font-weight:600;font-size:14px;padding:13px 36px;border-radius:10px;text-decoration:none;">Ver tablero de empresa</a>
</div>`,
  },
  COMPLIANCE_REPORT: {
    subject: "Reporte de cumplimiento semanal — Grupo AM",
    bodyHtml: `<h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">Hola, {{nombre}} — Reporte de Cumplimiento</h1>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
  Resumen de check-ins semanales de todos los equipos de Grupo AM.
</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
  <tr>
    <td style="background-color:#f9fafb;border-radius:10px;padding:16px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Tasa de cumplimiento</p>
      <p style="margin:0;font-size:36px;font-weight:800;color:#15803d;">{{progreso}}</p>
    </td>
  </tr>
</table>
<div style="text-align:center;margin:24px 0 10px;">
  <a href="{{enlace}}" style="display:inline-block;background-color:#72bf44;color:#ffffff;font-weight:600;font-size:14px;padding:13px 36px;border-radius:10px;text-decoration:none;">Ver panel de administración</a>
</div>`,
  },
}

async function assertAdmin() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "ADMIN") {
    throw new Error("No autorizado")
  }
  return session
}

// ─── Singleton helpers ────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  weeklyReminderEnabled: true,
  weeklyReminderDay: 1,
  weeklyReminderHour: 8,
  deadlineReminderEnabled: true,
  deadlineReminderDays: 7,
  weeklyDigestEnabled: true,
  weeklyDigestDay: 1,
  weeklyDigestHour: 7,
  welcomeEmailEnabled: true,
  secondReminderEnabled: true,
  secondReminderHour: 18,
  deadlineDay: 2,
  deadlineHour: 20,
  complianceReportEnabled: true,
  complianceReportHour: 9,
  customReminderMessage: null as string | null,
  customDigestMessage: null as string | null,
}

export async function getNotificationSettings() {
  const settings = await prisma.notificationSettings.upsert({
    where: { id: 1 },
    create: DEFAULT_SETTINGS,
    update: {},
  })
  return settings
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateNotificationSettings(
  data: Partial<typeof DEFAULT_SETTINGS>
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await assertAdmin()
    await prisma.notificationSettings.upsert({
      where: { id: 1 },
      create: { ...DEFAULT_SETTINGS, ...data, updatedById: session.user.id },
      update: { ...data, updatedById: session.user.id },
    })
    revalidatePath("/admin/notifications")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error desconocido" }
  }
}

// ─── Manual triggers ──────────────────────────────────────────────────────────

async function callCronEndpoint(path: string) {
  await assertAdmin()
  const secret = process.env.CRON_SECRET
  if (!secret) throw new Error("CRON_SECRET no configurado")
  const baseUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  })
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
  return res.json()
}

export async function triggerWeeklyReminders(): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  try {
    const data = await callCronEndpoint("/api/cron/weekly-reminders")
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error al enviar" }
  }
}

export async function triggerDeadlineReminders(): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  try {
    const data = await callCronEndpoint("/api/cron/deadline-reminders")
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error al enviar" }
  }
}

export async function triggerWeeklyDigest(): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  try {
    const data = await callCronEndpoint("/api/cron/weekly-digest")
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error al enviar" }
  }
}

export async function triggerSecondReminder(): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  try {
    const data = await callCronEndpoint("/api/cron/deadline-checkin-reminder")
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error al enviar" }
  }
}

export async function triggerComplianceReport(): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  try {
    const data = await callCronEndpoint("/api/cron/compliance-report")
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error al enviar" }
  }
}

// ─── Email template CRUD ──────────────────────────────────────────────────────

export async function getEmailTemplates() {
  try {
    return await prisma.emailTemplate.findMany({ orderBy: { type: "asc" } })
  } catch {
    return []
  }
}

export async function saveEmailTemplate(
  type: string,
  subject: string,
  bodyHtml: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await assertAdmin()
    await prisma.emailTemplate.upsert({
      where: { type: type as EmailTemplateType },
      create: { type: type as EmailTemplateType, subject, bodyHtml, isCustom: true, updatedById: session.user.id },
      update: { subject, bodyHtml, isCustom: true, updatedById: session.user.id },
    })
    revalidatePath("/admin/notifications")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error desconocido" }
  }
}

export async function resetEmailTemplate(
  type: string
): Promise<{ success: true; subject: string; bodyHtml: string } | { success: false; error: string }> {
  try {
    await assertAdmin()
    const defaults = TEMPLATE_DEFAULTS[type as EmailTemplateType]
    if (!defaults) return { success: false, error: "Tipo de plantilla no válido" }
    await prisma.emailTemplate.upsert({
      where: { type: type as EmailTemplateType },
      create: { type: type as EmailTemplateType, ...defaults, isCustom: false },
      update: { ...defaults, isCustom: false, updatedById: null },
    })
    revalidatePath("/admin/notifications")
    return { success: true, ...defaults }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error desconocido" }
  }
}
