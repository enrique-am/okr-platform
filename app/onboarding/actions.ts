"use server"

import { getServerSession } from "next-auth"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { encode, decode } from "next-auth/jwt"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/impersonation"

export async function completeOnboarding(destination: string = "/dashboard") {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  await prisma.user.update({
    where: { id: session.user.id },
    data: { hasCompletedOnboarding: true },
  })

  // Re-encode the JWT with hasCompletedOnboarding: true so middleware
  // doesn't redirect back to /onboarding on the very next request.
  // Same pattern as impersonate-action.ts.
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) redirect(destination)
  const jar = cookies()
  const rawToken = jar.get(SESSION_COOKIE)?.value

  if (rawToken) {
    const decoded = await decode({ token: rawToken, secret })
    if (decoded) {
      const newToken = await encode({
        token: { ...decoded, hasCompletedOnboarding: true },
        secret,
        maxAge: SESSION_MAX_AGE,
      })
      jar.set(SESSION_COOKIE, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: SESSION_MAX_AGE,
      })
    }
  }

  redirect(destination)
}
