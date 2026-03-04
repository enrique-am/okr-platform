import type { Role } from "@prisma/client"

export interface PermissionUser {
  id: string
  role: Role
  teamIds: string[]
}

/**
 * ADMIN and LEAD can create objectives.
 * LEAD may only create for their own teams (enforced separately by checking input.teamId).
 */
export function canCreateObjective(user: PermissionUser): boolean {
  return user.role === "ADMIN" || user.role === "LEAD"
}

/**
 * Can the user edit an objective that belongs to `objectiveTeamId`?
 * ADMIN: always yes.
 * LEAD: only if objectiveTeamId is one of their teams.
 * EXECUTIVE / MEMBER: no.
 */
export function canEditObjective(
  user: PermissionUser,
  objectiveTeamId: string | null | undefined
): boolean {
  if (user.role === "ADMIN") return true
  if (user.role === "LEAD") {
    return objectiveTeamId != null && user.teamIds.includes(objectiveTeamId)
  }
  return false
}

/**
 * Can the user create or edit a COMPANY-level ORC Empresarial?
 * ADMIN and EXECUTIVE: always yes.
 * LEAD: only if they are the assigned owner of that specific objective.
 * MEMBER: never.
 */
export function canManageCompanyObjective(
  user: PermissionUser,
  objectiveOwnerId?: string | null
): boolean {
  if (user.role === "ADMIN" || user.role === "EXECUTIVE") return true
  if (user.role === "LEAD") {
    return !!objectiveOwnerId && objectiveOwnerId === user.id
  }
  return false
}

/**
 * Can the user submit a check-in for a team?
 * ADMIN: always yes.
 * LEAD and MEMBER: only for their own teams.
 * EXECUTIVE: no.
 */
export function canSubmitCheckin(
  user: PermissionUser,
  teamId: string | null | undefined
): boolean {
  if (user.role === "ADMIN") return true
  if (user.role === "LEAD" || user.role === "MEMBER") {
    return teamId != null && user.teamIds.includes(teamId)
  }
  return false
}
