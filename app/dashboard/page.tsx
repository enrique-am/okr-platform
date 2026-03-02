import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { SignOutButton } from "@/components/auth/sign-out-button"
import type { Role } from "@/types"
import Image from "next/image"

export const metadata = {
  title: "Dashboard – OKR Platform",
}

const ROLE_CONFIG: Record<Role, { label: string; className: string }> = {
  EXECUTIVE: {
    label: "Ejecutivo",
    className: "bg-purple-100 text-purple-700",
  },
  LEAD: {
    label: "Líder de Equipo",
    className: "bg-blue-100 text-blue-700",
  },
  MEMBER: {
    label: "Miembro",
    className: "bg-gray-100 text-gray-600",
  },
  ADMIN: {
    label: "Administrador",
    className: "bg-brand-100 text-brand-700",
  },
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getFirstName(name: string | null | undefined): string {
  if (!name) return "there"
  return name.trim().split(/\s+/)[0]
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { user } = session
  const role = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.MEMBER
  const initials = getInitials(user.name)
  const firstName = getFirstName(user.name)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-brand-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs leading-none">G</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 tracking-tight">
              OKR Platform
            </span>
          </div>
          <SignOutButton />
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        <h1 className="text-2xl font-semibold text-gray-900 mb-8">
          Hola, {firstName}
        </h1>

        {/* User info card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-md">
          <div className="flex items-center gap-4 mb-5">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "Avatar"}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full ring-2 ring-gray-100"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">
                  {initials}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center gap-2">
            <span className="text-xs text-gray-400">Rol</span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${role.className}`}
            >
              {role.label}
            </span>
          </div>
        </div>

      </main>
    </div>
  )
}
