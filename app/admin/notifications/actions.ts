"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
