"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckInEntry {
  krId: string
  newValue: number
  originalValue: number
  notes: string
}

export interface SubmitCheckInInput {
  teamSlug: string
  entries: CheckInEntry[]
}

export type SubmitCheckInResult =
  | { success: true }
  | { success: false; error: string }

// ─── Server action ────────────────────────────────────────────────────────────

export async function submitCheckIn(
  input: SubmitCheckInInput
): Promise<SubmitCheckInResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: false, error: "No autenticado" }

  // Only process entries where the value changed or a note was added
  const toProcess = input.entries.filter(
    (e) => e.newValue !== e.originalValue || e.notes.trim() !== ""
  )

  // Nothing changed — redirect silently
  if (toProcess.length === 0) return { success: true }

  try {
    await prisma.$transaction([
      // Record each check-in
      ...toProcess.map((e) =>
        prisma.checkIn.create({
          data: {
            value: e.newValue,
            note: e.notes.trim() || null,
            keyResultId: e.krId,
            authorId: session.user.id,
          },
        })
      ),
      // Update currentValue on each KR
      ...toProcess.map((e) =>
        prisma.keyResult.update({
          where: { id: e.krId },
          data: { currentValue: e.newValue },
        })
      ),
    ])

    revalidatePath("/dashboard")
    revalidatePath(`/dashboard/teams/${input.teamSlug}`)
    return { success: true }
  } catch (e) {
    console.error("submitCheckIn error:", e)
    return { success: false, error: "Error al guardar el avance" }
  }
}
