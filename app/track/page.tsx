"use client"

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Check, Loader2, X, Sparkles } from "lucide-react"
import { EnquireModal } from "@/components/enquire-modal"
import { EmployerCard } from "@/components/employer-card"
import { BrandLogo } from "@/components/brand-logo"
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

// useLayoutEffect on the client (no flicker), useEffect on the server (no warning)
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

/**
 * Auto-fit text: starts at `max` px and shrinks (down to `min` px) until the text fits on ONE line
 * inside its parent box. If it still doesn't fit at `min`, it wraps onto more lines instead.
 * Re-fits automatically when the box is resized (rotate phone, resize window) or fonts finish loading.
 */
function FitText({
  children,
  max = 14,
  min = 10,
  className = "",
}: {
  children: string
  max?: number
  min?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useIsoLayoutEffect(() => {
    const el = ref.current
    const box = el?.parentElement
    if (!el || !box) return

    const fit = () => {
      const available = box.clientWidth
      if (available <= 0) return
      el.style.display = "inline-block"
      el.style.whiteSpace = "nowrap"
      let size = max
      el.style.fontSize = `${size}px`
      while (size > min && el.offsetWidth > available) {
        size -= 0.5
        el.style.fontSize = `${size}px`
      }
      if (el.offsetWidth > available) {
        // too long even at the smallest size → allow wrapping
        el.style.display = "block"
        el.style.whiteSpace = "normal"
      }
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    document.fonts?.ready.then(fit).catch(() => {})
    return () => observer.disconnect()
  }, [children, max, min])

  return (
    <span ref={ref} className={`break-words ${className}`} style={{ fontSize: max }}>
      {children}
    </span>
  )
}

type InfoTile = { icon: IconName; label: string; value: string; wide?: boolean }

/** Pairs tiles two-per-row; a lone tile (before a wide tile, or last) is stretched so no gaps are left. */
function arrangeTiles(tiles: InfoTile[]): InfoTile[] {
  const out: InfoTile[] = []
  let pending: InfoTile | null = null
  for (const tile of tiles) {
    if (tile.wide) {
      if (pending) {
        out.push({ ...pending, wide: true })
        pending = null
      }
      out.push(tile)
    } else if (pending) {
      out.push(pending, tile)
      pending = null
    } else {
      pending = tile
    }
  }
  if (pending) out.push({ ...pending, wide: true })
  return out
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
            <BrandLogo tone="light" size="md" />
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

function SectionCard({
  id,
  icon,
  title,
  aside,
  children,
}: {
  id: string
  icon: IconName
  title: string
  aside?: string
  children: React.ReactNode
}) {
  return (
    <section
      aria-labelledby={id}
      className="mt-6 overflow-hidden rounded-2xl border border-[#dbe3ec] bg-white shadow-[0_2px_10px_rgba(0,38,100,0.06)]"
    >
      <div className="flex items-center gap-3 border-b border-[#e5ebf2] bg-gradient-to-r from-[#eef4fb] to-white px-4 py-3 sm:px-6">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-[#dbe3ec]">
          <Icon3D name={icon} />
        </span>
        <h2 id={id} className="flex-1 text-base font-bold text-[#002664] sm:text-lg">
          {title}
        </h2>
        {aside && (
          <span className="rounded-full bg-[#e3edf8] px-2.5 py-1 text-xs font-semibold text-[#002664]">{aside}</span>
        )}
      </div>
      {children}
    </section>
  )
}

function ApplicantProfile({ app, credentials }: { app: Application; credentials: PaymentCredentials }) {
  const stage = effectiveStage(app)
  const isRejected = stage === "rejected"
  const stageIndex = typeof stage === "number" ? stage : STAGE_LABELS.length - 1

  const [viewDoc, setViewDoc] = useState<{ doc: AppDocument; label: string } | null>(null)

  // QR code (small, on the applicant's photo) → opens the public tracking page
  const [origin, setOrigin] = useState("https://globalmigrationhub.com")
  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(`${origin}/track`)}`

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

  const fmtDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

  const dobFormatted = app.dateOfBirth ? fmtDate(app.dateOfBirth) : "—"
  const appCode = `GMH-${app.id.replace(/\D/g, "").slice(-6) || "000000"}`

  // Shown two per row (side by side). `wide` tiles take the full row.
  const infoTiles = arrangeTiles([
    { icon: "passport", label: "Passport No.", value: app.passportNumber || "—" },
    { icon: "id", label: "National ID", value: app.nationalId || "—" },
    { icon: "calendar", label: "Date of birth", value: dobFormatted },
    { icon: "globe", label: "Nationality", value: app.nationality || "—" },
    { icon: "document", label: "Visa type", value: app.visaType || "—" },
    {
      icon: "plane",
      label: "Destination",
      value: app.destinationCountry ? formatCountry(app.destinationCountry) : "—",
    },
    { icon: "passport", label: "Passport type", value: app.passportType || "—" },
    { icon: "phone", label: "Phone", value: app.phone || "—" },
    { icon: "mail", label: "Email", value: app.email || "—", wide: true },
    { icon: "id", label: "App. ID", value: appCode },
    { icon: "clock", label: "Submitted", value: fmtDate(app.submittedAt) },
    ...(app.travelDate ? [{ icon: "calendar" as IconName, label: "Travel date", value: fmtDate(app.travelDate) }] : []),
    ...(app.applyingMethod === "agency" && app.agencyReferenceNo
      ? [{ icon: "id" as IconName, label: "Agency ref. no.", value: app.agencyReferenceNo }]
      : []),
    ...(app.applyingMethod === "agency" && app.agencyName
      ? [{ icon: "building" as IconName, label: "Agency name", value: app.agencyName, wide: true }]
      : []),
  ])

  const isComplete = !isRejected && stageIndex === STAGE_LABELS.length - 1
  const bannerTone = isRejected
    ? "from-[#8f0f2c] to-[#b81237]"
    : isComplete
      ? "from-[#14582c] to-[#1f7a3d]"
      : "from-[#002664] to-[#00698f]"
  const bannerIcon: IconName = isRejected ? "rejected" : isComplete ? "check" : "clock"

  return (
    <div className="relative mx-auto max-w-4xl animate-in px-4 py-6 text-[#313131] fade-in-0 duration-500 sm:px-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-xs sm:text-sm">
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

      <h1 className="mt-4 text-2xl font-bold leading-tight text-[#002664] sm:text-3xl">Visa application status</h1>
      <p className="mt-1.5 text-sm text-[#4b5563]">The latest information held for this applicant.</p>

      {/* Status banner */}
      <div
        role="status"
        className={`mt-5 flex items-center gap-3.5 rounded-2xl bg-gradient-to-r ${bannerTone} p-3.5 text-white shadow-lg sm:gap-4 sm:p-4`}
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-md sm:size-14">
          <Icon3D name={bannerIcon} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">Application status</p>
          <p className="mt-0.5 text-lg font-bold leading-tight sm:text-xl">
            {isRejected ? "Application rejected" : STAGE_LABELS[stageIndex]}
          </p>
        </div>
        <span className="hidden rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/30 sm:inline-block">
          {appCode}
        </span>
      </div>

      {/* Applicant */}
      <SectionCard id="applicant-heading" icon="user" title="Applicant">
        <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-start sm:gap-6 sm:p-6">
          <div className="flex shrink-0 flex-col items-start gap-3.5">
            {/* Photo with a small QR code on its bottom-right corner (visible on mobile too) */}
            <div className="relative">
              <div className="flex size-28 items-center justify-center overflow-hidden rounded-xl border-2 border-white bg-[#eef4fb] text-2xl font-semibold text-[#002664] shadow-md ring-1 ring-[#dbe3ec] sm:size-32">
                {app.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={app.photoUrl} alt={app.fullName} className="size-full object-cover" />
                ) : (
                  <span>{initials(app.fullName) || <Icon3D name="user" className="size-14" />}</span>
                )}
              </div>
              <div className="absolute -bottom-2.5 -right-2.5 rounded-lg border border-[#dbe3ec] bg-white p-[3px] shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrSrc}
                  alt="QR code — scan to open the tracking page"
                  width={44}
                  height={44}
                  className="size-11 sm:size-12"
                />
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f5ec] px-2.5 py-1 text-[11px] font-semibold text-[#1f7a3d] ring-1 ring-[#bfe3cb]">
              <Icon3D name="shield" className="size-4" /> Identity verified
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4b5563]">Applicant name</p>
            <p className="mt-0.5 min-w-0 font-bold leading-tight text-[#002664]">
              <FitText max={26} min={16}>
                {app.fullName}
              </FitText>
            </p>
            {app.employerName && (
              <div className="mt-3.5 flex items-center gap-3 rounded-xl border border-[#e5ebf2] bg-[#f7f9fc] p-2.5">
                <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#dbe3ec] bg-white p-1 sm:size-12">
                  {app.employerLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={app.employerLogoUrl} alt={app.employerName} className="size-full object-contain" />
                  ) : (
                    <Icon3D name="building" className="size-6" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4b5563]">Employer</p>
                  <p className="min-w-0 font-bold leading-snug text-[#00698f]">
                    <FitText max={17} min={12}>
                      {app.employerName}
                    </FitText>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Progress */}
      <SectionCard id="progress-heading" icon="pending" title="Application progress">
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
                ? "border-[#1f7a3d] bg-[#1f7a3d] text-white shadow-md shadow-[#1f7a3d]/30"
                : state === "current"
                  ? "border-[#00698f] bg-white text-[#00698f] ring-4 ring-[#00698f]/15"
                  : state === "rejected"
                    ? "border-[#b81237] bg-[#b81237] text-white shadow-md shadow-[#b81237]/30"
                    : "border-[#cfd6de] bg-white text-[#6b7280]"
            const rowTone =
              state === "current"
                ? "border-[#bcd9e6] bg-[#f0f7fa]"
                : state === "done"
                  ? "border-[#cfe8d8] bg-[#f4fbf6]"
                  : state === "rejected"
                    ? "border-[#f0c2cc] bg-[#fdf3f5]"
                    : "border-[#e5ebf2] bg-white"
            const caption =
              state === "done" ? "Completed" : state === "current" ? "In progress" : state === "rejected" ? "Not approved" : "Not started"
            const captionTone =
              state === "done"
                ? "bg-[#e7f5ec] text-[#1f7a3d]"
                : state === "current"
                  ? "bg-[#e0f0f7] text-[#00698f]"
                  : state === "rejected"
                    ? "bg-[#fbe3e8] text-[#b81237]"
                    : "bg-[#eef1f5] text-[#6b7280]"
            return (
              <li key={label} className="relative flex gap-4 pb-4 last:pb-0">
                {i < STAGE_LABELS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-0.5 ${state === "done" ? "bg-[#1f7a3d]" : "bg-[#cfd6de]"}`}
                  />
                )}
                <span className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${circle}`}>
                  {state === "done" ? (
                    <Check className="size-5" aria-hidden="true" />
                  ) : state === "rejected" ? (
                    <X className="size-5" aria-hidden="true" />
                  ) : (
                    i + 1
                  )}
                </span>
                <div className={`flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${rowTone}`}>
                  <p className={`text-sm font-semibold sm:text-base ${state === "upcoming" ? "text-[#6b7280]" : "text-[#1f2937]"}`}>
                    {i === 3 && isRejected ? "Rejected" : label}
                  </p>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${captionTone}`}>{caption}</span>
                </div>
              </li>
            )
          })}
        </ol>
      </SectionCard>

      {/* Information */}
      <SectionCard id="info-heading" icon="id" title="Application information">
        <dl className="grid grid-cols-2 gap-2.5 p-3.5 sm:gap-3 sm:p-6">
          {infoTiles.map(({ icon, label, value, wide }) => (
            <div
              key={label}
              className={`min-w-0 rounded-xl border border-[#e5ebf2] bg-[#f9fbfd] px-3 py-2.5 transition hover:border-[#bcd9e6] hover:bg-white ${
                wide ? "col-span-2" : ""
              }`}
            >
              <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
                <Icon3D name={icon} className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
              </dt>
              <dd className="mt-1 min-w-0 font-semibold text-[#1f2937]">
                <FitText max={14} min={10}>
                  {value}
                </FitText>
              </dd>
            </div>
          ))}
        </dl>
        {app.employerName && (
          <div className="border-t border-[#e5ebf2] p-4 sm:p-6">
            <EmployerCard name={app.employerName} logoUrl={app.employerLogoUrl} info={app.employerInfo ?? {}} />
          </div>
        )}
      </SectionCard>

      {/* Documents */}
      <SectionCard
        id="documents-heading"
        icon="document"
        title="Documents"
        aside={app.documents.length > 0 ? `${app.documents.length} file${app.documents.length > 1 ? "s" : ""}` : undefined}
      >
        <div className="p-4 sm:p-6">
          {app.documents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#cfd6de] bg-[#f9fbfd] p-8 text-center">
              <Icon3D name="document" className="size-12" />
              <p className="text-sm text-[#4b5563]">No documents have been added yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedDocuments.map(([groupName, docs]) => (
                <div key={groupName}>
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#eef4fb] p-1.5 ring-1 ring-[#dbe3ec]">
                      <Icon3D name="document" />
                    </span>
                    <h3 className="flex-1 text-base font-bold text-[#002664] sm:text-lg">{groupName}</h3>
                    <span className="rounded-full bg-[#eef4fb] px-2 py-0.5 text-xs font-semibold text-[#002664]">
                      {docs.length}
                    </span>
                  </div>
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
      </SectionCard>

      <PaymentSection app={app} credentials={credentials} />

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#cfe3ee] bg-[#f0f7fa] p-4 text-sm text-[#313131]">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-[#cfe3ee]">
          <Icon3D name="shield" />
        </span>
        <p className="pt-1.5">This profile is only accessible with your correct ID number and date of birth together.</p>
      </div>

      {viewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/80 p-4"
          onClick={() => setViewDoc(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
              <span className="flex min-w-0 items-center gap-2">
                <Icon3D name="document" className="size-5 shrink-0" />
                <span className="truncate text-sm font-semibold text-foreground">{viewDoc.label}</span>
              </span>
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
            className="animate-pop-in flex max-w-[220px] items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-left shadow-lg"
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
            className="w-full max-w-sm animate-in overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl fade-in-0 slide-in-from-bottom-8 duration-300 sm:rounded-2xl sm:slide-in-from-bottom-4"
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
      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#cfd6de] bg-[#f9fbfd] p-3 text-center">
        <Icon3D name="pending" className="size-10" />
        <p className="text-xs font-semibold leading-tight text-[#4b5563]">{label}</p>
        <p className="text-[10px] text-[#6b7280]">Pending upload</p>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex aspect-[3/4] flex-col overflow-hidden rounded-xl border border-[#dbe3ec] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#00698f] hover:shadow-lg"
    >
      <div className="relative flex-1 overflow-hidden bg-[#f3f6fa]">
        {isImageDataUrl(doc.dataUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doc.dataUrl}
            alt={label}
            className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon3D name="document" className="size-12" />
          </div>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-[#002664]/85 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
          View
        </span>
      </div>
      <div className="flex items-center gap-2 border-t border-[#e5ebf2] bg-white px-2.5 py-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#eef4fb] p-1">
          <Icon3D name="document" />
        </span>
        <span className="truncate text-xs font-semibold text-[#1f2937]">{label}</span>
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
