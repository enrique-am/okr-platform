import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { openai } from "@/lib/openai"

const SYSTEM_PROMPT =
  "You are an OKR coach for Grupo AM, a media and news publishing company in León, Guanajuato, Mexico. " +
  "Your job is to suggest 5 key results (Resultados Clave) for a given objective. " +
  "Each key result should be specific, measurable, time-bound, and outcome-focused. " +
  "Return a JSON array of exactly 5 objects with this shape: " +
  '[{ "title": string, "type": "PERCENTAGE"|"NUMBER"|"CURRENCY"|"BOOLEAN", "targetValue": number, "unit": string }]. ' +
  'The "unit" field should be the measurement unit (e.g. "%", "MXN", "usuarios", "artículos", or empty string for BOOLEAN). ' +
  "Keep all titles in Spanish. " +
  "Never begin your response with words like Objetivo:, Resultado Clave:, RC:, KR:, ORC:, OKR: or any similar label or prefix. " +
  "Return only the JSON array, no additional text or markdown fences."

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  let body: { objectiveTitle?: string; teamName?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const { objectiveTitle, teamName } = body
  if (!objectiveTitle?.trim()) {
    return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 })
  }
  if (objectiveTitle.length > 500) {
    return NextResponse.json({ error: "El título es demasiado largo (máx. 500 caracteres)" }, { status: 400 })
  }

  const userPrompt = `Sugiere 5 resultados clave para el siguiente objetivo del equipo "${teamName ?? ""}": "${objectiveTitle.trim()}"`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.7,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ""
    if (!raw) {
      return NextResponse.json({ error: "Respuesta vacía del modelo" }, { status: 500 })
    }

    let suggestions: unknown
    try {
      const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
      suggestions = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: "El modelo devolvió un formato inválido" }, { status: 500 })
    }

    return NextResponse.json({ suggestions })
  } catch (e) {
    console.error("OpenAI suggest-krs error:", e)
    return NextResponse.json({ error: "Servicio de IA no disponible" }, { status: 500 })
  }
}
