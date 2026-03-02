// Re-export Prisma enums so feature code imports from one place
export type { Role, ObjectiveStatus, KeyResultType } from "@prisma/client"

// Augment NextAuth session and JWT to carry user id and role
import "next-auth"
import "next-auth/jwt"
import type { Role } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: Role
    }
  }

  interface User {
    role: Role
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role
  }
}
