import Image from "next/image"
import { SignOutButton } from "@/components/auth/sign-out-button"

interface NavBarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function NavBar({ user }: NavBarProps) {
  const initials = getInitials(user.name)

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* Left: wordmark + quarter badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-md bg-brand-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs leading-none">G</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 tracking-tight">
              OKR Platform
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 select-none">
            Q1 · 2026
          </span>
        </div>

        {/* Right: user info + sign out */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="hidden md:block text-sm text-gray-600 truncate max-w-[160px]">
            {user.name}
          </span>

          {user.image ? (
            <Image
              src={user.image}
              alt={user.name ?? "Avatar"}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full ring-2 ring-gray-100 flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-xs">{initials}</span>
            </div>
          )}

          <div className="hidden sm:block w-px h-4 bg-gray-200" />
          <SignOutButton />
        </div>

      </div>
    </nav>
  )
}
