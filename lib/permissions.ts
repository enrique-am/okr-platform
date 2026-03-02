import type { Role } from "@prisma/client"

export interface PermissionUser {
  id: string
  role: Role
  teamId?: string | null
}

/**
 * ADMIN and LEAD can create objectives.
 * LEAD may only create for their own team (enforced separately by checking input.teamId).
 */
export function canCreateObjective(user: PermissionUser): boolean {
  return user.role === "ADMIN" || user.role === "LEAD"
}

/**
 * Can the user edit an objective that belongs to `objectiveTeamId`?
 * ADMIN: always yes.
 * LEAD: only if objectiveTeamId matches their own teamId.
 * EXECUTIVE / MEMBER: no.
 */
export function canEditObjective(
  user: PermissionUser,
  objectiveTeamId: string | null | undefined
): boolean {
  if (user.role === "ADMIN") return true
  if (user.role === "LEAD") {
    return !!user.teamId && user.teamId === objectiveTeamId
  }
  return false
}

/**
 * Can the user submit a check-in for a team?
 * ADMIN: always yes.
 * LEAD and MEMBER: only for their own team.
 * EXECUTIVE: no.
 */
export function canSubmitCheckin(
  user: PermissionUser,
  teamId: string | null | undefined
): boolean {
  if (user.role === "ADMIN") return true
  if (user.role === "LEAD" || user.role === "MEMBER") {
    return !!user.teamId && user.teamId === teamId
  }
  return false
}
