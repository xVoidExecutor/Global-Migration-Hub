"use client"

import { useState, useRef, useMemo } from "react"
import { X, Pencil, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DEFAULT_DOCUMENT_GROUPS,
  effectiveStage,
  getTrackingMethod,
  stageLabel,
  TRACKING_METHOD_LABELS,
  type AppDocument,
  type Application,
  type ManualStatus,
  type TrackingMethod,
} from "@/lib/admin/types"
import { uploadAdminFile } from "@/lib/admin/upload"
import { formatCountry } from "@/lib/countries"

const MAX_FILE_BYTES = 4 * 1024 * 1024 // 4 MB per file

/** Friendly labels for the dynamic visaType-specific keys stored in app.visaDetails. */
const VISA_DETAIL_LABELS: Record<string, string> = {
  universityName: "University Name",
  purposeOfVisit: "Purpose of Visit",
  companyName: "Company Name",
  hospitalName: "Hospital Name",
  sponsorRelationship: "Sponsor Name & Relationship",
  expectedSalary: "Expected Salary",
  agencyPrimaryContact: "Agency Primary Contact",
  agencySecondaryContact: "Agency Secondary Contact",
}

function formatDate(iso: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function toDateTimeLocalValue(iso: string) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const offsetMs = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16)
}

function stagePillClass(app: Application) {
  const stage = effectiveStage(app)
  if (stage === "rejected") return "bg-destructive/10 text-destructive"
  if (stage === 3) return "bg-tip-green text-tip-green-foreground"
  if (stage === 0) return "bg-muted text-muted-foreground"
  return "bg-tip-yellow text-tip-yellow-foreground"
}

