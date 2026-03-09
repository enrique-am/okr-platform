import {
  type CheckinDeadlineStatus,
  getDeadlineBadgeConfig,
} from "@/lib/checkin-deadline"

interface CheckinDeadlineBadgeProps {
  status: CheckinDeadlineStatus
  deadlineDay: number
  deadlineHour: number
}

export function CheckinDeadlineBadge({
  status,
  deadlineDay,
  deadlineHour,
}: CheckinDeadlineBadgeProps) {
  const cfg = getDeadlineBadgeConfig(status, deadlineDay, deadlineHour)
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotClassName}`} />
      {cfg.label}
    </span>
  )
}
