import { NextResponse } from "next/server"
import { requireAdminAuth } from "@/lib/admin/require-auth"
import { getRedis } from "@/lib/admin/redis"
import { COMPANIES_KEY, type Company } from "@/lib/companies"

export const dynamic = "force-dynamic"

/** Admin: remove a company from the saved list. Existing applications keep their own copy of name + logo. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  const { id } = await params
  if (!/^[a-zA-Z0-9_-]{3,40}$/.test(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 })
  }

  const redis = await getRedis()
  const raw = await redis.hGet(COMPANIES_KEY, id)
  if (raw) {
    try {
      if ((JSON.parse(raw) as Company).locked) {
        return NextResponse.json({ error: "This company is permanent and cannot be removed." }, { status: 400 })
      }
    } catch {
      // unreadable row: allow deleting it
    }
  }
  await redis.hDel(COMPANIES_KEY, id)
  return NextResponse.json({ ok: true })
}
