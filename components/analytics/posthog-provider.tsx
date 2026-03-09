"use client"

import posthog from "posthog-js"
import { PostHogProvider as PHProvider } from "posthog-js/react"
import * as Sentry from "@sentry/nextjs"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

// ─── Page view tracker + user identification ───────────────────────────────

function PostHogInternals() {
  const { data: session } = useSession()
  const pathname = usePathname()

  // Identify user in PostHog and Sentry whenever the logged-in user changes
  useEffect(() => {
    if (!session?.user?.id) return

    const userId = session.user.id

    // Fetch team names and then identify — a single lightweight call
    const identify = async () => {
      let teamNames: string[] = []
      try {
        const res = await fetch("/api/user/teams")
        if (res.ok) {
          const data = await res.json()
          teamNames = data.teamNames ?? []
        }
      } catch {
        // Non-fatal — identify without team names if fetch fails
      }

      posthog.identify(userId, {
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        teamNames,
      })
    }

    identify()

    // Set Sentry user context so errors are linked to real people
    Sentry.setUser({
      id: userId,
      email: session.user.email ?? undefined,
      username: session.user.name ?? undefined,
    })
  }, [session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track page views on route changes — skip auth / onboarding pages
  useEffect(() => {
    if (!pathname) return
    if (pathname.startsWith("/login") || pathname.startsWith("/onboarding")) return
    posthog.capture("$pageview", { $current_url: window.location.href })
  }, [pathname])

  return null
}

// ─── Provider wrapper ──────────────────────────────────────────────────────

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key || process.env.NODE_ENV !== "production") return

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      // We fire $pageview manually in PostHogInternals so we can skip
      // certain pages (login, onboarding).
      capture_pageview: false,
      capture_pageleave: true,
      session_recording: {
        // Mask all input fields globally to protect sensitive ORC/check-in data
        maskAllInputs: true,
      },
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <PostHogInternals />
      {children}
    </PHProvider>
  )
}
