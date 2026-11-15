"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, FileStack, Search } from "lucide-react"
import { AdminTopNav } from "@/components/admin/admin-top-nav"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { isLoggedIn } from "@/lib/admin/auth"
import { getApplications } from "@/lib/admin/data"
import { formatCountry } from "@/lib/countries"
import { effectiveStage, stageLabel, type Application } from "@/lib/admin/types"
import { SLOT_NAMES } from "@/lib/admin/document-slots"

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

function badgeClass(app: Application) {
  const stage = effectiveStage(app)
  if (stage === "rejected") return "bg-destructive/10 text-destructive"
  if (stage === 3) return "bg-tip-green text-tip-green-foreground"
  if (stage === 0) return "bg-muted text-muted-foreground"
  return "bg-tip-yellow text-tip-yellow-foreground"
}

function slotsFilled(app: Application) {
  const groups = new Set((app.documents ?? []).filter((d) => d.dataUrl).map((d) => d.groupName?.trim()))
  return SLOT_NAMES.filter((n) => groups.has(n)).length
}

export default function AdminDocumentsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [apps, setApps] = useState<Application[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    isLoggedIn().then((ok) => {
      if (!ok) {
        router.replace("/admin/login")
        return
      }
      getApplications().then((data) => {
        setApps(data)
        setReady(true)
      })
    })
  }, [router])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return apps
    return apps.filter(
      (a) =>
        a.fullName.toLowerCase().includes(q) ||
        a.passportNumber.toLowerCase().includes(q) ||
        a.destinationCountry.toLowerCase().includes(q),
    )
  }, [apps, search])

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-secondary/30 pb-16">
      <AdminTopNav />

      <div className="mx-auto max-w-7xl min-w-0 px-4 py-6 sm:px-6">
        <div className="flex min-w-0 flex-col gap-6 lg:flex-row">
          <div className="hidden lg:block">
            <AdminSidebar active="documents" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileStack className="size-5" />
              </span>
              <div>
                <h1 className="font-serif text-xl font-bold text-foreground">Documents</h1>
                <p className="text-sm text-muted-foreground">Choose an application to manage its documents.</p>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, passport or country"
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
                No applications found.
              </div>
            ) : (
              <ul className="space-y-2.5">
                {filtered.map((app) => (
                  <li key={app.id}>
                    <Link
                      href={`/admin/documents/${app.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {initials(app.fullName) || "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-medium leading-snug text-foreground">{app.fullName}</p>
                        <p className="break-words text-xs text-muted-foreground">
                          {app.visaType || "Visa"} · {app.destinationCountry ? formatCountry(app.destinationCountry) : "-"}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(app)}`}>
                            {stageLabel(app)}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {slotsFilled(app)} of {SLOT_NAMES.length} documents
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
