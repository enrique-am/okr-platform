import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  /*
   * Only run middleware on routes that require authentication.
   * Explicitly excluded (never redirected):
   *   /login          — public sign-in page
   *   /api/auth/*     — NextAuth endpoints (OAuth callbacks, session, etc.)
   *   /_next/*        — Next.js internals
   *   /favicon.ico    — static asset
   */
  matcher: ["/dashboard/:path*"],
}
