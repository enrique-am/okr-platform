"use server"

import { getServerSession } from "next-auth"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { encode, decode } from "next-auth/jwt"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-log"
import { SESSION_COOKIE, IMPERSONATOR_COOKIE, SESSION_MAX_AGE } from "@/lib/impersonation"

export async function startImpersonation(targetUserId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { success: false, error: "No autorizado" }
  }

  // Cannot impersonate yourself
  if (targetUserId === session.user.id) {
    return { success: false, error: "No puedes impersonarte a ti mismo" }
  }

  // Fetch target user and their team memberships
  const [target, userTeams] = await Promise.all([
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true, role: true, status: true },
    }),
    prisma.userTeam.findMany({
      where: { userId: targetUserId },
      select: { teamId: true },
    }),
  ])

  if (!target) return { success: false, error: "Usuario no encontrado" }
  if (target.role === "ADMIN") return { success: false, error: "No puedes impersonar a otro administrador" }
  if (target.status === "INACTIVE") return { success: false, error: "No puedes impersonar a un usuario inactivo" }

  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) return { success: false, error: "Configuración del servidor incompleta" }

  const jar = cookies()

  // Save the admin's current raw session token as a backup
  const originalToken = jar.get(SESSION_COOKIE)?.value
  if (!originalToken) return { success: false, error: "Sesión no encontrada" }

  // Fetch onboarding status for the impersonated user
  const targetDbUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { hasCompletedOnboarding: true },
  })

  // Build a new JWT for the target user, carrying impersonatedBy context
  const newToken = await encode({
    token: {
      id: target.id,
      name: target.name,
      email: target.email,
      role: target.role,
      teamIds: userTeams.map((ut) => ut.teamId),
      hasCompletedOnboarding: targetDbUser?.hasCompletedOnboarding ?? false,
      impersonatedBy: { id: session.user.id, name: session.user.name ?? "Admin" },
    },
    secret,
    maxAge: SESSION_MAX_AGE,
  })

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  }

  // Store the admin's token in the backup cookie
  jar.set(IMPERSONATOR_COOKIE, originalToken, cookieOpts)

  // Overwrite the session cookie with the impersonated user's token
  jar.set(SESSION_COOKIE, newToken, cookieOpts)

  await logActivity(session.user.id, "IMPERSONATE_START", {
    targetUserId: target.id,
    targetName: target.name,
    targetEmail: target.email,
  })

  redirect("/dashboard")
}
