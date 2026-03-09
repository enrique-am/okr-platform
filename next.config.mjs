import { withSentryConfig } from "@sentry/nextjs"

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
    // Required for the instrumentation.ts hook in Next.js 14
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
}

export default withSentryConfig(nextConfig, {
  // Suppress noisy Sentry build output
  silent: true,
  // Disable the Sentry logger to reduce bundle size
  disableLogger: true,
  // Source maps are uploaded automatically when SENTRY_AUTH_TOKEN is set.
  // Without it, runtime error capture still works — only symbolication is skipped.
})
