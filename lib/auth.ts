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
      if (!user.email) return true

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
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}
