"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const TABS = [
  { href: "/admin/users", label: "Usuarios" },
  { href: "/admin/teams", label: "Equipos" },
  { href: "/admin/activity", label: "Actividad" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/notifications", label: "Notificaciones" },
  { href: "/admin/import", label: "Importar" },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
