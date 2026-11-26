import { NextResponse } from "next/server"
import { requireAdminAuth } from "@/lib/admin/require-auth"
import type { ScannedIdentity } from "@/lib/admin/types"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Free Google Gemini model (free tier of Google AI Studio). Change with the GEMINI_MODEL env var.
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash"

const PROMPT = `You are reading photos of identity documents (passport data page, national ID card front/back) for a visa agency's data-entry form.
Read ONLY what is printed on the documents. Never guess. If a value is not visible or not readable, use an empty string.
For the passport number, cross-check the machine readable zone (the two lines starting with P<) and prefer the value that agrees with it (the MRZ number is 9 characters plus a check digit - do not include the check digit).
Return ONE JSON object and nothing else, with exactly these string keys:
fullName (as printed, Latin letters, e.g. "KANCHAN" or "MD FAHIM ALAM"),
familyName (the passport surname; if the passport shows only one name, put that name here),
givenNames (given names; empty if there are none),
passportNumber,
nationalId (national ID number, digits only),
dateOfBirth (YYYY-MM-DD),
nationality (e.g. "BANGLADESHI"),
sex ("male" or "female" or ""),
placeOfBirthCity (town/city of birth in capital letters; empty if not shown),
countryOfPassport (e.g. "BANGLADESH"),
passportIssueDate (YYYY-MM-DD),
passportExpiryDate (YYYY-MM-DD),
issuingAuthority (as printed in the passport, e.g. "DIP/DHAKA"),
addressLine1, addressLine2, addressLine3, postcode (the permanent address from the passport, written in Latin letters and split sensibly: line1 = village/area, line2 = post office/upazila, line3 = district + country; if only an ID-card address in another script is available, transliterate it to Latin letters),
spouseName (the "Spouse's Name" printed in the passport, empty if none).`

const KEYS: (keyof ScannedIdentity)[] = [
  "fullName",
  "familyName",
  "givenNames",
  "passportNumber",
  "nationalId",
  "dateOfBirth",
  "nationality",
  "sex",
  "placeOfBirthCity",
  "countryOfPassport",
  "passportIssueDate",
  "passportExpiryDate",
  "issuingAuthority",
  "addressLine1",
  "addressLine2",
  "addressLine3",
  "postcode",
  "spouseName",
]

export async function POST(request: Request) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set. Add it in Vercel → Settings → Environment Variables and redeploy." },
      { status: 500 },
    )
  }

  const form = await request.formData()
  const files = form.getAll("files").filter((f): f is File => f instanceof File).slice(0, 5)
  if (files.length === 0) {
    return NextResponse.json({ error: "Please choose at least one passport or ID image." }, { status: 400 })
  }

  const parts: Record<string, unknown>[] = []
  for (const file of files) {
    const mime = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) ? file.type : "image/jpeg"
    const data = Buffer.from(await file.arrayBuffer()).toString("base64")
    parts.push({ inline_data: { mime_type: mime, data } })
  }
  parts.push({ text: PROMPT })

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
  })

  if (!res.ok) {
    if (res.status === 429) {
      return NextResponse.json(
        { error: "The free scan limit was reached for now. Wait a minute and try again, or fill the boxes by hand." },
        { status: 429 },
      )
    }
    const detail = await res.text().catch(() => "")
    return NextResponse.json(
      { error: `The scanner service returned an error (${res.status}). ${detail.slice(0, 200)}` },
      { status: 502 },
    )
  }

  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("")
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end === -1) {
    return NextResponse.json({ error: "Could not read the documents. Try clearer, well-lit photos." }, { status: 422 })
  }

  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
    const result: ScannedIdentity = {}
    for (const key of KEYS) {
      const value = raw[key]
      if (typeof value === "string" && value.trim()) {
        ;(result as Record<string, string>)[key] = value.trim()
      }
    }
    if (result.sex && result.sex !== "male" && result.sex !== "female") delete result.sex
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Could not understand the scan result. Please try again." }, { status: 422 })
  }
}
