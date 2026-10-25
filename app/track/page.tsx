"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Loader2, Search, X, Sparkles } from "lucide-react"
import { EnquireModal } from "@/components/enquire-modal"
import { PaymentSection, type PaymentCredentials } from "@/components/payment-section"
import { formatCountry } from "@/lib/countries"
import { effectiveStage, STAGE_LABELS, type Application, type AppDocument } from "@/lib/admin/types"

type IconName =
  | "globe" | "passport" | "mail" | "phone" | "id" | "clock" | "calendar" | "building"
  | "plane" | "check" | "rejected" | "pending" | "shield" | "user" | "document" | "chat" | "alert"

// Realistic image icons live in /public/images/icons/<name>.svg
function Icon3D({ name, className = "size-full" }: { name: IconName; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/images/icons/${name}.svg`}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`${className} select-none object-contain`}
    />
  )
}

function isImageDataUrl(url?: string) {
  if (!url) return false
  if (url.startsWith("data:image/")) return true
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(url)
}

function isPdfDataUrl(url?: string) {
  if (!url) return false
  if (url.startsWith("data:application/pdf")) return true
  return /\.pdf(\?.*)?$/i.test(url)
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function TrackPageContent() {
  const searchParams = useSearchParams()
  const expectedCountry = searchParams.get("country") || ""
  const tokenParam = searchParams.get("token") || ""
  const passportParam = searchParams.get("passport") || ""
  const nationalIdParam = searchParams.get("nationalId") || ""
  const dobParam = searchParams.get("dob") || ""
  // Whichever identifier the user searched with (passport or national ID)
  const identifierParam = passportParam || nationalIdParam
  const identifierLabel = passportParam ? "passport number" : "national ID number"
  // A tracking-link token (admin-generated, shared directly with the applicant) grants
  // access on its own — no passport/NID or date of birth needed when it's present.
  // Without a token, both the identifier AND date of birth are required as before.
  const canSearch = !!tokenParam || (!!identifierParam && !!dobParam)

  const [result, setResult] = useState<Application | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!canSearch) return
    let cancelled = false

    async function run() {
      setLoading(true)
      setError("")
      setHasSearched(false)
      try {
        const params = tokenParam
          ? new URLSearchParams({ token: tokenParam })
          : new URLSearchParams(passportParam ? { passport: passportParam } : { nationalId: nationalIdParam })
        if (!tokenParam) {
          params.set("dob", dobParam)
          if (expectedCountry) params.set("country", expectedCountry)
        }
        const res = await fetch(`/api/visa-status?${params.toString()}`)
        if (cancelled) return
        if (res.ok) {
          const app = (await res.json()) as Application
          setResult(app)
          // Fire-and-forget: lets the admin dashboard bell know this applicant is
          // viewing their status right now. Never blocks or affects the UI.
          fetch("/api/notifications/visit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ applicationId: app.id }),
          }).catch(() => {})
        } else {
          const body = await res.json().catch(() => null)
          setResult(null)
          if (res.status === 429) {
            setError("Too many attempts. Please wait a few minutes and try again.")
          } else if (tokenParam) {
            setError("This tracking link is invalid or has been revoked. Please ask your consultant for a new link.")
          } else if (body?.error === "country_mismatch" && expectedCountry) {
            setError(
              `No ${expectedCountry} application was found for that ${identifierLabel} and date of birth. Please check the country you applied for and try again.`,
            )
          } else {
            setError(`No record found for that ${identifierLabel} and date of birth. Please check and try again.`)
          }
        }
      } catch {
        if (!cancelled) {
          setResult(null)
          setError("Something went wrong. Please try again.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setHasSearched(true)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [canSearch, tokenParam, passportParam, nationalIdParam, dobParam, expectedCountry, identifierLabel])

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-secondary">
      {/* Portal watermark — sits behind the entire /track page */}
      <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <Image
          src="/images/track-watermark.webp"
          alt=""
          fill
          sizes="1280px"
          quality={60}
          className="object-cover opacity-[0.22]"
        />
        <div className="absolute inset-0 bg-secondary/80" />
      </div>

      <div className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Global Migration Hub home">
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary">
              <img src="/icon.png" alt="Global Migration Hub" className="size-full object-cover" />
            </span>
            <span className="truncate font-serif text-lg font-semibold leading-tight text-foreground">
              Global Migration Hub
            </span>
          </Link>
          {result ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <Search className="size-4" /> New search
            </button>
          ) : (
            <Link
              href="/"
              className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Back home
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-md animate-in flex-col items-center justify-center px-4 py-14 text-center fade-in-0 duration-500">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted-foreground">
            Checking your {expectedCountry ? `${expectedCountry} ` : ""}application status…
          </p>
        </div>
      ) : result ? (
        <ApplicantProfile
          app={result}
          credentials={{
            passport: passportParam || undefined,
            nationalId: nationalIdParam || undefined,
            dob: dobParam,
          }}
        />
      ) : canSearch && hasSearched ? (
        <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-md animate-in flex-col items-center justify-center px-4 py-14 text-center fade-in-0 slide-in-from-bottom-4 duration-700 sm:px-6">
          <div className="flex size-16 items-center justify-center">
            <Icon3D name="alert" />
          </div>
          <h1 className="mt-5 font-serif text-2xl font-semibold text-foreground">No application found</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-accent px-7 text-base font-semibold text-accent-foreground transition hover:bg-accent/90"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-md animate-in flex-col items-center justify-center px-4 py-14 text-center fade-in-0 slide-in-from-bottom-4 duration-700 sm:px-6">
          <div className="flex size-16 items-center justify-center">
            <Icon3D name="shield" />
          </div>
          <h1 className="mt-5 font-serif text-3xl font-semibold text-foreground">Track your application</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {expectedCountry
              ? `Check your ${expectedCountry} application status using your passport/national ID and date of birth.`
              : "Enter the passport number or national ID number used on your application, along with your date of birth, to view real-time status updates."}
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-accent px-7 text-base font-semibold text-accent-foreground transition hover:bg-accent/90"
          >
            Check My Status
          </button>
          <p className="mt-5 flex items-start justify-center gap-2 text-center text-xs text-muted-foreground">
            <Icon3D name="shield" className="mt-0.5 size-5 shrink-0" />
            Bank-grade encryption on every lookup.
          </p>
        </div>
      )}

      <EnquireModal
        country={expectedCountry || undefined}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </main>
  )
}

function ApplicantProfile({ app, credentials }: { app: Application; credentials: PaymentCredentials }) {
  const stage = effectiveStage(app)
  const isRejected = stage === "rejected"
  const stageIndex = typeof stage === "number" ? stage : STAGE_LABELS.length - 1
  const progressPercent = isRejected ? 100 : (stageIndex / (STAGE_LABELS.length - 1)) * 100

  const [viewDoc, setViewDoc] = useState<{ doc: AppDocument; label: string } | null>(null)

  // --- Floating "message from your consultant" button -----------------------
  const [noteOpen, setNoteOpen] = useState(false)
  const [hasUnreadNote, setHasUnreadNote] = useState(false)
  const [showNoteToast, setShowNoteToast] = useState(false)
  const seenKey = `gmh_seen_note_${app.id}`

  useEffect(() => {
    if (!app.statusNote) return
    let lastSeen = ""
    try {
      lastSeen = window.localStorage.getItem(seenKey) ?? ""
    } catch {
      // localStorage unavailable (private mode, etc.) — treat as unseen every time.
    }
    if (lastSeen !== app.statusNote) {
      setHasUnreadNote(true)
      setShowNoteToast(true)
      const timer = setTimeout(() => setShowNoteToast(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [app.statusNote, seenKey])

  function openNote() {
    setNoteOpen(true)
    setShowNoteToast(false)
    setHasUnreadNote(false)
    try {
      window.localStorage.setItem(seenKey, app.statusNote ?? "")
    } catch {
      // Ignore — worst case the badge reappears next visit.
    }
  }

  const groupedDocuments = useMemo(() => {
    const map = new Map<string, AppDocument[]>()
    for (const doc of app.documents) {
      const key = doc.groupName?.trim() || "Other"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(doc)
    }
    return Array.from(map.entries())
  }, [app.documents])

  useEffect(() => {
    if (!viewDoc) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [viewDoc])

  const dobFormatted = app.dateOfBirth
    ? new Date(app.dateOfBirth).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "—"

  const rawDetails: { icon: IconName; label: string; value: string; wide?: boolean }[] = [
    { icon: "globe", label: "Nationality", value: app.nationality || "—" },
    { icon: "passport", label: "Passport Type", value: app.passportType || "—" },
    { icon: "mail", label: "Email", value: app.email || "—", wide: true },
    { icon: "phone", label: "Phone", value: app.phone || "—" },
    { icon: "id", label: "App. ID", value: `GMH-${app.id.replace(/\D/g, "").slice(-6) || "000000"}` },
    {
      icon: "clock",
      label: "Submitted",
      value: new Date(app.submittedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    },
    ...(app.travelDate
      ? [
          {
            icon: "calendar",
            label: "Travel Date",
            value: new Date(app.travelDate).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
          },
        ]
      : []),
    ...(app.applyingMethod === "agency" && app.agencyName
      ? [{ icon: "building", label: "Agency Name", value: app.agencyName, wide: true }]
      : []),
    ...(app.applyingMethod === "agency" && app.agencyReferenceNo
      ? [{ icon: "id", label: "Agency Reference No.", value: app.agencyReferenceNo, wide: true }]
      : []),
  ]

  // If an odd number of "paired" (non-wide) cards end up in the grid, the last one
  // is left alone in its row with an empty cell beside it. Auto-widen it instead of
  // leaving that gap — this adapts automatically to whichever optional fields
  // (Travel Date, Agency info, etc.) happen to be present for a given application.
  const pairedIndices = rawDetails.reduce<number[]>((acc, d, i) => {
    if (!d.wide) acc.push(i)
    return acc
  }, [])
  const details =
    pairedIndices.length % 2 === 1
      ? rawDetails.map((d, i) => (i === pairedIndices[pairedIndices.length - 1] ? { ...d, wide: true } : d))
      : rawDetails

  return (
    <div className="relative mx-auto max-w-4xl animate-in px-4 py-10 fade-in-0 slide-in-from-bottom-4 duration-700 sm:px-6 sm:py-14">
      {/* Ambient decoration — soft drifting color blobs behind the profile */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="animate-drift absolute -left-16 top-10 size-56 rounded-full bg-primary/10 blur-3xl" />
        <div
          className="animate-drift absolute -right-10 top-1/3 size-64 rounded-full bg-accent/10 blur-3xl"
          style={{ animationDelay: "2.5s" }}
        />
        <div
          className="animate-drift absolute bottom-0 left-1/3 size-48 rounded-full bg-tip-green/20 blur-3xl"
          style={{ animationDelay: "5s" }}
        />
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-xl">
        <Image
          src="/images/gmh-watermark.webp"
          alt=""
          fill
          sizes="896px"
          quality={70}
          aria-hidden="true"
          className="pointer-events-none object-cover opacity-[0.2]"
        />

        <div className="relative flex flex-col items-center gap-5 p-6 text-center sm:p-8">
          <div className="absolute right-4 top-4 hidden flex-col items-center gap-1 rounded-lg bg-background/95 p-1.5 shadow-md ring-1 ring-border sm:flex">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=88x88&margin=0&data=${encodeURIComponent(
                typeof window !== "undefined" ? `${window.location.origin}/track` : "https://globalmigrationhub.com/track",
              )}`}
              alt="QR code to return to this tracking page"
              width={64}
              height={64}
              className="size-16"
            />
            <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Scan to track</span>
          </div>

          <div className="relative">
            <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-primary/20 bg-primary/10 text-2xl font-semibold text-primary shadow-xl transition duration-500 hover:scale-105 sm:size-28">
              {app.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={app.photoUrl} alt={app.fullName} className="size-full object-cover" />
              ) : (
                <span>{initials(app.fullName) || <Icon3D name="user" className="size-14" />}</span>
              )}
            </div>
            <span className="absolute -bottom-2 -right-2 flex size-10 items-center justify-center">
              <span className="absolute inline-flex size-8 animate-ping rounded-full bg-tip-green/40" style={{ animationDuration: "2.5s" }} />
              <Icon3D name="shield" className="relative size-10 drop-shadow-md" />
            </span>
          </div>

          <div className="min-w-0 max-w-full">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Applicant</p>
            <h1 className="mt-1 break-words font-serif text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
              {app.fullName}
            </h1>
            {app.employerName && (
              <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-secondary/60 py-1.5 pl-1.5 pr-4 shadow-sm">
                <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-background p-0.5 ring-1 ring-border/60">
                  {app.employerLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={app.employerLogoUrl} alt={app.employerName} className="size-full object-contain" />
                  ) : (
                    <Icon3D name="building" className="size-5" />
                  )}
                </span>
                <span className="truncate text-xs font-medium text-foreground sm:text-sm">{app.employerName}</span>
              </div>
            )}
          </div>

          <div className="grid w-full grid-cols-2 gap-x-4 gap-y-4 border-t border-dashed border-border pt-5 text-left">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Passport No.</p>
              <p className="mt-0.5 break-all text-sm font-semibold text-foreground">{app.passportNumber || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Date of Birth</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{dobFormatted}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">National ID</p>
              <p className="mt-0.5 break-all text-sm font-semibold text-foreground">{app.nationalId || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Visa Type</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{app.visaType || "—"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Destination</p>
              <p className="mt-0.5 break-words text-sm font-semibold text-foreground">
                {app.destinationCountry ? formatCountry(app.destinationCountry) : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="relative border-t border-dashed border-border">
          <span className="absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-secondary" />
          <span className="absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-secondary" />
        </div>

        <div className="relative flex items-center justify-center gap-2 bg-secondary/40 px-6 py-3 text-xs font-medium text-muted-foreground sm:px-8">
          {isRejected ? (
            <>
              <Icon3D name="rejected" className="size-5" /> Application Rejected
            </>
          ) : (
            <>
              <Icon3D name="check" className="size-5" /> Current Stage: {STAGE_LABELS[stageIndex]}
            </>
          )}
        </div>
      </div>

      <div className="mt-10 animate-in overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm fade-in-0 slide-in-from-bottom-4 duration-700 fill-mode-both sm:p-8" style={{ animationDelay: "150ms" }}>
        <h2 className="mb-8 text-sm font-semibold text-foreground">Application Journey</h2>

        <div className="relative">
          <div className="absolute left-0 right-0 top-4 h-0.5 border-t-2 border-dashed border-border" />
          <div
            className={`absolute left-0 top-4 h-0.5 border-t-2 transition-all duration-700 ${
              isRejected ? "border-destructive" : "border-primary"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className="absolute top-0 -translate-x-1/2 -translate-y-1/2 transition-all duration-700"
            style={{ left: `${progressPercent}%` }}
          >
            <div
              className={`flex size-10 items-center justify-center rounded-full border-2 bg-card shadow-md ${
                isRejected ? "border-destructive" : "border-primary"
              } ${!isRejected && progressPercent < 100 ? "animate-pulse" : ""}`}
            >
              <Icon3D name="plane" className="size-7" />
            </div>
          </div>

          <div className="mt-10 grid grid-cols-4 gap-1.5 sm:gap-2">
            {STAGE_LABELS.map((label, i) => {
              const state = isRejected
                ? i <= 2
                  ? "done"
                  : "upcoming"
                : i < stageIndex
                  ? "done"
                  : i === stageIndex
                    ? "current"
                    : "upcoming"
              return (
                <div key={label} className="flex flex-col items-center text-center">
                  <span className="flex size-8 items-center justify-center">
                    <Icon3D
                      name={state === "done" ? "check" : state === "current" ? "clock" : "pending"}
                      className={`size-8 ${state === "upcoming" ? "opacity-70" : ""}`}
                    />
                  </span>
                  <span
                    className={`mt-2 text-[10px] font-medium leading-tight sm:text-xs ${
                      state === "upcoming" ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {i === 3 && isRejected ? "Rejected" : label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {details.map(({ icon, label, value, wide }, i) => (
          <div
            key={label}
            className={`flex min-w-0 animate-in items-start gap-2.5 rounded-xl border border-border bg-card p-3.5 shadow-sm fade-in-0 slide-in-from-bottom-3 fill-mode-both transition duration-500 hover:-translate-y-0.5 hover:shadow-md sm:gap-3 sm:p-4 ${
              wide ? "col-span-2" : ""
            }`}
            style={{ animationDelay: `${250 + i * 45}ms` }}
          >
            <div className="flex size-9 shrink-0 items-center justify-center sm:size-11">
              <Icon3D name={icon} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">{label}</p>
              <p className="break-words text-xs font-medium text-foreground sm:text-sm">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div
        className="mt-6 animate-in rounded-2xl border border-border bg-card p-6 shadow-sm fade-in-0 slide-in-from-bottom-4 duration-700 fill-mode-both sm:p-8"
        style={{ animationDelay: "350ms" }}
      >
        <h3 className="mb-4 text-sm font-semibold text-foreground">Documents</h3>
        {app.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents have been added yet.</p>
        ) : (
          <div className="space-y-7">
            {groupedDocuments.map(([groupName, docs]) => (
              <div key={groupName}>
                <h4 className="mb-3 font-serif text-lg font-bold text-foreground sm:text-xl">{groupName}</h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {docs.map((doc, index) => {
                    const label = docs.length > 1 ? `${groupName} ${index + 1}` : groupName
                    return (
                      <DocumentThumbnail key={doc.id} doc={doc} label={label} onOpen={() => setViewDoc({ doc, label })} />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PaymentSection app={app} credentials={credentials} />

      <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
        <Icon3D name="shield" className="mt-0.5 size-5 shrink-0" />
        This profile is only accessible with your correct ID number and date of birth together.
      </p>

      {viewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/80 p-4"
          onClick={() => setViewDoc(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <span className="truncate text-sm font-semibold text-foreground">{viewDoc.label}</span>
              <button
                type="button"
                onClick={() => setViewDoc(null)}
                aria-label="Close"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto overscroll-contain bg-secondary/20 p-2">
              {viewDoc.doc.dataUrl && isImageDataUrl(viewDoc.doc.dataUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewDoc.doc.dataUrl}
                  alt={viewDoc.label}
                  className="max-h-[75vh] w-auto max-w-full rounded-md object-contain"
                />
              ) : viewDoc.doc.dataUrl && isPdfDataUrl(viewDoc.doc.dataUrl) ? (
                <embed src={viewDoc.doc.dataUrl} type="application/pdf" className="h-[75vh] w-full" />
              ) : (
                <div className="flex items-center justify-center p-16">
                  <Icon3D name="document" className="size-16" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating message button — bobs gently; badges + auto-toast when the
          admin has left a new note (app.statusNote) that hasn't been opened yet. */}
      <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-2 sm:bottom-8 sm:right-8">
        {showNoteToast && (
          <button
            type="button"
            onClick={openNote}
            className="animate-pop-in flex max-w-[220px] items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 text-left shadow-lg"
          >
            <Sparkles className="size-4 shrink-0 text-accent-foreground" aria-hidden="true" />
            <span className="text-xs font-medium text-foreground">New message from your consultant</span>
          </button>
        )}
        <button
          type="button"
          onClick={openNote}
          aria-label="View message from Global Migration Hub"
          className="animate-float relative flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition hover:scale-105 active:scale-95"
        >
          <Icon3D name="chat" className="size-8" />
          {hasUnreadNote && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/70" />
              <span className="relative size-3 rounded-full border-2 border-card bg-destructive" />
            </span>
          )}
        </button>
      </div>

      {noteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={() => setNoteOpen(false)}
        >
          <div
            className="w-full max-w-sm animate-in overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl fade-in-0 slide-in-from-bottom-8 duration-300 sm:rounded-3xl sm:slide-in-from-bottom-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border bg-primary/5 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center">
                  <Icon3D name="chat" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Message from your consultant</p>
                  <p className="text-[11px] text-muted-foreground">Global Migration Hub</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNoteOpen(false)}
                aria-label="Close"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="px-5 py-6">
              {app.statusNote ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{app.statusNote}</p>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  No messages yet — your consultant will post updates here as your application progresses. Check
                  back anytime.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DocumentThumbnail({ doc, label, onOpen }: { doc: AppDocument; label: string; onOpen: () => void }) {
  if (!doc.dataUrl) {
    return (
      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-3 text-center">
        <Icon3D name="document" className="size-10" />
        <p className="text-xs font-medium leading-tight text-muted-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">Pending upload</p>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex aspect-[3/4] flex-col overflow-hidden rounded-xl border border-border bg-secondary/20 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative flex-1 overflow-hidden bg-muted/30">
        {isImageDataUrl(doc.dataUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doc.dataUrl}
            alt={label}
            className="absolute inset-0 size-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon3D name="document" className="size-12" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 border-t border-border bg-card px-2.5 py-2">
        <Icon3D name="document" className="size-4 shrink-0" />
        <span className="truncate text-xs font-medium text-foreground">{label}</span>
      </div>
    </button>
  )
}

export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <TrackPageContent />
    </Suspense>
  )
}
