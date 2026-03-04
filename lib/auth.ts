import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { Role, UserStatus } from "@prisma/client"
import { logActivity } from "@/lib/activity-log"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      if (!user.email.endsWith("@am.com.mx")) return "/login?error=domain_not_allowed"

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
      // `user` is only present on the initial sign-in
      if (user) {
        token.id = user.id
        token.role = (user as { role: Role }).role
        // Fetch all team memberships at sign-in and store in token
        const userTeams = await prisma.userTeam.findMany({
          where: { userId: user.id },
          select: { teamId: true },
        })
        token.teamIds = userTeams.map((ut) => ut.teamId)
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
        if (token.impersonatedBy) {
          session.user.impersonatedBy = token.impersonatedBy
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}
