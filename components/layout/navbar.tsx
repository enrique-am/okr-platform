import { getServerSession } from "next-auth"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SignOutButton } from "@/components/auth/sign-out-button"

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  EXECUTIVE: "Ejecutivo",
  LEAD: "Líder",
  MEMBER: "Miembro",
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-brand-50 text-brand-700",
  EXECUTIVE: "bg-purple-50 text-purple-700",
  LEAD: "bg-blue-50 text-blue-700",
  MEMBER: "bg-gray-100 text-gray-500",
}

export async function Navbar() {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const role = user?.role ?? ""

  let unreadFeedback = 0
  if (role === "ADMIN") {
    try {
      unreadFeedback = await prisma.feedbackReport.count({ where: { read: false } })
    } catch {
      // Prisma client may be stale — run `npx prisma generate` and restart the server
    }
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* Left: logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <div className="w-7 h-7 rounded-md bg-brand-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs leading-none">G</span>
          </div>
          <span className="text-sm font-bold text-brand-600 tracking-tight">
            Grupo AM ORCs
          </span>
        </Link>

        {/* Center: nav links */}
        <div className="hidden sm:flex items-center gap-1">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-brand-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/company"
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-brand-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Empresa
          </Link>
          {role === "ADMIN" && (
            <Link
              href="/admin"
              className="relative px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-brand-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              Admin
              {unreadFeedback > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                  {unreadFeedback > 99 ? "99+" : unreadFeedback}
                </span>
              )}
            </Link>
          )}
        </div>

        {/* Right: user info + sign out */}
        {user && (
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-gray-700 truncate max-w-[140px]">
                {user.name}
              </span>
              {role && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    ROLE_BADGE[role] ?? "bg-gray-100 text-gray-500"
                  }`}
                >
                  {ROLE_LABELS[role] ?? role}
                </span>
              )}
            </div>
            <div className="w-px h-4 bg-gray-200 hidden sm:block" />
            <SignOutButton />
          </div>
        )}

      </div>
    </nav>
  )
}
