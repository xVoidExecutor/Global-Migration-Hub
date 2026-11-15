"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Check, Loader2, X, Sparkles } from "lucide-react"
import { EnquireModal } from "@/components/enquire-modal"
import { EmployerCard } from "@/components/employer-card"
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
    <main className={`relative min-h-screen overflow-x-hidden ${result ? "bg-white" : "bg-secondary"}`}>
      {/* Portal watermark — shown on the search / loading / not-found screens only.
          Hidden on the applicant profile (result) so that page is plain white. */}
      {!result && (
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
      )}

      {/* Header: dark navy bar, logo + full site name (Home Affairs style) */}
      <header className="border-b-4 border-[#00698f] bg-[#002664] text-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="Global Migration Hub home">
            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-black ring-1 ring-white/30">
              <img src="/icon.png" alt="Global Migration Hub" className="size-full object-cover" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="whitespace-nowrap text-xl font-bold tracking-tight sm:text-2xl">Global Migration Hub</span>
              <span className="whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.14em] text-white/80 sm:text-[11px] sm:tracking-[0.22em]">
                Visa &amp; Immigration Consultancy
              </span>
            </span>
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="mx-auto flex min-h-[calc(100vh-76px)] max-w-md animate-in flex-col items-center justify-center px-4 py-14 text-center fade-in-0 duration-500">
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
        <div className="mx-auto flex min-h-[calc(100vh-76px)] max-w-md animate-in flex-col items-center justify-center px-4 py-14 text-center fade-in-0 slide-in-from-bottom-4 duration-700 sm:px-6">
          <div className="flex size-16 items-center justify-center">
            <Icon3D name="alert" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-[#002664]">No application found</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-sm bg-[#002664] px-7 text-base font-semibold text-white transition hover:bg-[#00698f] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00698f]"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="mx-auto flex min-h-[calc(100vh-76px)] max-w-md animate-in flex-col items-center justify-center px-4 py-14 text-center fade-in-0 slide-in-from-bottom-4 duration-700 sm:px-6">
          <div className="flex size-16 items-center justify-center">
            <Icon3D name="shield" />
          </div>
          <h1 className="mt-5 text-3xl font-bold text-[#002664]">Track your application</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {expectedCountry
              ? `Check your ${expectedCountry} application status using your passport/national ID and date of birth.`
              : "Enter the passport number or national ID number used on your application, along with your date of birth, to view real-time status updates."}
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-8 flex h-12 w-full items-center justify-center rounded-sm bg-[#002664] px-7 text-base font-semibold text-white transition hover:bg-[#00698f] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00698f]"
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

  const isComplete = !isRejected && stageIndex === STAGE_LABELS.length - 1
  const statusColor = isRejected ? "border-[#b81237]" : isComplete ? "border-[#1f7a3d]" : "border-[#00698f]"
  const statusText = isRejected ? "text-[#b81237]" : isComplete ? "text-[#1f7a3d]" : "text-[#002664]"

  const infoRows: { label: string; value: string }[] = [
    { label: "Passport number", value: app.passportNumber || "—" },
    { label: "Date of birth", value: dobFormatted },
    { label: "National ID", value: app.nationalId || "—" },
    { label: "Visa type", value: app.visaType || "—" },
    { label: "Destination country", value: app.destinationCountry ? formatCountry(app.destinationCountry) : "—" },
    ...rawDetails.map((d) => ({ label: d.label, value: d.value })),
  ]

  return (
    <div className="relative mx-auto max-w-4xl animate-in px-4 py-6 text-[#313131] fade-in-0 duration-500 sm:px-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="text-[#00698f] underline underline-offset-2 hover:text-[#002664]">
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="text-[#6b7280]">›</li>
          <li>
            <Link href="/track" className="text-[#00698f] underline underline-offset-2 hover:text-[#002664]">
              Visa status check
            </Link>
          </li>
          <li aria-hidden="true" className="text-[#6b7280]">›</li>
          <li aria-current="page">Application details</li>
        </ol>
      </nav>

      <h1 className="mt-5 text-3xl font-bold leading-tight text-[#002664] sm:text-4xl">Visa application status</h1>
      <p className="mt-2 text-base text-[#4b5563]">The latest information held for this applicant.</p>

      <div role="status" className={`mt-6 border-l-[6px] bg-[#f5f7fa] p-4 sm:p-5 ${statusColor}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#4b5563]">Application status</p>
        <p className={`mt-1 text-xl font-bold sm:text-2xl ${statusText}`}>
          {isRejected ? "Application rejected" : STAGE_LABELS[stageIndex]}
        </p>
      </div>

      <section aria-labelledby="applicant-heading" className="mt-8 border border-[#cfd6de] bg-white">
        <h2 id="applicant-heading" className="border-b border-[#cfd6de] bg-[#f5f7fa] px-4 py-3 text-lg font-bold text-[#002664] sm:px-6">
          Applicant
        </h2>
        <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-start sm:gap-6 sm:p-6">
          <div className="flex shrink-0 flex-col items-start gap-2">
            <div className="flex size-28 items-center justify-center overflow-hidden rounded-sm border border-[#cfd6de] bg-[#f5f7fa] text-2xl font-semibold text-[#002664] sm:size-32">
              {app.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={app.photoUrl} alt={app.fullName} className="size-full object-cover" />
              ) : (
                <span>{initials(app.fullName) || <Icon3D name="user" className="size-14" />}</span>
              )}
            </div>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#1f7a3d]">
              <Icon3D name="shield" className="size-5" /> Identity verified
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#4b5563]">Applicant name</p>
            <p className="mt-0.5 break-words text-2xl font-bold leading-tight text-[#002664] sm:text-3xl">{app.fullName}</p>
            {app.employerName && (
              <div className="mt-4 flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[#cfd6de] bg-white p-1 sm:size-14">
                  {app.employerLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={app.employerLogoUrl} alt={app.employerName} className="size-full object-contain" />
                  ) : (
                    <Icon3D name="building" className="size-6" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#4b5563]">Employer</p>
                  <p className="break-words text-lg font-bold leading-snug text-[#00698f] sm:text-xl">{app.employerName}</p>
                </div>
              </div>
            )}
          </div>

          <div className="hidden shrink-0 flex-col items-center gap-1 border border-[#cfd6de] p-1.5 sm:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=88x88&margin=0&data=${encodeURIComponent(
                typeof window !== "undefined" ? `${window.location.origin}/track` : "https://globalmigrationhub.com/track",
              )}`}
              alt="QR code to return to this tracking page"
              width={64}
              height={64}
              className="size-16"
            />
            <span className="text-[9px] font-semibold uppercase tracking-wide text-[#4b5563]">Scan to track</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="progress-heading" className="mt-8 border border-[#cfd6de] bg-white">
        <h2 id="progress-heading" className="border-b border-[#cfd6de] bg-[#f5f7fa] px-4 py-3 text-lg font-bold text-[#002664] sm:px-6">
          Application progress
        </h2>
        <ol className="p-4 sm:p-6">
          {STAGE_LABELS.map((label, i) => {
            const state = isRejected
              ? i <= 2
                ? "done"
                : i === 3
                  ? "rejected"
                  : "upcoming"
              : i < stageIndex || (isComplete && i === stageIndex)
                ? "done"
                : i === stageIndex
                  ? "current"
                  : "upcoming"
            const circle =
              state === "done"
                ? "border-[#1f7a3d] bg-[#1f7a3d] text-white"
                : state === "current"
                  ? "border-[#00698f] bg-white text-[#00698f]"
                  : state === "rejected"
                    ? "border-[#b81237] bg-[#b81237] text-white"
                    : "border-[#cfd6de] bg-white text-[#6b7280]"
            const caption =
              state === "done" ? "Completed" : state === "current" ? "In progress" : state === "rejected" ? "Not approved" : "Not started"
            return (
              <li key={label} className="relative flex gap-4 pb-6 last:pb-0">
                {i < STAGE_LABELS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${state === "done" ? "bg-[#1f7a3d]" : "bg-[#cfd6de]"}`}
                  />
                )}
                <span className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${circle}`}>
                  {state === "done" ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : state === "rejected" ? (
                    <X className="size-4" aria-hidden="true" />
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className={`text-base font-semibold ${state === "upcoming" ? "text-[#6b7280]" : "text-[#313131]"}`}>
                    {i === 3 && isRejected ? "Rejected" : label}
                  </p>
                  <p className="text-sm text-[#4b5563]">{caption}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      <section aria-labelledby="info-heading" className="mt-8 border border-[#cfd6de] bg-white">
        <h2 id="info-heading" className="border-b border-[#cfd6de] bg-[#f5f7fa] px-4 py-3 text-lg font-bold text-[#002664] sm:px-6">
          Application information
        </h2>
        <dl className="px-4 sm:px-6">
          {infoRows.map(({ label, value }) => (
            <div key={label} className="grid grid-cols-1 gap-0.5 border-b border-[#e5e9ee] py-3 last:border-b-0 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-semibold text-[#313131]">{label}</dt>
              <dd className="min-w-0 break-words text-base text-[#313131] sm:col-span-2">{value}</dd>
            </div>
          ))}
        </dl>
        {app.employerName && (
          <div className="border-t border-[#cfd6de] p-4 sm:p-6">
            <EmployerCard name={app.employerName} logoUrl={app.employerLogoUrl} info={app.employerInfo ?? {}} />
          </div>
        )}
      </section>

      <div className="mt-8 border border-[#cfd6de] bg-white p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-[#002664]">Documents</h2>
        {app.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents have been added yet.</p>
        ) : (
          <div className="space-y-7">
            {groupedDocuments.map(([groupName, docs]) => (
              <div key={groupName}>
                <h4 className="mb-3 text-lg font-bold text-foreground sm:text-xl">{groupName}</h4>
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

      <div className="mt-8 flex items-start gap-3 border-l-[6px] border-[#00698f] bg-[#f0f7fa] p-4 text-sm text-[#313131]">
        <Icon3D name="shield" className="mt-0.5 size-5 shrink-0" />
        <p>This profile is only accessible with your correct ID number and date of birth together.</p>
      </div>

      {viewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/80 p-4"
          onClick={() => setViewDoc(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-sm bg-card shadow-2xl"
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
            className="animate-pop-in flex max-w-[220px] items-center gap-2 rounded-sm border border-border bg-card px-3.5 py-2.5 text-left shadow-lg"
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
            className="w-full max-w-sm animate-in overflow-hidden rounded-t-sm border border-border bg-card shadow-2xl fade-in-0 slide-in-from-bottom-8 duration-300 sm:rounded-sm sm:slide-in-from-bottom-4"
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
      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border bg-muted/30 p-3 text-center">
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
      className="group flex aspect-[3/4] flex-col overflow-hidden rounded-sm border border-border bg-secondary/20 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
