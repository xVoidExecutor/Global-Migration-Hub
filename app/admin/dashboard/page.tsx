"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, FileStack, Hourglass, Search, ShieldX, Sparkles, User, XCircle } from "lucide-react"
import { ApplicationModal } from "@/components/admin/application-modal"
import { NewApplicationModal } from "@/components/admin/new-application-modal"
import { AdminTopNav } from "@/components/admin/admin-top-nav"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { isLoggedIn } from "@/lib/admin/auth"
import { formatCountry } from "@/lib/countries"
import {
  getApplications,
  addApplication,
  updateApplication,
  deleteApplication,
  addDocument,
} from "@/lib/admin/data"
import {
  effectiveStage,
  stageLabel,
  type Application,
  type ManualStatus,
  type NewApplicationInput,
} from "@/lib/admin/types"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function statusBadgeClass(app: Application) {
  const stage = effectiveStage(app)
  if (stage === "rejected") return "bg-destructive/10 text-destructive"
  if (stage === 3) return "bg-tip-green text-tip-green-foreground"
  if (stage === 0) return "bg-muted text-muted-foreground"
  return "bg-tip-yellow text-tip-yellow-foreground"
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [apps, setApps] = useState<Application[]>([])
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

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
      (a) => a.fullName.toLowerCase().includes(q) || a.passportNumber.toLowerCase().includes(q),
    )
  }, [apps, search])

  const stats = useMemo(() => {
    const counts = { total: apps.length, processing: 0, verified: 0, approved: 0, rejected: 0 }
    for (const app of apps) {
      const stage = effectiveStage(app)
      if (stage === "rejected") counts.rejected++
      else if (stage === 1) counts.processing++
      else if (stage === 2) counts.verified++
      else if (stage === 3) counts.approved++
    }
    return counts
  }, [apps])

  async function refresh() {
    setRefreshing(true)
    const data = await getApplications()
    setApps(data)
    setRefreshing(false)
  }

  async function handleCreate(input: NewApplicationInput) {
    await addApplication(input)
    await refresh()
  }

  async function handleUpdateStatus(id: string, status: ManualStatus, note: string) {
    await updateApplication(id, { manualStatus: status, statusNote: note })
    await refresh()
  }

  async function handleSaveNotes(id: string, notes: string) {
    await updateApplication(id, { internalNotes: notes })
    await refresh()
  }

  async function handleUpdateSubmittedAt(id: string, submittedAt: string) {
    await updateApplication(id, { submittedAt })
    await refresh()
  }

  async function handleUpdateProfile(id: string, patch: Partial<Application>) {
    await updateApplication(id, patch)
    await refresh()
  }

  async function handleDelete(id: string) {
    await deleteApplication(id)
    setSelectedId(null)
    await refresh()
  }

  async function handleAddDocument(id: string, doc: { name: string; dataUrl?: string; groupName: string }) {
    await addDocument(id, doc)
    await refresh()
  }

  const selectedApp = apps.find((a) => a.id === selectedId) ?? null

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </main>
    )
  }

  const statTiles = [
    { label: "Total Applications", value: stats.total, icon: FileStack, tone: "bg-tip-blue text-tip-blue-foreground" },
    { label: "Processing", value: stats.processing, icon: Hourglass, tone: "bg-tip-yellow text-tip-yellow-foreground" },
    { label: "Document Verified", value: stats.verified, icon: Sparkles, tone: "bg-tip-purple text-tip-purple-foreground" },
    { label: "Approved", value: stats.approved, icon: ShieldX, tone: "bg-tip-green text-tip-green-foreground" },
    { label: "Rejected", value: stats.rejected, icon: XCircle, tone: "bg-tip-peach text-tip-peach-foreground" },
  ]

  return (
    <main className="min-h-screen overflow-x-hidden bg-secondary/30 pb-16">
      <AdminTopNav />

      <div className="mx-auto max-w-7xl min-w-0 px-4 py-6 sm:px-6">
        <div className="flex min-w-0 flex-col gap-6 lg:flex-row">
          <AdminSidebar active="overview" onNewApplication={() => setShowNewModal(true)} />

          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 lg:hidden"
            >
              + New application
            </button>
            {refreshing && (
              <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" /> Syncing…
              </p>
            )}

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
              {statTiles.map((s) => (
                <div
                  key={s.label}
                  className={`min-w-0 rounded-2xl p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 ${s.tone}`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <s.icon className="size-3.5 shrink-0 opacity-80 sm:size-4" />
                    <div className="min-w-0 break-words text-[11px] leading-tight opacity-80 sm:text-xs">{s.label}</div>
                  </div>
                  <div className="mt-1 text-xl font-bold sm:text-2xl">{s.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <h3 className="min-w-0 font-serif text-base font-semibold text-foreground">
                  All Applications
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {filtered.length}
                  </span>
                </h3>
                <div className="relative w-full sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or passport number..."
                    className="w-full rounded-xl border border-input bg-background py-2 pl-8 pr-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
              </div>

              {filtered.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">No applications found yet.</p>
              ) : (
                <div className="grid min-w-0 grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
                  {filtered.map((app, i) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setSelectedId(app.id)}
                      style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                      className="group flex min-w-0 animate-in flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm fade-in-0 slide-in-from-bottom-2 fill-mode-both transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md active:translate-y-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-primary/10 text-sm font-semibold text-primary">
                          {app.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={app.photoUrl} alt={app.fullName} className="size-full object-cover" />
                          ) : (
                            <span>{initials(app.fullName) || <User className="size-5" />}</span>
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold leading-snug text-foreground">{app.fullName}</p>
                          <p className="break-all font-mono text-xs tracking-wide text-muted-foreground">
                            {app.passportNumber || app.nationalId || "No ID on file"}
                          </p>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>

                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-t border-dashed border-border pt-3">
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusBadgeClass(app)}`}>
                          {stageLabel(app)}
                        </span>
                        <span className="min-w-0 break-words text-right text-xs text-muted-foreground">
                          {app.destinationCountry ? formatCountry(app.destinationCountry) : "—"}
                        </span>
                      </div>

                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="min-w-0 break-words">{app.visaType || "—"}</span>
                        <span>Submitted {formatDate(app.submittedAt)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedApp && (
        <ApplicationModal
          app={selectedApp}
          onClose={() => setSelectedId(null)}
          onUpdateStatus={handleUpdateStatus}
          onSaveNotes={handleSaveNotes}
          onDelete={handleDelete}
          onAddDocument={handleAddDocument}
          onUpdateSubmittedAt={handleUpdateSubmittedAt}
          onUpdateProfile={handleUpdateProfile}
        />
      )}

      {showNewModal && <NewApplicationModal onClose={() => setShowNewModal(false)} onCreate={handleCreate} />}
    </main>
  )
}

