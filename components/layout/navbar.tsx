import { getServerSession } from "next-auth"
import Link from "next/link"
import Image from "next/image"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { NavLinks } from "./nav-links"

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

  const teamIds = user?.teamIds ?? []
  const isLimited = role !== "ADMIN" && role !== "EXECUTIVE"
  const teams = await prisma.team.findMany({
    where: isLimited && teamIds.length > 0 ? { id: { in: teamIds } } : isLimited ? { id: "none" } : undefined,
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  })

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* Left: logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <Image src="/logo.png" alt="Grupo AM" width={28} height={28} className="flex-shrink-0" />
          <span className="text-sm font-bold text-brand-600 tracking-tight">
            Grupo AM ORCs
          </span>
        </Link>

        {/* Center: nav links (client component for active state + icons) */}
        <NavLinks role={role} unreadFeedback={unreadFeedback} userName={user?.name ?? null} teams={teams} />

        {/* Right: user info + sign out (desktop only — mobile uses burger menu) */}
        {user && (
          <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
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
