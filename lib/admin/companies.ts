import { pickEmployerInfo, type Company, type EmployerInfo } from "@/lib/companies"

export async function getCompanies(): Promise<Company[]> {
  try {
    const res = await fetch("/api/admin/companies", { cache: "no-store" })
    if (!res.ok) return []
    return (await res.json()) as Company[]
  } catch {
    return []
  }
}

/**
 * Saves (or updates) a company in the permanent list. Safe to call on every application save:
 * the same name (or alias) just updates the existing entry and never erases saved details.
 * Never throws — saving the list must not block saving the application itself.
 */
export async function rememberCompany(
  name: string | undefined,
  logoUrl: string | undefined,
  info?: EmployerInfo,
): Promise<void> {
  const trimmed = (name ?? "").trim()
  if (!trimmed) return
  try {
    await fetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed, logoUrl: logoUrl ?? "", ...pickEmployerInfo(info) }),
    })
  } catch {
    // ignore
  }
}

/** Explicit "Save to company list": also clears details that were emptied, and can pin/unpin. */
export async function saveCompany(input: {
  id?: string
  name: string
  logoUrl: string
  info: EmployerInfo
  pinned?: boolean
  aliases?: string[]
}): Promise<Company | null> {
  try {
    const res = await fetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: input.id,
        name: input.name,
        logoUrl: input.logoUrl,
        replace: true,
        pinned: input.pinned,
        aliases: input.aliases,
        // send every field so emptied ones are cleared
        tradingName: input.info.tradingName ?? "",
        abn: input.info.abn ?? "",
        acn: input.info.acn ?? "",
        entityType: input.info.entityType ?? "",
        address: input.info.address ?? "",
        phone: input.info.phone ?? "",
        email: input.info.email ?? "",
        website: input.info.website ?? "",
        about: input.info.about ?? "",
      }),
    })
    if (!res.ok) return null
    return (await res.json()) as Company
  } catch {
    return null
  }
}

export async function deleteCompany(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/companies/${id}`, { method: "DELETE" })
    return res.ok
  } catch {
    return false
  }
}
