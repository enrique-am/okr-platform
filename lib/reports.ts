// ─── Types ────────────────────────────────────────────────────────────────────

export interface KRSummary {
  id: string
  title: string
  type: string
  currentValue: number
  targetValue: number
  startValue: number | null
  unit: string | null
  progress: number
  trackingStatus: string
}

export interface ObjectiveSummary {
  id: string
  title: string
  progress: number
  trackingStatus: string
  keyResults: KRSummary[]
}

export type ProgressStatus = "AHEAD" | "ON_TRACK" | "AT_RISK" | "BEHIND"

export interface TeamProgressSummary {
  teamId: string
  teamName: string
  teamSlug: string
  actualProgress: number
  expectedProgress: number
  delta: number
  status: ProgressStatus
  hasCheckinThisWeek: boolean
  objectives: ObjectiveSummary[]
}

// Raw Prisma-shaped inputs
type RawKR = {
  id: string
  title: string
  type: string
  currentValue: number
  targetValue: number
  startValue: number | null
  unit: string | null
  trackingStatus: string
}

type RawObjective = {
  id: string
  title: string
  trackingStatus: string
  keyResults: RawKR[]
}

type RawCompliance = {
  submittedAt: Date | null
  submittedOnTime: boolean
}

type RawTeam = {
  id: string
  name: string
  slug: string
  objectives: RawObjective[]
  checkInCompliances: RawCompliance[]
}

// ─── Quarter helpers ──────────────────────────────────────────────────────────

export function getQuarterDateRange(date: Date): {
  start: Date
  end: Date
  label: string
} {
  const m = date.getMonth()
  const y = date.getFullYear()
  if (m < 3)
    return {
      start: new Date(y, 0, 1),
      end: new Date(y, 2, 31, 23, 59, 59, 999),
      label: `Q1 ${y}`,
    }
  if (m < 6)
    return {
      start: new Date(y, 3, 1),
      end: new Date(y, 5, 30, 23, 59, 59, 999),
      label: `Q2 ${y}`,
    }
  if (m < 9)
    return {
      start: new Date(y, 6, 1),
      end: new Date(y, 8, 30, 23, 59, 59, 999),
      label: `Q3 ${y}`,
    }
  return {
    start: new Date(y, 9, 1),
    end: new Date(y, 11, 31, 23, 59, 59, 999),
    label: `Q4 ${y}`,
  }
}

/**
 * Returns the expected progress % as of today, capped at 70%.
 * The ambitious ceiling is 100% but the target at end of quarter is 70%.
 * Formula: (% of quarter elapsed) × 70, clamped 0–70.
 * Example: 50% through Q → expected = 35%. End of Q → expected = 70%.
 */
export function getExpectedProgress(
  quarterStart: Date,
  quarterEnd: Date,
  today: Date
): number {
  const total = quarterEnd.getTime() - quarterStart.getTime()
  const elapsed = today.getTime() - quarterStart.getTime()
  return Math.min(70, Math.max(0, (elapsed / total) * 70))
}

// ─── KR progress ─────────────────────────────────────────────────────────────

function krProgress(kr: RawKR): number {
  if (kr.type === "BOOLEAN") return kr.currentValue >= 1 ? 100 : 0
  const start = kr.startValue ?? 0
  const range = kr.targetValue - start
  if (range === 0) return 100
  return Math.min(100, Math.max(0, ((kr.currentValue - start) / range) * 100))
}

// ─── Team summary ─────────────────────────────────────────────────────────────

export function getTeamProgressSummary(
  team: RawTeam,
  expectedProgress: number
): TeamProgressSummary {
  const objectives: ObjectiveSummary[] = team.objectives.map((obj) => {
    const keyResults: KRSummary[] = obj.keyResults.map((kr) => ({
      ...kr,
      progress: krProgress(kr),
    }))
    const objProgress =
      keyResults.length > 0
        ? keyResults.reduce((s, kr) => s + kr.progress, 0) / keyResults.length
        : 0
    return {
      id: obj.id,
      title: obj.title,
      progress: Math.round(objProgress),
      trackingStatus: obj.trackingStatus,
      keyResults,
    }
  })

  const actualProgress =
    objectives.length > 0
      ? Math.round(objectives.reduce((s, o) => s + o.progress, 0) / objectives.length)
      : 0

  const expRounded = Math.round(expectedProgress)
  const delta = actualProgress - expRounded

  let status: ProgressStatus
  if (delta >= 5) status = "AHEAD"
  else if (delta >= -10) status = "ON_TRACK"
  else if (delta >= -20) status = "AT_RISK"
  else status = "BEHIND"

  const hasCheckinThisWeek = team.checkInCompliances.some(
    (c) => c.submittedAt !== null || c.submittedOnTime
  )

  return {
    teamId: team.id,
    teamName: team.name,
    teamSlug: team.slug,
    actualProgress,
    expectedProgress: expRounded,
    delta,
    status,
    hasCheckinThisWeek,
    objectives,
  }
}
