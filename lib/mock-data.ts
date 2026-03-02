// ─── Types ────────────────────────────────────────────────────────────────────

export type OKRStatus = "on_track" | "at_risk" | "off_track"

export interface KeyResult {
  id: string
  number: number   // 1-based index within the objective
  title: string
  progress: number // 0–100, derived from currentValue / targetValue
  type: "PERCENTAGE" | "NUMBER" | "CURRENCY" | "BOOLEAN"
  currentValue: number
  targetValue: number
  unit: string | null
  trackingStatus: "ON_TRACK" | "AT_RISK" | "OFF_TRACK"
  description: string | null
}

export interface Objective {
  id: string
  number: number   // 1-based sequential position within the team
  title: string
  progress: number
  status: OKRStatus
  keyResults: KeyResult[]
}

export interface TeamData {
  id: string
  slug: string
  name: string
  lead: string
  objectives: Objective[]
}