export function ApplicationModal({
  app,
  onClose,
  onUpdateStatus,
  onSaveNotes,
  onDelete,
  onAddDocument,
  onUpdateSubmittedAt,
  onUpdateProfile,
}: {
  app: Application
  onClose: () => void
  onUpdateStatus: (id: string, status: ManualStatus, note: string) => void
  onSaveNotes: (id: string, notes: string) => void
  onDelete: (id: string) => void
  onAddDocument: (id: string, doc: { name: string; dataUrl?: string; groupName: string }) => void | Promise<void>
  onUpdateSubmittedAt: (id: string, submittedAt: string) => void
  onUpdateProfile: (id: string, patch: Partial<Application>) => void
}) {
  const [statusSelect, setStatusSelect] = useState<ManualStatus>(app.manualStatus)
  const [statusNote, setStatusNote] = useState(app.statusNote)
  const [internalNotes, setInternalNotes] = useState(app.internalNotes)
  const [submittedInput, setSubmittedInput] = useState(toDateTimeLocalValue(app.submittedAt))
  const [dateSaved, setDateSaved] = useState(false)
  const [statusSaved, setStatusSaved] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [newGroupName, setNewGroupName] = useState("")
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const groupedDocuments = useMemo(() => {
    const map = new Map<string, AppDocument[]>()
    for (const doc of app.documents) {
      const key = doc.groupName?.trim() || "Other"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(doc)
    }
    return Array.from(map.entries())
  }, [app.documents])

  // --- Edit Applicant Info (name/passport/nationality/email/phone/photo) ---
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    fullName: app.fullName,
    passportNumber: app.passportNumber,
    nationalId: app.nationalId,
    dateOfBirth: app.dateOfBirth,
    trackingMethod: getTrackingMethod(app),
    nationality: app.nationality,
    email: app.email,
    phone: app.phone,
    photoUrl: app.photoUrl,
    agencyName: app.agencyName ?? "",
    agencyReferenceNo: app.agencyReferenceNo ?? "",
    employerName: app.employerName ?? "",
    employerLogoUrl: app.employerLogoUrl ?? "",
  })
  const [profileSaved, setProfileSaved] = useState(false)
  const [photoError, setPhotoError] = useState("")
  const [employerLogoError, setEmployerLogoError] = useState("")
  const photoInputRef = useRef<HTMLInputElement>(null)
  const employerLogoInputRef = useRef<HTMLInputElement>(null)

  async function handlePhotoSelected(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setPhotoError("")
    if (file.size > MAX_FILE_BYTES) {
      setPhotoError("Photo is too large. Please use an image under 4 MB.")
      return
    }
    try {
      const url = await uploadAdminFile(file)
      setProfileForm((f) => ({ ...f, photoUrl: url }))
    } catch {
      setPhotoError("Could not upload that image. Please try again.")
    }
  }

  async function handleEmployerLogoSelected(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setEmployerLogoError("")
    if (file.size > MAX_FILE_BYTES) {
      setEmployerLogoError("Logo is too large. Please use an image under 4 MB.")
      return
    }
    try {
      const url = await uploadAdminFile(file)
      setProfileForm((f) => ({ ...f, employerLogoUrl: url }))
    } catch {
      setEmployerLogoError("Could not upload that image. Please try again.")
    }
  }

  function handleSaveProfile() {
    onUpdateProfile(app.id, profileForm)
    setProfileSaved(true)
    setIsEditingProfile(false)
    setTimeout(() => setProfileSaved(false), 1500)
  }

  // --- Tracking Link (direct-access link, bypasses passport/NID + DOB) ---
  const [linkCopied, setLinkCopied] = useState(false)
  const trackingLinkUrl =
    app.trackingLinkToken && typeof window !== "undefined"
      ? `${window.location.origin}/track?token=${app.trackingLinkToken}`
      : ""

  function handleGenerateLink() {
    const token =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "")
        : Math.random().toString(36).slice(2) + Date.now().toString(36)
    onUpdateProfile(app.id, { trackingLinkToken: token })
  }

  function handleRevokeLink() {
    onUpdateProfile(app.id, { trackingLinkToken: "" })
  }

  async function handleCopyLink() {
    if (!trackingLinkUrl) return
    try {
      await navigator.clipboard.writeText(trackingLinkUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 1500)
    } catch {
      // Clipboard API unavailable — the read-only input above is still manually selectable/copyable.
    }
  }

  function handleCancelProfileEdit() {
    setProfileForm({
      fullName: app.fullName,
      passportNumber: app.passportNumber,
      nationalId: app.nationalId,
      dateOfBirth: app.dateOfBirth,
      trackingMethod: getTrackingMethod(app),
      nationality: app.nationality,
      email: app.email,
      phone: app.phone,
      photoUrl: app.photoUrl,
      agencyName: app.agencyName ?? "",
      agencyReferenceNo: app.agencyReferenceNo ?? "",
      employerName: app.employerName ?? "",
      employerLogoUrl: app.employerLogoUrl ?? "",
    })
    setPhotoError("")
    setEmployerLogoError("")
    setIsEditingProfile(false)
  }

  function handleSaveSubmittedDate() {
    if (!submittedInput) return
    const iso = new Date(submittedInput).toISOString()
    onUpdateSubmittedAt(app.id, iso)
    setDateSaved(true)
    setTimeout(() => setDateSaved(false), 1500)
  }

  function handleUpdateStatusClick() {
    onUpdateStatus(app.id, statusSelect, statusNote)
    setStatusSaved(true)
    setTimeout(() => setStatusSaved(false), 1500)
  }

  async function handleAddFilesToGroup(groupName: string, files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadError("")
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) {
        setUploadError(`"${file.name}" is too large. Please use files under 4 MB.`)
        continue
      }
      try {
        const url = await uploadAdminFile(file)
        await onAddDocument(app.id, { name: file.name, dataUrl: url, groupName })
      } catch {
        setUploadError(`Could not upload "${file.name}". Please try again.`)
      }
    }
  }

  async function handleAddNewGroupFiles(files: FileList | null) {
    const groupName = newGroupName.trim()
    if (!groupName) return
    await handleAddFilesToGroup(groupName, files)
    setNewGroupName("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleReplaceDocument(doc: AppDocument, file: File | null, inputEl: HTMLInputElement | null) {
    if (!file) return
    setUploadError("")
    if (file.size > MAX_FILE_BYTES) {
      setUploadError(`"${file.name}" is too large. Please use files under 4 MB.`)
      return
    }
    try {
      const url = await uploadAdminFile(file)
      const documents = app.documents.map((d) =>
        d.id === doc.id ? { ...d, name: file.name, dataUrl: url, addedAt: new Date().toISOString() } : d,
      )
      onUpdateProfile(app.id, { documents })
    } catch {
      setUploadError(`Could not upload "${file.name}". Please try again.`)
    } finally {
      if (inputEl) inputEl.value = ""
    }
  }

  function handleDeleteDocument(docId: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return
    const documents = app.documents.filter((d) => d.id !== docId)
    onUpdateProfile(app.id, { documents })
  }

  function handleDeleteGroup(groupName: string) {
    if (!confirm(`Delete the "${groupName}" section and all its files? This cannot be undone.`)) return
    const documents = app.documents.filter((d) => (d.groupName?.trim() || "Other") !== groupName)
    onUpdateProfile(app.id, { documents })
  }

  function handleRenameGroup(oldName: string) {
    const newName = renameValue.trim()
    if (!newName || newName === oldName) {
      setRenamingGroup(null)
      return
    }
    const documents = app.documents.map((d) =>
      (d.groupName?.trim() || "Other") === oldName ? { ...d, groupName: newName } : d,
    )
    onUpdateProfile(app.id, { documents })
    setRenamingGroup(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-0 duration-200">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-serif text-lg font-semibold text-foreground">Application Details</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          {/* Ref-style highlight card */}
          <section className="rounded-2xl bg-gradient-to-br from-tip-peach via-tip-yellow to-tip-green p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-serif text-lg font-semibold text-foreground">
                  Ref: {app.passportNumber || "—"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {app.visaType || "Visa"} Application · {formatCountry(app.destinationCountry)}
                </div>
              </div>
              <div className="flex gap-2">
                {!isEditingProfile && (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    onClick={() => setIsEditingProfile(true)}
                  >
                    <Pencil className="size-3.5" /> Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Delete this entire application? This cannot be undone.")) onDelete(app.id)
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-card px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Stage</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stagePillClass(app)}`}>
                {stageLabel(app)}
              </span>
            </div>

            {!isEditingProfile ? (
              <div className="mt-4 rounded-xl bg-card/70 p-4 text-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                    {app.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={app.photoUrl} alt={app.fullName} className="size-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">No photo</span>
                    )}
                  </div>
                  <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {[
                      ["Full Name", app.fullName],
                      ["Passport No.", app.passportNumber],
                      ["Passport Type", app.passportType],
                      ["Date of Birth", formatDate(app.dateOfBirth)],
                      ["National ID", app.nationalId],
                      ["Track Status By", `${TRACKING_METHOD_LABELS[getTrackingMethod(app)]} + Date of Birth`],
                      ["Nationality", app.nationality],
                      ["Email", app.email],
                      ["Phone", app.phone],
                      ["Travel Date", formatDate(app.travelDate)],
                      ["Applying Method", app.applyingMethod === "agency" ? "Through an Agency" : "Self-apply"],
                      ["Agency Country", app.agencyCountry ? formatCountry(app.agencyCountry) : app.agencyCountry],
                      ["Agency Name", app.agencyName],
                      ["Agency Reference No", app.agencyReferenceNo],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                        <dd className="font-medium text-foreground">{value || "—"}</dd>
                      </div>
                    ))}
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Employer / Company</dt>
                      <dd className="mt-0.5 flex items-center gap-2 font-medium text-foreground">
                        {app.employerLogoUrl && (
                          <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={app.employerLogoUrl} alt={app.employerName} className="size-full object-cover" />
                          </span>
                        )}
                        {app.employerName || "—"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            ) : (
              /* --- Edit mode: profile fields + photo upload --- */
              <div className="mt-4 rounded-xl bg-card/70 p-4 text-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                      {profileForm.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profileForm.photoUrl} alt="Preview" className="size-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">No photo</span>
                      )}
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground hover:bg-muted">
                      <Upload className="size-3.5" />
                      {profileForm.photoUrl ? "Change" : "Upload"}
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoSelected(e.target.files)}
                      />
                    </label>
                  </div>

                  <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Full Name</label>
                      <input
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Passport No.</label>
                      <input
                        value={profileForm.passportNumber}
                        onChange={(e) => setProfileForm((f) => ({ ...f, passportNumber: e.target.value }))}
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">National ID</label>
                      <input
                        value={profileForm.nationalId}
                        onChange={(e) => setProfileForm((f) => ({ ...f, nationalId: e.target.value }))}
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Date of Birth</label>
                      <input
                        type="date"
                        value={profileForm.dateOfBirth}
                        onChange={(e) => setProfileForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground"
                      />
                    </div>
                    <div className="sm:col-span-2 rounded-lg border border-dashed border-border bg-secondary/30 p-2.5">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Track visa status by
                      </label>
                      <select
                        value={profileForm.trackingMethod}
                        onChange={(e) =>
                          setProfileForm((f) => ({ ...f, trackingMethod: e.target.value as TrackingMethod }))
                        }
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground"
                      >
                        {(Object.keys(TRACKING_METHOD_LABELS) as TrackingMethod[]).map((method) => (
                          <option key={method} value={method}>
                            {TRACKING_METHOD_LABELS[method]}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        On /track, this applicant must enter this identifier AND their Date of Birth together —
                        both Passport No. and National ID stay saved on the record either way.
                      </p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Nationality</label>
                      <input
                        value={profileForm.nationality}
                        onChange={(e) => setProfileForm((f) => ({ ...f, nationality: e.target.value }))}
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
                      <input
                        value={profileForm.email}
                        onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone</label>
                      <input
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Agency Name</label>
                      <input
                        value={profileForm.agencyName}
                        onChange={(e) => setProfileForm((f) => ({ ...f, agencyName: e.target.value }))}
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Agency Reference No</label>
                      <input
                        value={profileForm.agencyReferenceNo}
                        onChange={(e) => setProfileForm((f) => ({ ...f, agencyReferenceNo: e.target.value }))}
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-dashed border-border pt-4 sm:flex-row sm:items-start">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                      {profileForm.employerLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profileForm.employerLogoUrl} alt="Company logo preview" className="size-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">No logo</span>
                      )}
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground hover:bg-muted">
                      <Upload className="size-3.5" />
                      {profileForm.employerLogoUrl ? "Change" : "Upload"}
                      <input
                        ref={employerLogoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleEmployerLogoSelected(e.target.files)}
                      />
                    </label>
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Employer / Company Name</label>
                    <input
                      value={profileForm.employerName}
                      onChange={(e) => setProfileForm((f) => ({ ...f, employerName: e.target.value }))}
                      placeholder="e.g. Acme Construction LLC"
                      className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Shown next to the applicant&apos;s name on their tracking profile.
                    </p>
                  </div>
                </div>
                {photoError && <p className="mt-2 text-xs text-destructive">{photoError}</p>}
                {employerLogoError && <p className="mt-1 text-xs text-destructive">{employerLogoError}</p>}

                <div className="mt-3 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCancelProfileEdit} className="h-8 rounded-lg px-3 text-xs">
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSaveProfile} className="h-8 rounded-lg px-3 text-xs">
                    {profileSaved ? "Saved ✓" : "Save Changes"}
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border p-4">
            <h4 className="mb-1 text-sm font-semibold text-foreground">Tracking Link</h4>
            <p className="mb-3 text-xs text-muted-foreground">
              Share this link directly with the applicant for instant access to their status — no Passport,
              National ID, or Date of Birth needed. Passport/NID + DOB still work as the normal fallback for
              anyone who searches without the link.
            </p>
            {app.trackingLinkToken ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  readOnly
                  value={trackingLinkUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 truncate rounded-lg border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                />
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" onClick={handleCopyLink} className="h-8 rounded-lg px-3 text-xs">
                    {linkCopied ? "Copied ✓" : "Copy"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleGenerateLink} className="h-8 rounded-lg px-3 text-xs">
                    Regenerate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRevokeLink}
                    className="h-8 rounded-lg px-3 text-xs text-destructive hover:text-destructive"
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" onClick={handleGenerateLink} className="h-9 rounded-xl px-4 text-xs">
                Generate Tracking Link
              </Button>
            )}
          </section>

          {Object.keys(app.visaDetails ?? {}).length > 0 && (
            <section className="rounded-2xl border border-border p-4">
              <h4 className="mb-3 text-sm font-semibold text-foreground">Visa Details</h4>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                {Object.entries(VISA_DETAIL_LABELS)
                  .filter(([key]) => app.visaDetails?.[key])
                  .map(([key, label]) => (
                    <div key={key}>
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                      <dd className="font-medium text-foreground">{app.visaDetails[key]}</dd>
                    </div>
                  ))}
              </dl>
            </section>
          )}

          <section className="rounded-2xl border border-dashed border-border p-4">
            <label htmlFor="submittedAtInput" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Submitted Date (editable)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="submittedAtInput"
                type="datetime-local"
                value={submittedInput}
                onChange={(e) => setSubmittedInput(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button type="button" onClick={handleSaveSubmittedDate} className="h-9 rounded-xl px-4 text-sm">
                {dateSaved ? "Saved ✓" : "Save Date"}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Currently showing on the applicant&apos;s profile as: {formatDate(app.submittedAt)}
            </p>
          </section>

          <section className="rounded-2xl border border-border p-4">
            <h4 className="mb-3 text-sm font-semibold text-foreground">Visa Status</h4>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusSelect}
                onChange={(e) => setStatusSelect(e.target.value as ManualStatus)}
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="auto">Auto (time-based)</option>
                <option value="0">Submitted</option>
                <option value="1">Processing</option>
                <option value="2">Document Verified</option>
                <option value="3">Visa Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <Button type="button" onClick={handleUpdateStatusClick} className="h-9 rounded-xl px-4 text-sm">
                {statusSaved ? "Updated ✓" : "Update Status"}
              </Button>
            </div>
            <div className="mt-3">
              <label htmlFor="miStatusNote" className="mb-1.5 block text-sm font-medium text-foreground">
                Note shown to applicant (visible on their tracking profile, any status)
              </label>
              <textarea
                id="miStatusNote"
                rows={2}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="e.g. Missing bank statement — please resubmit with updated documents."
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border p-4">
            <h4 className="mb-3 text-sm font-semibold text-foreground">Uploaded Documents</h4>

            {groupedDocuments.length > 0 ? (
              <div className="space-y-3">
                {groupedDocuments.map(([groupName, docs]) => (
                  <div key={groupName} className="rounded-xl border border-border p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      {renamingGroup === groupName ? (
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            autoFocus
                            className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2 py-1 text-sm text-foreground"
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameGroup(groupName)}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingGroup(null)}
                            className="text-xs text-muted-foreground hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-semibold text-foreground">
                            {groupName}{" "}
                            <span className="font-normal text-muted-foreground">({docs.length})</span>
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingGroup(groupName)
                                setRenameValue(groupName)
                              }}
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(groupName)}
                              className="text-xs font-medium text-destructive hover:underline"
                            >
                              Delete Section
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <ul className="space-y-1.5 text-sm">
                      {docs.map((doc) => (
                        <li
                          key={doc.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                        >
                          <span className="min-w-0 truncate text-foreground">{doc.name}</span>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {doc.addedBy === "admin" ? "Added by staff" : "From applicant"} ·{" "}
                              {formatDate(doc.addedAt)}
                            </span>
                            <label className="cursor-pointer text-xs font-semibold text-primary hover:underline">
                              Replace
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                className="hidden"
                                onChange={(e) => handleReplaceDocument(doc, e.target.files?.[0] ?? null, e.target)}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="text-xs font-semibold text-destructive hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground hover:bg-muted">
                      <Upload className="size-3.5" />
                      Add more files to this section
                      <input
                        type="file"
                        multiple
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                          handleAddFilesToGroup(groupName, e.target.files)
                          e.target.value = ""
                        }}
                      />
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No documents yet.</p>
            )}

            <div className="mt-3 rounded-xl border border-dashed border-border p-3">
              <p className="mb-2 text-sm font-medium text-foreground">Add a new document section</p>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <label htmlFor="newGroupName" className="text-xs font-medium text-muted-foreground">
                  Document name:
                </label>
                <input
                  id="newGroupName"
                  list="doc-group-suggestions"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Passport, Job Letter"
                  className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                />
                <datalist id="doc-group-suggestions">
                  {DEFAULT_DOCUMENT_GROUPS.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </div>
              <label
                className={`inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ${
                  newGroupName.trim() ? "cursor-pointer hover:bg-muted" : "cursor-not-allowed opacity-50"
                }`}
              >
                <Upload className="size-4" />
                Choose file(s)
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  disabled={!newGroupName.trim()}
                  className="hidden"
                  onChange={(e) => handleAddNewGroupFiles(e.target.files)}
                />
              </label>
              {uploadError && <p className="mt-2 text-xs text-destructive">{uploadError}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                Max 4 MB per file. You can add several photos to the same section (e.g. 3-4 passport pages), and
                replace, delete, or rename any section at any time.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-border p-4">
            <h4 className="mb-1.5 text-sm font-semibold text-foreground">Internal Admin Notes</h4>
            <p className="mb-2 text-xs text-muted-foreground">Private — never shown to the applicant.</p>
            <textarea
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Internal remarks for staff only"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onSaveNotes(app.id, internalNotes)} className="h-9 rounded-xl px-4 text-sm">
            Save Notes
          </Button>
          <Button type="button" onClick={onClose} className="h-9 rounded-xl px-4 text-sm">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
