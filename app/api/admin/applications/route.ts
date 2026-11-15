import { NextResponse } from "next/server"
import { getRedis } from "@/lib/admin/redis"
import { requireAdminAuth } from "@/lib/admin/require-auth"
import type { Application, NewApplicationInput } from "@/lib/admin/types"
import { generateReferenceNo } from "@/lib/admin/reference"

export const dynamic = "force-dynamic"

const KEY = "gmh:applications"

export async function GET(request: Request) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  const redis = await getRedis()
  const raw = await redis.get(KEY)
  const apps: Application[] = raw ? JSON.parse(raw) : []
  return NextResponse.json(apps)
}

export async function POST(request: Request) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  const input = (await request.json()) as NewApplicationInput
  const redis = await getRedis()
  const raw = await redis.get(KEY)
  const apps: Application[] = raw ? JSON.parse(raw) : []

  const usedRefs = new Set(apps.map((a) => a.agencyReferenceNo).filter(Boolean))
  const agencyReferenceNo = input.applyingMethod === "agency" ? generateReferenceNo(usedRefs) : ""

  const newApp: Application = {
    ...input,
    agencyReferenceNo,
    documents: input.documents ?? [],
    id: `app_${Date.now()}`,
    submittedAt: new Date().toISOString(),
    manualStatus: "auto",
    statusNote: "",
    internalNotes: "",
  }

  const updated = [newApp, ...apps]
  await redis.set(KEY, JSON.stringify(updated))

  return NextResponse.json(newApp, { status: 201 })
}
