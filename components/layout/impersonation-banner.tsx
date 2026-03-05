import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function ImpersonationBanner() {
  const session = await getServerSession(authOptions)
  const impersonatedBy = session?.user?.impersonatedBy

  if (!impersonatedBy) return null

  return (
    <div className="w-full bg-amber-400 text-amber-950 px-4 py-2 flex items-center justify-between gap-4 text-sm font-medium">
      <div className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 flex-shrink-0"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          Estás viendo la app como{" "}
          <strong>{session?.user?.name ?? session?.user?.email}</strong>.
          Sesión iniciada por <strong>{impersonatedBy.name}</strong>.
        </span>
      </div>
      <form method="POST" action="/api/impersonate/exit">
        <button
          type="submit"
          className="flex-shrink-0 bg-amber-950 text-amber-50 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-900 transition-colors"
        >
          Salir de sesión
        </button>
      </form>
    </div>
  )
}
