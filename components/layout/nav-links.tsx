"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Building2, HelpCircle, Settings, Menu, X, Users, ChevronDown } from "lucide-react"
import { SignOutButton } from "@/components/auth/sign-out-button"

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  EXECUTIVE: "Ejecutivo",
  LEAD: "Líder",
  MEMBER: "Miembro",
}

interface NavLinksProps {
  role: string
  unreadFeedback: number
  userName: string | null
  teams: { id: string; name: string; slug: string }[]
}

export function NavLinks({ role, unreadFeedback, userName, teams }: NavLinksProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [teamsOpen, setTeamsOpen] = useState(false)
  const [teamsExpanded, setTeamsExpanded] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const teamsRef = useRef<HTMLDivElement>(null)

  // Close on route change
  useEffect(() => { setOpen(false); setTeamsOpen(false) }, [pathname])

  // Close burger on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  // Close teams dropdown on outside click
  useEffect(() => {
    if (!teamsOpen) return
    function handleClick(e: MouseEvent) {
      if (teamsRef.current && !teamsRef.current.contains(e.target as Node)) {
        setTeamsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [teamsOpen])

  // ── Active state ────────────────────────────────────────────────────────────
  const isDashboard = pathname === "/dashboard"
  const isTeams    = pathname.startsWith("/dashboard/teams")
  const isCompany  = pathname.startsWith("/dashboard/company")
  const isAyuda    = pathname.startsWith("/ayuda")
  const isAdmin    = pathname.startsWith("/admin")

  // ── Desktop link style ───────────────────────────────────────────────────────
  const base = "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
  const activeD = "text-brand-700 bg-brand-50"
  const inactiveD = "text-gray-600 hover:text-brand-600 hover:bg-gray-50"
  const cls = (isActive: boolean) => `${base} ${isActive ? activeD : inactiveD}`

  // ── Mobile link style ────────────────────────────────────────────────────────
  const mobileBase = "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full"
  const activeM = "text-brand-700 bg-brand-50"
  const inactiveM = "text-gray-600 hover:text-brand-600 hover:bg-gray-50"
  const mcls = (isActive: boolean) => `${mobileBase} ${isActive ? activeM : inactiveM}`

  return (
    <>
      {/* ── Desktop nav ── */}
      <div className="hidden sm:flex items-center gap-1">
        <Link href="/dashboard" className={cls(isDashboard)}>
          <LayoutDashboard size={15} />
          Dashboard
        </Link>
        <Link href="/dashboard/company" className={cls(isCompany)}>
          <Building2 size={15} />
          ORCs Empresariales
        </Link>

        {/* Equipos dropdown */}
        {teams.length > 0 && (
          <div className="relative" ref={teamsRef}>
            <button
              onClick={() => setTeamsOpen((v) => !v)}
              className={cls(isTeams)}
            >
              <Users size={15} />
              Equipos
              <ChevronDown size={12} className={`transition-transform ${teamsOpen ? "rotate-180" : ""}`} />
            </button>

            {teamsOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-52 bg-white rounded-xl border border-gray-100 shadow-lg py-1.5 z-50">
                {teams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/dashboard/teams/${team.slug}`}
                    onClick={() => setTeamsOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm transition-colors ${
                      pathname === `/dashboard/teams/${team.slug}`
                        ? "text-brand-700 bg-brand-50 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {team.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <Link href="/ayuda" className={cls(isAyuda)}>
          <HelpCircle size={15} />
          Ayuda
        </Link>
        {role === "ADMIN" && (
          <Link href="/admin" className={`${cls(isAdmin)} relative`}>
            <Settings size={15} />
            Admin
            {unreadFeedback > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                {unreadFeedback > 99 ? "99+" : unreadFeedback}
              </span>
            )}
          </Link>
        )}
      </div>

      {/* ── Mobile burger ── */}
      <div className="sm:hidden" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          aria-label="Menú"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        {open && (
          <div className="fixed top-14 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-lg">
            <nav className="px-4 py-3 space-y-1">
              <Link href="/dashboard" onClick={() => setOpen(false)} className={mcls(isDashboard)}>
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
              <Link href="/dashboard/company" onClick={() => setOpen(false)} className={mcls(isCompany)}>
                <Building2 size={16} />
                ORCs Empresariales
              </Link>

              {/* Equipos collapsible submenu */}
              {teams.length > 0 && (
                <div>
                  <button
                    onClick={() => setTeamsExpanded((v) => !v)}
                    className={`${mcls(isTeams)} justify-between`}
                  >
                    <span className="flex items-center gap-3">
                      <Users size={16} />
                      Equipos
                    </span>
                    <ChevronDown size={16} className={`transition-transform flex-shrink-0 ${teamsExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {teamsExpanded && (
                    <div className="mt-1 ml-7 space-y-0.5">
                      {teams.map((team) => (
                        <Link
                          key={team.id}
                          href={`/dashboard/teams/${team.slug}`}
                          onClick={() => setOpen(false)}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            pathname === `/dashboard/teams/${team.slug}`
                              ? "text-brand-700 bg-brand-50 font-medium"
                              : "text-gray-600 hover:text-brand-600 hover:bg-gray-50"
                          }`}
                        >
                          {team.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Link href="/ayuda" onClick={() => setOpen(false)} className={mcls(isAyuda)}>
                <HelpCircle size={16} />
                Ayuda
              </Link>
              {role === "ADMIN" && (
                <Link href="/admin" onClick={() => setOpen(false)} className={`${mcls(isAdmin)} relative`}>
                  <Settings size={16} />
                  Admin
                  {unreadFeedback > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                      {unreadFeedback > 99 ? "99+" : unreadFeedback}
                    </span>
                  )}
                </Link>
              )}
            </nav>

            <div className="border-t border-gray-100 mx-4" />

            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{userName}</p>
                <p className="text-xs text-gray-400">{ROLE_LABELS[role] ?? role}</p>
              </div>
              <SignOutButton />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
