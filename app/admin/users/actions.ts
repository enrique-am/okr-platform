"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role, UserStatus } from "@prisma/client"
import { logActivity } from "@/lib/activity-log"
import { sendInviteEmail } from "@/lib/email"

type Result = { success: true } | { success: false; error: string }

async function assertAdmin() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "ADMIN") throw new Error("No autorizado")
  return session
}

const ROLE_LABELS: Record<string, string> = {
  EXECUTIVE: "Ejecutivo",
  LEAD: "Líder",
  MEMBER: "Miembro",
  ADMIN: "Admin",
}

// ─── Existing actions ──────────────────────────────────────────────────────────

export async function updateUserRole(userId: string, role: string): Promise<Result> {
  try {
    await assertAdmin()
    if (!Object.values(Role).includes(role as Role)) {
      return { success: false, error: "Rol inválido" }
    }
    await prisma.user.update({
      where: { id: userId },
      data: { role: role as Role },
    })
    revalidatePath("/admin/users")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

export async function updateUserTeams(userId: string, teamIds: string[]): Promise<Result> {
  try {
    await assertAdmin()
    await prisma.$transaction([
      prisma.userTeam.deleteMany({ where: { userId } }),
      prisma.userTeam.createMany({
        data: teamIds.map((teamId) => ({ userId, teamId })),
        skipDuplicates: true,
      }),
    ])
    revalidatePath("/admin/users")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

// ─── Invite user ───────────────────────────────────────────────────────────────

export async function inviteUser(
  email: string,
  role: string,
  teamId: string
): Promise<Result> {
  try {
    const session = await assertAdmin()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return { success: false, error: "Email inválido" }
    }
    if (!Object.values(Role).includes(role as Role)) {
      return { success: false, error: "Rol inválido" }
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return { success: false, error: "Ya existe un usuario con ese email" }
    }

    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } })
    if (!team) return { success: false, error: "Equipo no encontrado" }

    const inviteToken = crypto.randomUUID()

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        role: role as Role,
        status: UserStatus.PENDING,
        inviteToken,
        userTeams: { create: { teamId } },
      },
    })

    try {
      await sendInviteEmail(normalizedEmail, {
        roleName: ROLE_LABELS[role] || role,
        teamName: team.name,
      })
    } catch {
      // Email send failure is non-fatal — user is still created
      console.error("Failed to send invite email to", normalizedEmail)
    }

    await logActivity(session.user.id, "INVITE_USER", {
      invitedUserId: user.id,
      email: normalizedEmail,
      role,
      teamId,
    })

    revalidatePath("/admin/users")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

// ─── Bulk invite ───────────────────────────────────────────────────────────────

export interface BulkInviteRow {
  email: string
  role: string
  teamId: string
  teamName: string
}

export async function bulkInviteUsers(
  rows: BulkInviteRow[]
): Promise<{ success: true; created: number; skipped: number } | { success: false; error: string }> {
  try {
    const session = await assertAdmin()
    let created = 0
    let skipped = 0

    // Batch-check existing emails in a single query instead of N individual findUnique calls
    const normalizedRows = rows.map((row) => ({
      ...row,
      normalizedEmail: row.email.trim().toLowerCase(),
    }))
    const allEmails = normalizedRows.map((r) => r.normalizedEmail)
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: allEmails } },
      select: { email: true },
    })
    const existingEmailSet = new Set(existingUsers.map((u) => u.email))

    for (const row of normalizedRows) {
      try {
        if (existingEmailSet.has(row.normalizedEmail)) {
          skipped++
          continue
        }

        const inviteToken = crypto.randomUUID()
        await prisma.user.create({
          data: {
            email: row.normalizedEmail,
            role: row.role as Role,
            status: UserStatus.PENDING,
            inviteToken,
            userTeams: { create: { teamId: row.teamId } },
          },
        })

        try {
          await sendInviteEmail(row.normalizedEmail, {
            roleName: ROLE_LABELS[row.role] || row.role,
            teamName: row.teamName,
          })
        } catch {
          console.error("Failed to send invite email to", row.normalizedEmail)
        }

        created++
      } catch {
        skipped++
      }
    }

    await logActivity(session.user.id, "BULK_INVITE", { created, skipped })
    revalidatePath("/admin/users")
    return { success: true, created, skipped }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

// ─── Deactivate user ───────────────────────────────────────────────────────────

export async function deactivateUser(userId: string): Promise<Result> {
  try {
    const session = await assertAdmin()
    await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.INACTIVE },
    })
    await logActivity(session.user.id, "DEACTIVATE_USER", { targetUserId: userId })
    revalidatePath("/admin/users")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

// ─── Reactivate user ───────────────────────────────────────────────────────────

export async function reactivateUser(userId: string): Promise<Result> {
  try {
    const session = await assertAdmin()
    await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
    })
    await logActivity(session.user.id, "REACTIVATE_USER", { targetUserId: userId })
    revalidatePath("/admin/users")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

// ─── Cancel pending invite ─────────────────────────────────────────────────────

export async function cancelInvite(userId: string): Promise<Result> {
  try {
    const session = await assertAdmin()
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, email: true },
    })
    if (!user) return { success: false, error: "Usuario no encontrado" }
    if (user.status !== UserStatus.PENDING) {
      return { success: false, error: "Solo se pueden cancelar invitaciones pendientes" }
    }
    await logActivity(session.user.id, "CANCEL_INVITE", {
      cancelledUserId: userId,
      email: user.email,
    })
    await prisma.user.delete({ where: { id: userId } })
    revalidatePath("/admin/users")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

// ─── Reset onboarding ─────────────────────────────────────────────────────────

export async function resetOnboarding(userId: string): Promise<Result> {
  try {
    await assertAdmin()
    await prisma.user.update({
      where: { id: userId },
      data: { hasCompletedOnboarding: false },
    })
    revalidatePath("/admin/users")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

// ─── Delete user ───────────────────────────────────────────────────────────────

export async function deleteUser(userId: string): Promise<Result> {
  try {
    const session = await assertAdmin()
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true, email: true } })
    if (!user) return { success: false, error: "Usuario no encontrado" }
    if (user.status !== UserStatus.INACTIVE) {
      return { success: false, error: "Solo se pueden eliminar usuarios inactivos" }
    }

    await prisma.user.delete({ where: { id: userId } })

    // Log after delete succeeds (cascade already removed user's own logs)
    await logActivity(session.user.id, "DELETE_USER", {
      deletedUserId: userId,
      deletedEmail: user.email,
    })
    revalidatePath("/admin/users")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}
