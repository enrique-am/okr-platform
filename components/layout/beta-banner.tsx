"use client"

import { useState, useEffect } from "react"

const COOKIE = "beta_banner_dismissed"

function isBannerDismissed(): boolean {
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${COOKIE}=`))
}

function setDismissedCookie() {
  const expires = new Date()
  expires.setDate(expires.getDate() + 7)
  document.cookie = `${COOKIE}=1; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}

export function BetaBanner() {
  // Start hidden to avoid SSR mismatch; show after cookie check on client
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isBannerDismissed()) setVisible(true)
  }, [])

  function dismiss() {
    setDismissedCookie()
    setVisible(false)
  }

  function openFeedback() {
    window.dispatchEvent(new CustomEvent("open-feedback"))
  }

  if (!visible) return null

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <p className="flex-1 text-sm text-yellow-800 text-center leading-snug">
          Estás usando la versión beta de Grupo AM ORCs — tus comentarios nos ayudan a mejorar.{" "}
          <button
            onClick={openFeedback}
            className="underline underline-offset-2 font-medium hover:text-yellow-900 transition-colors"
          >
            💬 Enviar comentario
          </button>
        </p>
        <button
          onClick={dismiss}
          aria-label="Cerrar banner"
          className="flex-shrink-0 text-yellow-400 hover:text-yellow-700 transition-colors p-0.5 rounded"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
