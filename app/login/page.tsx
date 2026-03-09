import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { SignInButton } from "@/components/auth/sign-in-button"
import Image from "next/image"

export const metadata = {
  title: "Iniciar sesión – Objetivos y Resultados Clave",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")

  const errorType = searchParams.error

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Wordmark */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-2">
            <Image src="/logo-login.png" alt="Grupo AM" width={220} height={220} />
          </div>
          <span className="text-sm text-gray-400 tracking-wide uppercase">
            Objetivos y Resultados Clave
          </span>
        </div>

        {/* Error banners */}
        {errorType === "account_deactivated" && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm text-red-700">
              Tu cuenta ha sido desactivada. Contacta a tu administrador para más información.
            </p>
          </div>
        )}
        {errorType === "domain_not_allowed" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm text-amber-800">
              Solo se permiten cuentas <strong>@am.com.mx</strong>. Inicia sesión con tu correo corporativo de Grupo AM.
            </p>
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-10">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">
            Bienvenido
          </h1>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            Inicia sesión con tu cuenta de Google Workspace para acceder a la plataforma.
          </p>
          <SignInButton />
          <p className="text-center text-xs text-gray-400 mt-4">
            versión beta
          </p>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
          Uso interno exclusivo para colaboradores de Grupo AM.
        </p>
      </div>
    </div>
  )
}
