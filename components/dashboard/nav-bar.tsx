import Image from "next/image"
import Link from "next/link"
import { SignOutButton } from "@/components/auth/sign-out-button"

interface NavBarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string | null
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
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-md bg-brand-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs leading-none">G</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 tracking-tight">
              OKR Platform
            </span>
          </Link>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 select-none">
            Q1 · 2026
          </span>
        </div>

        {/* Right: admin link + user info + sign out */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-3.5 h-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.992 6.992 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>
              Admin
            </Link>
          )}
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
