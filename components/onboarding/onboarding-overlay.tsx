"use client"

import { useState, useEffect, useTransition } from "react"
import Image from "next/image"
import { completeOnboarding } from "@/app/onboarding/actions"

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingOverlayProps {
  userName: string | null
  userRole: string
  teamName: string | null
  teamSlug: string | null
}

// ─── Role config ──────────────────────────────────────────────────────────────

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
  MEMBER: "bg-gray-100 text-gray-600",
}

function getRoleAction(
  role: string,
  teamSlug: string | null
): { heading: string; buttonLabel: string; destination: string } {
  switch (role) {
    case "LEAD":
      return {
        heading: "Empieza creando el primer ORC de tu equipo",
        buttonLabel: "Crear mi primer ORC →",
        destination: "/dashboard/new",
      }
    case "MEMBER":
      return {
        heading: "Empieza viendo el dashboard de tu equipo",
        buttonLabel: "Ver mi equipo →",
        destination: teamSlug ? `/dashboard/teams/${teamSlug}` : "/dashboard",
      }
    case "EXECUTIVE":
      return {
        heading: "Empieza revisando los ORCs Empresariales",
        buttonLabel: "Ver ORCs Empresariales →",
        destination: "/dashboard/company",
      }
    case "ADMIN":
    default:
      return {
        heading: "Empieza configurando los equipos de Grupo AM",
        buttonLabel: "Ir al panel de administración →",
        destination: "/admin/teams",
      }
  }
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <div
          key={n}
          className={`rounded-full transition-all duration-300 ${
            n === current
              ? "w-6 h-2 bg-brand-500"
              : n < current
              ? "w-2 h-2 bg-brand-300"
              : "w-2 h-2 bg-gray-200"
          }`}
        />
      ))}
    </div>
  )
}

// ─── Mini card ────────────────────────────────────────────────────────────────

function MiniCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col gap-1.5">
      <span className="text-2xl leading-none">{emoji}</span>
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
    </div>
  )
}

// ─── OnboardingOverlay ────────────────────────────────────────────────────────

export function OnboardingOverlay({ userName, userRole, teamName, teamSlug }: OnboardingOverlayProps) {
  const [step, setStep] = useState(1)
  const [stepVisible, setStepVisible] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()

  const roleAction = getRoleAction(userRole, teamSlug)
  const firstName = userName?.split(" ")[0] ?? "usuario"
  const badgeClass = ROLE_BADGE[userRole] ?? "bg-gray-100 text-gray-600"
  const roleLabel = ROLE_LABELS[userRole] ?? userRole

  // Entrance animation: trigger after first paint
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(t)
  }, [])

  function goToStep(n: number) {
    setStepVisible(false)
    setTimeout(() => {
      setStep(n)
      setStepVisible(true)
    }, 140)
  }

  function handleComplete(destination: string) {
    startTransition(async () => {
      await completeOnboarding(destination)
    })
  }

  const overlayReady = mounted && !isPending

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: overlayReady ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0)",
        backdropFilter: overlayReady ? "blur(4px)" : "none",
        transition: "background-color 350ms ease, backdrop-filter 350ms ease",
      }}
    >
      {/* Card */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        style={{
          opacity: overlayReady ? 1 : 0,
          transform: overlayReady ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
          transition: "opacity 350ms ease, transform 350ms ease",
        }}
      >
        <div className="px-8 py-8 sm:px-10 sm:py-10">
          {/* Logo */}
          <div className="flex justify-center mb-7">
            <Image src="/logo.png" alt="Grupo AM" width={100} height={26} priority />
          </div>

          {/* Progress dots */}
          <div className="mb-7">
            <ProgressDots current={step} total={3} />
          </div>

          {/* Step content — fade+slide between steps */}
          <div
            style={{
              opacity: stepVisible ? 1 : 0,
              transform: stepVisible ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 140ms ease, transform 140ms ease",
            }}
          >
            {/* ── Step 1: Bienvenida ── */}
            {step === 1 && (
              <div className="flex flex-col items-center text-center gap-5">
                <div className="w-16 h-16 rounded-full bg-brand-50 border-2 border-brand-100 flex items-center justify-center">
                  <span className="text-3xl">👋</span>
                </div>

                <div>
                  <h1 className="text-xl font-bold text-gray-900 leading-snug">
                    Bienvenido/a,{" "}
                    <span className="text-brand-600">{firstName}</span>
                  </h1>
                  {teamName && (
                    <p className="text-sm text-gray-400 mt-1">{teamName}</p>
                  )}
                </div>

                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${badgeClass}`}>
                  {roleLabel}
                </span>

                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                  Esta es la plataforma oficial de seguimiento de ORCs de Grupo AM.
                </p>

                <button
                  onClick={() => goToStep(2)}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
                >
                  Comenzar →
                </button>
              </div>
            )}

            {/* ── Step 2: Cómo funciona ── */}
            {step === 2 && (
              <div className="flex flex-col gap-5">
                <div className="text-center">
                  <h2 className="text-lg font-bold text-gray-900">¿Cómo funciona?</h2>
                  <p className="text-sm text-gray-400 mt-1">Los cuatro elementos clave de la plataforma</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MiniCard
                    emoji="🎯"
                    title="ORCs"
                    desc="Los Objetivos que tu equipo quiere alcanzar este trimestre"
                  />
                  <MiniCard
                    emoji="📊"
                    title="RCs"
                    desc="Los Resultados Clave que miden el progreso de cada objetivo"
                  />
                  <MiniCard
                    emoji="✅"
                    title="Check-ins"
                    desc="Actualiza el avance de tus RCs cada semana"
                  />
                  <MiniCard
                    emoji="🤖"
                    title="IA"
                    desc="Usa Mejorar con IA para redactar mejores objetivos"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => goToStep(1)}
                    className="flex-1 border border-gray-200 text-gray-600 font-medium text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => goToStep(3)}
                    className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Primera acción ── */}
            {step === 3 && (
              <div className="flex flex-col items-center text-center gap-5">
                <div className="w-16 h-16 rounded-full bg-brand-50 border-2 border-brand-100 flex items-center justify-center">
                  <span className="text-3xl">🚀</span>
                </div>

                <div>
                  <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-2">
                    ¡Listo!
                  </p>
                  <h2 className="text-lg font-bold text-gray-900 leading-snug">
                    {roleAction.heading}
                  </h2>
                </div>

                <button
                  onClick={() => handleComplete(roleAction.destination)}
                  disabled={isPending}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm py-3 rounded-xl transition-colors disabled:opacity-60"
                >
                  {isPending ? "Cargando..." : roleAction.buttonLabel}
                </button>

                <button
                  onClick={() => goToStep(2)}
                  disabled={isPending}
                  className="w-full border border-gray-200 text-gray-600 font-medium text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  ← Anterior
                </button>

                <button
                  onClick={() => handleComplete("/dashboard")}
                  disabled={isPending}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-60"
                >
                  Saltar introducción
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
