import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse("No autorizado", { status: 401 })
  }

  const doc = await prisma.helpDocument.findUnique({
    where: { id: params.id },
  })

  if (!doc) {
    return new NextResponse("Documento no encontrado", { status: 404 })
  }

  return new NextResponse(doc.fileData, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${doc.filename}"`,
      "Content-Length": String(doc.fileSize),
    },
  })
}
