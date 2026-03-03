// ─── Traffic light thresholds ─────────────────────────────────────────────────
// 70%+  → green  (En seguimiento)
// 60–69% → amber (En riesgo)
// <60%  → red   (Retrasado)

export type TrafficLight = "ON_TRACK" | "AT_RISK" | "OFF_TRACK"
export type OKRStatus    = "on_track" | "at_risk" | "off_track"

export function progressToTrafficLight(progress: number): TrafficLight {
  if (progress >= 70) return "ON_TRACK"
  if (progress >= 60) return "AT_RISK"
  return "OFF_TRACK"
}

export function progressToOKRStatus(progress: number): OKRStatus {
  if (progress >= 70) return "on_track"
  if (progress >= 60) return "at_risk"
  return "off_track"
}

export function calcKRProgress(
  type: string,
  currentValue: number,
  targetValue: number,
  startValue?: number | null
): number {
  if (type === "BOOLEAN") return currentValue > 0 ? 100 : 0
  if (startValue != null && targetValue !== startValue) {
    return Math.min(100, Math.max(0, Math.round(
      ((currentValue - startValue) / (targetValue - startValue)) * 100
    )))
  }
  return targetValue > 0
    ? Math.min(100, Math.round((currentValue / targetValue) * 100))
    : 0
}

export function avgProgress(progresses: number[]): number {
  if (progresses.length === 0) return 0
  return Math.round(progresses.reduce((s, p) => s + p, 0) / progresses.length)
}
