import { COMPANIES_KEY, DEFAULT_PINNED_COMPANIES, sortCompanies, type Company } from "@/lib/companies"
import type { getRedis } from "@/lib/admin/redis"

type RedisClient = Awaited<ReturnType<typeof getRedis>>

/**
 * Reads the saved company list (pinned first, then A–Z). The permanent pinned companies are created
 * here if they are missing; existing records — including admin edits — are never overwritten.
 */
export async function loadCompanies(redis: RedisClient): Promise<Company[]> {
  const now = new Date().toISOString()
  for (const seed of DEFAULT_PINNED_COMPANIES) {
    const created: Company = { ...seed, createdAt: now, updatedAt: now }
    await redis.hSetNX(COMPANIES_KEY, seed.id, JSON.stringify(created))
  }

  const all = await redis.hGetAll(COMPANIES_KEY)
  const companies: Company[] = []
  for (const raw of Object.values(all) as string[]) {
    try {
      companies.push(JSON.parse(raw) as Company)
    } catch {
      // skip a corrupted row rather than failing the whole list
    }
  }
  return sortCompanies(companies)
}
