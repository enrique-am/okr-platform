import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { openai } from "@/lib/openai"

const SYSTEM_PROMPT =
  "You are an OKR coach for Grupo AM, a media and news publishing company in León, Guanajuato, Mexico. " +
  "Your job is to rewrite objectives and key results to be clearer, more strategic, and properly formatted " +
  "according to OKR methodology. Objectives should be inspirational and qualitative. Key results should be " +
  "specific, measurable, time-bound, and outcome-focused. " +
  "Never begin your response with words like Objetivo:, Resultado Clave:, RC:, KR:, ORC:, OKR: or any similar label or prefix. " +
  "Respond only with the rewritten text, nothing else. " +
  "Keep the response in Spanish."

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  let body: { text?: string; type?: string; teamName?: string; parentObjective?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const { text, type, teamName, parentObjective } = body
  if (!text?.trim() || !type) {
    return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 })
  }
  if (text.length > 500) {
    return NextResponse.json({ error: "El texto es demasiado largo (máx. 500 caracteres)" }, { status: 400 })
  }

  const typeLabel = type === "objective" ? "objetivo" : "resultado clave"
  let userPrompt = `Reescribe este ${typeLabel} para el equipo "${teamName ?? ""}": "${text.trim()}"`
  if (type === "key_result" && parentObjective?.trim()) {
    userPrompt += `\n\nEste resultado clave pertenece al siguiente objetivo: "${parentObjective.trim()}". Asegúrate de que sea específico, medible y alineado con ese objetivo.`
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 200,
      temperature: 0.7,
    })

    const suggestion = completion.choices[0]?.message?.content?.trim() ?? ""
    if (!suggestion) {
      return NextResponse.json({ error: "Respuesta vacía del modelo" }, { status: 500 })
    }

    return NextResponse.json({ suggestion })
  } catch (e) {
    console.error("OpenAI suggest error:", e)
    return NextResponse.json({ error: "Servicio de IA no disponible" }, { status: 500 })
  }
}
