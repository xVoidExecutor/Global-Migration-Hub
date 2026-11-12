import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { requireAdminAuth } from "@/lib/admin/require-auth"
import { getRedis } from "@/lib/admin/redis"
import { loadCompanies } from "@/lib/companies-server"
import {
  COMPANIES_KEY,
  EMPLOYER_INFO_FIELDS,
  cleanEmployerInfo,
  matchCompany,
  type Company,
} from "@/lib/companies"

export const dynamic = "force-dynamic"

const MAX_NAME = 160
const LOGO_URL_RE = /^https:\/\/\S{1,480}$/

/** Admin: all saved companies — pinned first (RTS, Costa), then A–Z. */
export async function GET(request: Request) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  const redis = await getRedis()
  return NextResponse.json(await loadCompanies(redis))
}

/**
 * Admin: save a company permanently (or update it).
 *
 * - With `id`, that company is updated (and may be renamed). Without it, the same name or alias
 *   updates the existing company; anything else creates a new one.
 * - A new logo replaces the saved one; an empty logo never erases a saved logo.
 * - Company details: non-empty values are saved. Empty values only clear a saved detail when
 *   `replace` is true (the explicit "Save to company list" button).
 */
export async function POST(request: Request) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : ""
  if (!name || name.length > MAX_NAME) {
    return NextResponse.json({ error: "Company name is required (max 160 characters)." }, { status: 400 })
  }

  const logoUrl = typeof body.logoUrl === "string" ? body.logoUrl.trim() : ""
  if (logoUrl && !LOGO_URL_RE.test(logoUrl)) {
    return NextResponse.json({ error: "Invalid logo URL." }, { status: 400 })
  }

  const info = cleanEmployerInfo(body)
  const replace = body.replace === true

  const redis = await getRedis()
  const companies = await loadCompanies(redis)

  const byId = typeof body.id === "string" ? companies.find((c) => c.id === body.id) : undefined
  const existing = byId ?? matchCompany(companies, name)

  const now = new Date().toISOString()
  const company: Company = existing
    ? { ...existing }
    : { id: `co_${randomUUID().replace(/-/g, "").slice(0, 16)}`, name, logoUrl: "", createdAt: now, updatedAt: now }

  // Only an explicit edit (id given) renames; typing an alias of a saved company must not rename it.
  if (!existing || byId) company.name = name
  company.logoUrl = logoUrl || company.logoUrl || ""

  for (const key of EMPLOYER_INFO_FIELDS) {
    const value = info[key]
    if (value) company[key] = value
    else if (replace && key in body) delete company[key]
  }

  if (typeof body.pinned === "boolean" && !company.locked) {
    if (body.pinned) {
      if (!company.pinned) {
        const maxOrder = companies.reduce((m, c) => (c.pinned ? Math.max(m, c.pinOrder ?? 0) : m), 0)
        company.pinned = true
        company.pinOrder = maxOrder + 1
      }
    } else {
      company.pinned = false
      delete company.pinOrder
    }
  }

  if (Array.isArray(body.aliases)) {
    const seen = new Set<string>()
    const aliases: string[] = []
    for (const raw of body.aliases) {
      if (typeof raw !== "string") continue
      const a = raw.trim().replace(/\s+/g, " ").slice(0, 120)
      const key = a.toLowerCase()
      if (!a || seen.has(key) || key === company.name.toLowerCase()) continue
      seen.add(key)
      aliases.push(a)
      if (aliases.length >= 10) break
    }
    company.aliases = aliases
  }

  company.updatedAt = now
  await redis.hSet(COMPANIES_KEY, company.id, JSON.stringify(company))
  return NextResponse.json(company)
}
