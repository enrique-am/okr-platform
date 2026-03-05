import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { openai } from "@/lib/openai"
import { checkRateLimit } from "@/lib/rate-limit"

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  "You are a data extraction assistant. You will receive a CSV file containing OKR data in Spanish. " +
  "Extract all objectives and their key results. " +
  "Return ONLY a valid JSON array with no explanation, no markdown, no code blocks. " +
  "Each objective should have: { objectiveNumber: string, title: string, keyResults: [ { krNumber: string, title: string, methodology: string, responsible: string, startValue: number or null, targetValue: number or null, currentValue: number or null } ] }. " +
  "Skip any rows that are action items (starting with ac), blank rows, or metadata rows. " +
  "Only include actual objectives (plain numbers like 1, 2, 3) and key results (dot notation like 1.1, 1.2)."

// ─── Type inference helper (mirrors client-side logic) ────────────────────────

type KRType = "PERCENTAGE" | "NUMBER" | "CURRENCY" | "BOOLEAN"

function inferType(methodology: string): KRType {
  const m = methodology
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
  if (m.includes("porcent") || m.includes("%")) return "PERCENTAGE"
  if (m.includes("moneda") || m.includes("mxn") || m.includes("peso") || m.includes("$"))
    return "CURRENCY"
  if (m.includes("bool") || m.includes("si no") || m.includes("cumplimiento") || m.includes("binario"))
    return "BOOLEAN"
  return "NUMBER"
}

// ─── OpenAI response shape ────────────────────────────────────────────────────

interface AIKeyResult {
  krNumber: string
  title: string
  methodology: string
  responsible: string
  startValue: number | null
  targetValue: number | null
  currentValue: number | null
}

interface AIObjective {
  objectiveNumber: string
  title: string
  keyResults: AIKeyResult[]
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!checkRateLimit(`${session.user.id}:parse-csv`, 5, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Intenta en un momento." }, { status: 429 })
  }

  let body: { csvText?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 })
  }

  const { csvText } = body
  if (!csvText?.trim()) {
    return NextResponse.json({ error: "El archivo CSV está vacío" }, { status: 400 })
  }

  // Limit input to ~120 KB to stay within token budget
  const truncated = csvText.slice(0, 120_000)

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: truncated },
      ],
      max_tokens: 4096,
      temperature: 0,
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? ""
    if (!raw) {
      return NextResponse.json(
        { error: "El modelo no devolvió ningún resultado" },
        { status: 500 }
      )
    }

    // Strip markdown code blocks if model wrapped the JSON anyway
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim()

    let aiObjectives: AIObjective[]
    try {
      aiObjectives = JSON.parse(cleaned)
      if (!Array.isArray(aiObjectives)) throw new Error("not an array")
    } catch {
      console.error("AI parse-csv: invalid JSON from model:", cleaned.slice(0, 500))
      return NextResponse.json(
        { error: "La IA devolvió un formato inesperado. Intenta con la importación estándar." },
        { status: 422 }
      )
    }

    // Map AI format → ParsedObjective format (same shape the client preview expects)
    const objectives = aiObjectives.map((obj) => {
      const krs = (obj.keyResults ?? []).map((kr) => {
        const type = inferType(kr.methodology ?? "")
        const issues: string[] = []
        if (!kr.title?.trim()) issues.push("Sin título")
        if (kr.targetValue === null && type !== "BOOLEAN") issues.push("Sin valor meta")

        return {
          rcNumber: String(kr.krNumber ?? ""),
          title: kr.title?.trim() || "(Sin título)",
          type,
          startValue: typeof kr.startValue === "number" ? kr.startValue : null,
          targetValue: typeof kr.targetValue === "number" ? kr.targetValue : null,
          currentValue: typeof kr.currentValue === "number" ? kr.currentValue : null,
          unit: null as string | null,
          responsible: kr.responsible?.trim() || null,
          issues,
        }
      })

      const issues: string[] = []
      if (!obj.title?.trim()) issues.push("Sin título")

      return {
        rcNumber: String(obj.objectiveNumber ?? ""),
        title: obj.title?.trim() || "(Sin título)",
        responsible: null as string | null,
        krs,
        issues,
      }
    })

    return NextResponse.json({ objectives })
  } catch (e) {
    console.error("parse-csv OpenAI error:", e)
    return NextResponse.json(
      { error: "El servicio de IA no está disponible. Intenta con la importación estándar." },
      { status: 500 }
    )
  }
}
