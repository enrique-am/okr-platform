import { PostHog } from "posthog-node"

const globalForPostHog = globalThis as unknown as { posthog: PostHog | undefined }

export const posthog =
  globalForPostHog.posthog ??
  new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "placeholder", {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    // flushAt: 1 ensures every event is sent immediately — important for
    // serverless environments where the process may not stay alive long enough
    // for the default batching interval.
    flushAt: 1,
    flushInterval: 0,
  })

if (process.env.NODE_ENV !== "production") globalForPostHog.posthog = posthog

/**
 * Fire-and-forget server-side event capture.
 * Safe to call from server actions and API routes.
 * Does nothing if NEXT_PUBLIC_POSTHOG_KEY is not set.
 */
export function captureEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  try {
    posthog.capture({ distinctId: userId, event, properties })
  } catch {
    // Analytics should never crash the app
  }
}
