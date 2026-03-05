import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { SESSION_COOKIE, IMPERSONATOR_COOKIE, SESSION_MAX_AGE } from "@/lib/impersonation"

export async function POST() {
  const jar = cookies()
  const backup = jar.get(IMPERSONATOR_COOKIE)?.value

  if (!backup) {
    // No backup found — just redirect to login for safety
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000"))
  }

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  }

  // Restore the admin's original session token
  jar.set(SESSION_COOKIE, backup, cookieOpts)

  // Remove the backup cookie
  jar.delete(IMPERSONATOR_COOKIE)

  return NextResponse.redirect(
    new URL("/admin/users", process.env.NEXTAUTH_URL ?? "http://localhost:3000")
  )
}
