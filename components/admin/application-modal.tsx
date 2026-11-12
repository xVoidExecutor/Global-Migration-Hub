// Shared (client + server) types and helpers for the permanent company list.
// Admins pick a saved company (official name, original logo, ABN and other details) or type a new one manually.

/** Public company details. Shown on the applicant's visa-check (/track) profile. */
export interface EmployerInfo {
  /** Trading / brand name, e.g. "Costa". */
  tradingName?: string
  /** Australian Business Number, digits only (11). */
  abn?: string
  /** Australian Company Number, digits only (9). */
  acn?: string
  /** e.g. "Australian Private Company". */
  entityType?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  /** Short description of the business. */
  about?: string
}

export const EMPLOYER_INFO_FIELDS = [
  "tradingName",
  "abn",
  "acn",
  "entityType",
  "address",
  "phone",
  "email",
  "website",
  "about",
] as const satisfies readonly (keyof EmployerInfo)[]

export interface Company extends EmployerInfo {
  /** Stable id (random for new companies, fixed for the permanent pinned ones). */
  id: string
  /** Full official (legal) name. */
  name: string
  /** Original uploaded logo URL (Vercel Blob). Empty string when no logo has been saved yet. */
  logoUrl: string
  /** Other names applicants may type for the same company (e.g. "Costa"). Matched case-insensitively. */
  aliases?: string[]
  /** Pinned companies are listed first, in pinOrder. */
  pinned?: boolean
  pinOrder?: number
  /** Permanent companies cannot be deleted or unpinned. */
  locked?: boolean
  createdAt: string
  updatedAt: string
}

/** Redis hash: field = company id, value = JSON of Company. Never expires. */
export const COMPANIES_KEY = "gmh:companies"

/**
 * Companies that are always pinned at the top of the list. Created automatically the first time the
 * list is read, and never overwritten afterwards — edit them from the admin panel.
 */
export const DEFAULT_PINNED_COMPANIES: Omit<Company, "createdAt" | "updatedAt">[] = [
  {
    id: "pinned-rts",
    name: "RTS",
    logoUrl: "",
    aliases: ["RTS"],
    pinned: true,
    pinOrder: 1,
    locked: true,
  },
  {
    id: "pinned-costa",
    name: "Costa Group Holdings Pty Ltd",
    logoUrl: "",
    aliases: ["Costa", "Costa Group", "Costa Group Holdings", "Costa Group Holdings Limited"],
    pinned: true,
    pinOrder: 2,
    locked: true,
    tradingName: "Costa",
    abn: "68151363129",
    acn: "151363129",
    entityType: "Australian Private Company",
    address: "Level 5, 818 Bourke Street, Docklands, Victoria 3008, Australia",
    phone: "+61 3 8363 9000",
    email: "info@costagroup.com.au",
    website: "https://costagroup.com.au",
  },
]

export function normalizeCompanyName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

/** Finds a saved company whose official name or one of its aliases equals `name`. */
export function matchCompany<T extends Pick<Company, "name" | "aliases">>(
  companies: T[],
  name: string | undefined,
): T | undefined {
  const target = normalizeCompanyName(name ?? "")
  if (!target) return undefined
  return (
    companies.find((c) => normalizeCompanyName(c.name) === target) ??
    companies.find((c) => (c.aliases ?? []).some((a) => normalizeCompanyName(a) === target))
  )
}

/** Pinned first (by pinOrder), then A–Z. */
export function sortCompanies<T extends Pick<Company, "name" | "pinned" | "pinOrder">>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
    if (a.pinned && b.pinned) {
      const diff = (a.pinOrder ?? 999) - (b.pinOrder ?? 999)
      if (diff !== 0) return diff
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  })
}

export function digitsOnly(value: string | undefined): string {
  return (value ?? "").replace(/\D/g, "")
}

/** "68151363129" -> "68 151 363 129" (unchanged if it is not 11 digits). */
export function formatAbn(value: string | undefined): string {
  const d = digitsOnly(value)
  if (d.length !== 11) return (value ?? "").trim()
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`
}

/** "151363129" -> "151 363 129". */
export function formatAcn(value: string | undefined): string {
  const d = digitsOnly(value)
  if (d.length !== 9) return (value ?? "").trim()
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
}

/** Official ATO checksum for an Australian Business Number. */
export function isValidAbn(value: string | undefined): boolean {
  const d = digitsOnly(value)
  if (d.length !== 11) return false
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  const digits = d.split("").map(Number)
  digits[0] -= 1
  const sum = digits.reduce((acc, n, i) => acc + n * weights[i], 0)
  return sum % 89 === 0
}

/** Link to the free government ABN Lookup (ABR) entry, so anyone can verify the company. */
export function abrLookupUrl(abn: string | undefined): string | null {
  const d = digitsOnly(abn)
  return d.length === 11 ? `https://abr.business.gov.au/ABN/View?abn=${d}` : null
}

export function hasEmployerInfo(info: EmployerInfo | undefined | null): boolean {
  if (!info) return false
  return EMPLOYER_INFO_FIELDS.some((k) => typeof info[k] === "string" && info[k]!.trim() !== "")
}

/** Picks only the details from a company (used when filling an application from the saved list). */
export function pickEmployerInfo(source: EmployerInfo | undefined | null): EmployerInfo {
  const out: EmployerInfo = {}
  if (!source) return out
  for (const key of EMPLOYER_INFO_FIELDS) {
    const v = source[key]
    if (typeof v === "string" && v.trim()) out[key] = v
  }
  return out
}

const FIELD_MAX: Record<keyof EmployerInfo, number> = {
  tradingName: 120,
  abn: 11,
  acn: 9,
  entityType: 80,
  address: 250,
  phone: 40,
  email: 120,
  website: 200,
  about: 600,
}

/** Validates/normalizes untrusted company details (from a request body). Unknown keys are dropped. */
export function cleanEmployerInfo(input: unknown): EmployerInfo {
  const out: EmployerInfo = {}
  if (!input || typeof input !== "object") return out
  const src = input as Record<string, unknown>
  for (const key of EMPLOYER_INFO_FIELDS) {
    const raw = src[key]
    if (typeof raw !== "string") continue
    let v = raw.trim()
    if (key === "abn") v = digitsOnly(v)
    else if (key === "acn") v = digitsOnly(v)
    else if (key === "email") v = v.toLowerCase()
    else if (key === "website" && v && !/^https?:\/\//i.test(v)) v = `https://${v}`
    if (key === "website" && v && !/^https?:\/\/\S+$/i.test(v)) continue
    out[key] = v.slice(0, FIELD_MAX[key])
  }
  return out
}
