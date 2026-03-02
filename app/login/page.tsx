import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { SignInButton } from "@/components/auth/sign-in-button"

export const metadata = {
  title: "Iniciar sesión – OKR Platform",
}

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Wordmark */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm leading-none">G</span>
            </div>
            <span className="text-xl font-semibold text-gray-900 tracking-tight">
              Grupo AM
            </span>
          </div>
          <span className="text-sm text-gray-400 tracking-wide uppercase">
            OKR Platform
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-10">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">
            Bienvenido
          </h1>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            Inicia sesión con tu cuenta de Google Workspace para acceder a la plataforma.
          </p>
          <SignInButton />
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
          Uso interno exclusivo para colaboradores de Grupo AM.
        </p>
      </div>
    </div>
  )
}
