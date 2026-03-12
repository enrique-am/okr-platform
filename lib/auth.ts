import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { Role, UserStatus } from "@prisma/client"
import { logActivity } from "@/lib/activity-log"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  throw new Error("Missing required env vars: GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET")
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
      })

      if (!dbUser) return true // new user — allow adapter to create

      if (dbUser.status === UserStatus.INACTIVE) {
        return "/login?error=account_deactivated"
      }

      const updates: Record<string, unknown> = {
        lastLoginAt: new Date(),
      }

      if (dbUser.status === UserStatus.PENDING) {
        updates.status = UserStatus.ACTIVE
        updates.inviteToken = null
      }

      await prisma.user.update({
        where: { id: dbUser.id },
        data: updates,
      })

      await logActivity(dbUser.id, "LOGIN")

      return true
    },
    async jwt({ token, user }) {
      // `user` is only present on the initial sign-in.
      if (user) {
        // With @auth/prisma-adapter v2.x + NextAuth v4, user.id can be the OAuth
        // provider's subject (Google's numeric sub) rather than the DB CUID.
        // Look up by email instead — it is always the canonical identifier from
        // the signIn callback and is reliably present on every provider.
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: {
            id: true,
            role: true,
            hasCompletedOnboarding: true,
            userTeams: { select: { teamId: true } },
          },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.teamIds = dbUser.userTeams.map((ut) => ut.teamId)
          token.hasCompletedOnboarding = dbUser.hasCompletedOnboarding
        }
      }
      // `impersonatedBy` is injected directly into the token by the impersonate
      // server action — just preserve it on every subsequent call
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.teamIds = token.teamIds ?? []
        session.user.hasCompletedOnboarding = token.hasCompletedOnboarding ?? false
        if (token.impersonatedBy) {
          session.user.impersonatedBy = token.impersonatedBy
        }
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })
      }
    },
  },
  pages: {
    signIn: "/login",
  },
}
