/**
 * Check-in deadline utilities.
 *
 * Convention: all "hours" stored in DB (deadlineHour, secondReminderHour, etc.)
 * are in CST (UTC-6, Mexico City Standard Time). All Date objects from Prisma
 * are real UTC timestamps. We convert to CST-space for display/comparison.
 */

export const CST_OFFSET_MS = 6 * 60 * 60 * 1000 // UTC-6

/** Shift a real UTC Date into CST-space so getUTC* methods return CST values. */
export function toCST(utcDate: Date): Date {
  return new Date(utcDate.getTime() - CST_OFFSET_MS)
}

/**
 * Monday 00:00 of the current week in CST-space.
 * Pass a CST-space Date (from toCST()) as input.
 */
export function getWeekStartCST(cstDate: Date): Date {
  const dow = cstDate.getUTCDay() // 0=Sun, 1=Mon, …, 6=Sat
  const daysBack = dow === 0 ? 6 : dow - 1
  const d = new Date(cstDate)
  d.setUTCDate(cstDate.getUTCDate() - daysBack)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/**
 * Monday 00:00 CST expressed as a real UTC timestamp.
 * Use this for WHERE clauses on `createdAt` fields stored in real UTC.
 */
export function getWeekStartUTC(cstDate: Date): Date {
  return new Date(getWeekStartCST(cstDate).getTime() + CST_OFFSET_MS)
}

// ─── Status computation ───────────────────────────────────────────────────────

export type CheckinDeadlineStatus =
  | "submitted"   // ✓ green — team already submitted this week
  | "approaching" // ⚠ amber — deadline day, past the second-reminder hour
  | "overdue"     // ✗ red — deadline has passed without a submission
  | "upcoming"    // ℹ gray — normal state, nothing urgent

export interface DeadlineSettings {
  deadlineDay: number        // 1=Mon, 2=Tue, …, 5=Fri
  deadlineHour: number       // 0–23 (CST)
  secondReminderHour: number // 0–23 (CST)
}

/**
 * Computes the deadline status for a single team.
 *
 * @param utcNow          Current time in real UTC (typically `new Date()`)
 * @param lastCheckinUTC  Most recent check-in for this team from the DB (real UTC), or null
 * @param settings        Deadline configuration from NotificationSettings
 */
export function computeDeadlineStatus(
  utcNow: Date,
  lastCheckinUTC: Date | null,
  settings: DeadlineSettings
): CheckinDeadlineStatus {
  const cstNow = toCST(utcNow)
  const weekStartCST = getWeekStartCST(cstNow)

  // Monday 00:00 CST as real UTC — used to compare against DB timestamps
  const weekStartUTC = new Date(weekStartCST.getTime() + CST_OFFSET_MS)

  // Deadline: deadlineDay days after Monday, at deadlineHour (CST-space)
  const deadlineCST = new Date(weekStartCST)
  deadlineCST.setUTCDate(weekStartCST.getUTCDate() + settings.deadlineDay - 1)
  deadlineCST.setUTCHours(settings.deadlineHour, 0, 0, 0)

  if (lastCheckinUTC && lastCheckinUTC >= weekStartUTC) return "submitted"
  if (cstNow >= deadlineCST) return "overdue"

  // "approaching" = today is the deadline day AND we're past the 2nd-reminder hour
  const todayDOW = cstNow.getUTCDay() // 1=Mon, 2=Tue, etc. (matches deadlineDay 1–5)
  if (todayDOW === settings.deadlineDay && cstNow.getUTCHours() >= settings.secondReminderHour) {
    return "approaching"
  }

  return "upcoming"
}

// ─── Display helpers ──────────────────────────────────────────────────────────

const DAYS_ES: Record<number, string> = {
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
}

function formatHour(h: number): string {
  const period = h >= 12 ? "pm" : "am"
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display}${period}`
}

export interface DeadlineBadgeConfig {
  label: string
  className: string     // Tailwind classes for the badge wrapper + text + border
  dotClassName: string  // Tailwind class for the dot
}

export function getDeadlineBadgeConfig(
  status: CheckinDeadlineStatus,
  deadlineDay: number,
  deadlineHour: number
): DeadlineBadgeConfig {
  const dayName = DAYS_ES[deadlineDay] ?? "martes"
  const hourLabel = formatHour(deadlineHour)

  switch (status) {
    case "submitted":
      return {
        label: "Check-in enviado esta semana ✓",
        className: "bg-brand-50 text-brand-700 border-brand-200",
        dotClassName: "bg-brand-500",
      }
    case "approaching":
      return {
        label: `Check-in vence hoy a las ${hourLabel}`,
        className: "bg-amber-50 text-amber-700 border-amber-200",
        dotClassName: "bg-amber-400",
      }
    case "overdue":
      return {
        label: "Check-in no enviado esta semana",
        className: "bg-red-50 text-red-600 border-red-200",
        dotClassName: "bg-red-400",
      }
    case "upcoming":
      return {
        label: `Próximo check-in: ${dayName} ${hourLabel}`,
        className: "bg-gray-50 text-gray-500 border-gray-200",
        dotClassName: "bg-gray-300",
      }
  }
}
