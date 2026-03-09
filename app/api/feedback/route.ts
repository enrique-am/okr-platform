import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendFeedbackEmail } from "@/lib/email"
import { captureEvent } from "@/lib/posthog"
import * as Sentry from "@sentry/nextjs"
import { FeedbackType, FeedbackPriority, UserStatus, Role } from "@prisma/client"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const body = await req.json()
  const { type, title, description, stepsToReproduce, screenshotBase64, priority, pageUrl, userAgent } = body

  if (!type || !description?.trim() || !pageUrl) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
  }

  if (!Object.values(FeedbackType).includes(type)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
  }

  if (priority && !Object.values(FeedbackPriority).includes(priority)) {
    return NextResponse.json({ error: "Prioridad inválida" }, { status: 400 })
  }

  // ~2.74 MB is the base64 overhead for a 2 MB binary file (4/3 × 2 MB)
  const MAX_SCREENSHOT_BASE64 = Math.ceil(2 * 1024 * 1024 * (4 / 3))
  if (screenshotBase64 && screenshotBase64.length > MAX_SCREENSHOT_BASE64) {
    return NextResponse.json({ error: "La captura de pantalla excede el tamaño máximo de 2 MB" }, { status: 400 })
  }

  try {
    // Fetch the submitting user's details for the email
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        role: true,
        userTeams: { take: 1, select: { team: { select: { name: true } } } },
      },
    })

    const report = await prisma.feedbackReport.create({
      data: {
        type: type as FeedbackType,
        title: title?.trim() || null,
        description: description.trim(),
        stepsToReproduce: stepsToReproduce?.trim() || null,
        screenshotBase64: screenshotBase64 || null,
        priority: priority ? (priority as FeedbackPriority) : null,
        pageUrl,
        userAgent: userAgent ?? "",
        userId: session.user.id,
      },
    })

    // Notify all active admins
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN, status: UserStatus.ACTIVE },
      select: { email: true },
    })

    await Promise.allSettled(
      admins.map((admin) =>
        sendFeedbackEmail(admin.email, {
          type: type as "BUG" | "FEATURE",
          title: title?.trim() || null,
          description: description.trim(),
          stepsToReproduce: stepsToReproduce?.trim() || null,
          screenshotBase64: screenshotBase64 || null,
          priority: priority || null,
          pageUrl,
          userAgent: userAgent ?? "",
          submittedBy: {
            name: user?.name ?? null,
            email: user?.email ?? session.user.email ?? "",
            role: user?.role ?? session.user.role ?? "",
            teamName: user?.userTeams[0]?.team?.name ?? null,
          },
          createdAt: report.createdAt,
        })
      )
    )

    captureEvent(session.user.id, "feedback_submitted", {
      type: type as string,
      priority: priority ?? null,
    })

    return NextResponse.json({ ok: true, id: report.id })
  } catch (e) {
    Sentry.captureException(e, { data: { route: "feedback", userId: session.user.id } })
    console.error("feedback POST error:", e)
    return NextResponse.json({ error: "Error al guardar el reporte" }, { status: 500 })
  }
}
