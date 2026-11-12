"use client"

import { useState, useRef } from "react"
import { X, Upload, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DEFAULT_DOCUMENT_GROUPS,
  TRACKING_METHOD_LABELS,
  type AppDocument,
  type ApplyingMethod,
  type NewApplicationInput,
  type TrackingMethod,
} from "@/lib/admin/types"
import { DESTINATION_COUNTRIES, PASSPORT_TYPES, VISA_TYPES, formatCountry } from "@/lib/countries"
import { AGENCY_COUNTRIES, getAgenciesForCountry } from "@/lib/agencies"
import { uploadAdminFile } from "@/lib/admin/upload"
import { CompanyPicker } from "@/components/admin/company-picker"
import { rememberCompany } from "@/lib/admin/companies"

const MAX_FILE_BYTES = 4 * 1024 * 1024 // 4 MB per file

const emptyForm: Omit<NewApplicationInput, "photoUrl" | "documents" | "visaDetails"> = {
  fullName: "",
  passportNumber: "",
  passportType: "",
  dateOfBirth: "",
  nationalId: "",
  // Default tracking method for a new application — admin can change this below
  // (and later, from the application detail modal) at any time.
  trackingMethod: "passport" as TrackingMethod,
  nationality: "",
  email: "",
  phone: "",
  destinationCountry: "",
  visaType: "",
  applyingMethod: "self",
  agencyCountry: "",
  agencyName: "",
  agencyReferenceNo: "",
  travelDate: "",
  employerName: "",
}

type SlotFile = { name: string; dataUrl: string } | null

type DraftDoc = { id: string; name: string; dataUrl: string }
type DraftGroup = { groupName: string; docs: DraftDoc[] }

let draftIdCounter = 0
function nextDraftId() {
  draftIdCounter += 1
  return `draft_${Date.now()}_${draftIdCounter}`
}

export function NewApplicationModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (input: NewApplicationInput) => void
}) {
  const [form, setForm] = useState(emptyForm)
  const [photo, setPhoto] = useState<SlotFile>(null)
  const [employerLogo, setEmployerLogo] = useState<SlotFile>(null)
  const [groups, setGroups] = useState<DraftGroup[]>([])
  const [newGroupName, setNewGroupName] = useState("")
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [fileError, setFileError] = useState("")
  const [formError, setFormError] = useState("")
  const newGroupFileInputRef = useRef<HTMLInputElement>(null)

  function update<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handlePhotoChange(file: File | null) {
    setFileError("")
    if (!file) {
      setPhoto(null)
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("Photo is too large. Please use a file under 4 MB.")
      return
    }
    try {
      const url = await uploadAdminFile(file)
      setPhoto({ name: file.name, dataUrl: url })
    } catch {
      setFileError("Could not upload that photo. Please try again.")
    }
  }

  async function addFilesToGroup(groupName: string, files: FileList | null) {
    const trimmedName = groupName.trim()
    if (!trimmedName || !files || files.length === 0) return
    setFileError("")

    const newDocs: DraftDoc[] = []
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) {
        setFileError(`"${file.name}" is too large. Please use files under 4 MB.`)
        continue
      }
      try {
        const url = await uploadAdminFile(file)
        newDocs.push({ id: nextDraftId(), name: file.name, dataUrl: url })
      } catch {
        setFileError(`Could not upload "${file.name}". Please try again.`)
      }
    }
    if (newDocs.length === 0) return

    setGroups((prev) => {
      const existing = prev.find((g) => g.groupName.toLowerCase() === trimmedName.toLowerCase())
      if (existing) {
        return prev.map((g) => (g === existing ? { ...g, docs: [...g.docs, ...newDocs] } : g))
      }
      return [...prev, { groupName: trimmedName, docs: newDocs }]
    })
  }

  async function handleNewGroupFiles(files: FileList | null) {
    await addFilesToGroup(newGroupName, files)
    setNewGroupName("")
    if (newGroupFileInputRef.current) newGroupFileInputRef.current.value = ""
  }

  async function handleReplaceDraftDoc(groupName: string, docId: string, file: File | null, inputEl: HTMLInputElement | null) {
    if (!file) return
    setFileError("")
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`"${file.name}" is too large. Please use files under 4 MB.`)
      return
    }
    try {
      const url = await uploadAdminFile(file)
      setGroups((prev) =>
        prev.map((g) =>
          g.groupName !== groupName
            ? g
            : { ...g, docs: g.docs.map((d) => (d.id === docId ? { ...d, name: file.name, dataUrl: url } : d)) },
        ),
      )
    } catch {
      setFileError(`Could not upload "${file.name}". Please try again.`)
    } finally {
      if (inputEl) inputEl.value = ""
    }
  }

  function removeDraftDoc(groupName: string, docId: string) {
    setGroups((prev) =>
      prev
        .map((g) => (g.groupName !== groupName ? g : { ...g, docs: g.docs.filter((d) => d.id !== docId) }))
        .filter((g) => g.docs.length > 0),
    )
  }

  function deleteGroup(groupName: string) {
    setGroups((prev) => prev.filter((g) => g.groupName !== groupName))
  }

  function handleRenameGroup(oldName: string) {
    const trimmed = renameValue.trim()
    if (!trimmed) {
      setRenamingGroup(null)
      return
    }
    setGroups((prev) => {
      const clashing = prev.find((g) => g.groupName !== oldName && g.groupName.toLowerCase() === trimmed.toLowerCase())
      if (clashing) {
        // Merge into the existing section with that name.
        return prev
          .map((g) => (g.groupName === clashing.groupName ? { ...g, docs: [...g.docs, ...(prev.find((p) => p.groupName === oldName)?.docs ?? [])] } : g))
          .filter((g) => g.groupName !== oldName)
      }
      return prev.map((g) => (g.groupName === oldName ? { ...g, groupName: trimmed } : g))
    })
    setRenamingGroup(null)
  }

  const agencyOptions = form.agencyCountry ? getAgenciesForCountry(form.agencyCountry) : []
  const selectedAgency = agencyOptions.find((a) => a.name === form.agencyName)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fullName.trim() || !form.destinationCountry) {
      setFormError("Please fill in the applicant's full name and destination country.")
      return
    }
    if (!form.passportNumber.trim() && !form.nationalId.trim()) {
      setFormError("Please provide either a Passport Number or a National ID Number.")
      return
    }
    setFormError("")

    const now = new Date().toISOString()
    const documents: AppDocument[] = []
    for (const group of groups) {
      for (const doc of group.docs) {
        documents.push({
          id: doc.id,
          name: doc.name,
          groupName: group.groupName,
          dataUrl: doc.dataUrl,
          addedBy: "admin",
          addedAt: now,
        })
      }
    }

    const visaDetails: Record<string, string> =
      form.applyingMethod === "agency" && selectedAgency
        ? {
            agencyPrimaryContact: selectedAgency.primaryPerson,
            agencySecondaryContact: selectedAgency.secondaryPerson,
          }
        : {}

    // Keep the company (name + original logo) in the permanent saved list for next time.
    void rememberCompany(form.employerName, employerLogo?.dataUrl)

    onCreate({
      ...form,
      agencyCountry: form.applyingMethod === "agency" ? form.agencyCountry : "",
      agencyName: form.applyingMethod === "agency" ? form.agencyName : "",
      agencyReferenceNo: form.applyingMethod === "agency" ? form.agencyReferenceNo : "",
      visaDetails,
      photoUrl: photo?.dataUrl ?? "",
      employerLogoUrl: employerLogo?.dataUrl ?? "",
      documents,
    })
    onClose()
  }

  const fields: { key: keyof Omit<typeof emptyForm, "applyingMethod" | "agencyCountry" | "agencyName" | "agencyReferenceNo" | "passportType" | "passportNumber" | "nationalId" | "trackingMethod">; label: string; type?: string }[] = [
    { key: "fullName", label: "Full Name" },
    { key: "dateOfBirth", label: "Date of Birth", type: "date" },
    { key: "nationality", label: "Nationality" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone" },
    { key: "travelDate", label: "Travel Date", type: "date" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-0 duration-200">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-card shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-serif text-lg font-semibold text-foreground">Submit New Application</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <h4 className="mb-3 text-sm font-semibold text-foreground">Applicant Photo</h4>
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.dataUrl} alt="Applicant" className="size-full object-cover" />
              ) : (
                <ImageIcon className="size-6 text-muted-foreground" />
              )}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground hover:bg-muted">
              <Upload className="size-4" />
              {photo ? "Change Photo" : "Upload Photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        <div className="border-t border-border px-6 py-5">
          <h4 className="mb-3 text-sm font-semibold text-foreground">Employer / Company (optional)</h4>
          <CompanyPicker
            idPrefix="new-company"
            name={form.employerName}
            logoUrl={employerLogo?.dataUrl ?? ""}
            onChange={({ name, logoUrl }) => {
              update("employerName", name)
              setEmployerLogo(logoUrl ? { name: name || "logo", dataUrl: logoUrl } : null)
            }}
          />
          <p className="mt-2 text-xs text-muted-foreground">Leave blank if not applicable.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 px-6 py-5">
          <div className="col-span-1">
            <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-foreground">
              Full Name<span className="text-destructive"> *</span>
            </label>
            <input
              id="fullName"
              type="text"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <div className="col-span-1">
            <label htmlFor="passportNumber" className="mb-1.5 block text-sm font-medium text-foreground">
              Passport No.
            </label>
            <input
              id="passportNumber"
              type="text"
              value={form.passportNumber}
              onChange={(e) => update("passportNumber", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <div className="col-span-1">
            <label htmlFor="nationalId" className="mb-1.5 block text-sm font-medium text-foreground">
              National ID
            </label>
            <input
              id="nationalId"
              type="text"
              value={form.nationalId}
              onChange={(e) => update("nationalId", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <p className="col-span-2 -mt-2 text-xs text-muted-foreground">
            Provide at least one: Passport No. <span className="text-destructive">*</span> or National ID{" "}
            <span className="text-destructive">*</span>
          </p>
          <div className="col-span-2 rounded-md border border-dashed border-border bg-secondary/30 p-3">
            <label htmlFor="trackingMethod" className="mb-1.5 block text-sm font-medium text-foreground">
              Track visa status by
            </label>
            <select
              id="trackingMethod"
              value={form.trackingMethod}
              onChange={(e) => update("trackingMethod", e.target.value as TrackingMethod)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {(Object.keys(TRACKING_METHOD_LABELS) as TrackingMethod[]).map((method) => (
                <option key={method} value={method}>
                  {TRACKING_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              On the public /track page, the applicant must enter this identifier AND their Date of Birth
              together — even though both Passport No. and National ID stay saved on the record.
            </p>
          </div>
          <div className="col-span-1">
            <label htmlFor="passportType" className="mb-1.5 block text-sm font-medium text-foreground">
              Passport Type
            </label>
            <select
              id="passportType"
              value={form.passportType}
              onChange={(e) => update("passportType", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select a type</option>
              {PASSPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {fields
            .filter((f) => f.key !== "fullName")
            .map(({ key, label, type }) => (
              <div key={key} className="col-span-1">
                <label htmlFor={key} className="mb-1.5 block text-sm font-medium text-foreground">
                  {label}
                </label>
                <input
                  id={key}
                  type={type ?? "text"}
                  value={form[key] as string}
                  onChange={(e) => update(key, e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            ))}

          <div className="col-span-1">
            <label htmlFor="destinationCountry" className="mb-1.5 block text-sm font-medium text-foreground">
              Destination Country<span className="text-destructive"> *</span>
            </label>
            <select
              id="destinationCountry"
              value={form.destinationCountry}
              onChange={(e) => update("destinationCountry", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select a country</option>
              {DESTINATION_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {formatCountry(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-1">
            <label htmlFor="visaType" className="mb-1.5 block text-sm font-medium text-foreground">
              Visa Type
            </label>
            <select
              id="visaType"
              value={form.visaType}
              onChange={(e) => update("visaType", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select a type</option>
              {VISA_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label htmlFor="applyingMethod" className="mb-1.5 block text-sm font-medium text-foreground">
              Applying Method
            </label>
            <select
              id="applyingMethod"
              value={form.applyingMethod}
              onChange={(e) => update("applyingMethod", e.target.value as ApplyingMethod)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="self">Self</option>
              <option value="agency">Agency</option>
            </select>
          </div>

          {form.applyingMethod === "agency" && (
            <>
              <div className="col-span-1">
                <label htmlFor="agencyCountry" className="mb-1.5 block text-sm font-medium text-foreground">
                  Agency Country
                </label>
                <select
                  id="agencyCountry"
                  value={form.agencyCountry}
                  onChange={(e) => update("agencyCountry", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Select a country</option>
                  {AGENCY_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {formatCountry(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label htmlFor="agencyName" className="mb-1.5 block text-sm font-medium text-foreground">
                  Agency Name
                </label>
                <input
                  id="agencyName"
                  list="admin-agency-suggestions"
                  type="text"
                  value={form.agencyName}
                  onChange={(e) => update("agencyName", e.target.value)}
                  placeholder="Type or select an agency"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <datalist id="admin-agency-suggestions">
                  {agencyOptions.map((a) => (
                    <option key={a.name} value={a.name} />
                  ))}
                </datalist>
              </div>
              <div className="col-span-2">
                <label htmlFor="agencyReferenceNo" className="mb-1.5 block text-sm font-medium text-foreground">
                  Agency Reference No.
                </label>
                <input
                  id="agencyReferenceNo"
                  type="text"
                  value={form.agencyReferenceNo}
                  onChange={(e) => update("agencyReferenceNo", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </>
          )}
        </div>

        <div className="border-t border-border px-6 py-5">
          <h4 className="mb-1 text-sm font-semibold text-foreground">Visa Documents</h4>
          <p className="mb-3 text-xs text-muted-foreground">
            Create a section for each document type (e.g. Passport, Offer Letter, Demand Letter). Each
            section can hold as many files as you need — one photo or several.
          </p>

          {groups.length > 0 && (
            <div className="mb-3 space-y-3">
              {groups.map((group) => (
                <div key={group.groupName} className="rounded-xl border border-border p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    {renamingGroup === group.groupName ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          autoFocus
                          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2 py-1 text-sm text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameGroup(group.groupName)}
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
                          {group.groupName}{" "}
                          <span className="font-normal text-muted-foreground">({group.docs.length})</span>
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingGroup(group.groupName)
                              setRenameValue(group.groupName)
                            }}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteGroup(group.groupName)}
                            className="text-xs font-medium text-destructive hover:underline"
                          >
                            Delete Section
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <ul className="space-y-1.5 text-sm">
                    {group.docs.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                      >
                        <span className="min-w-0 truncate text-foreground">{doc.name}</span>
                        <div className="flex shrink-0 items-center gap-3">
                          <label className="cursor-pointer text-xs font-semibold text-primary hover:underline">
                            Replace
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleReplaceDraftDoc(group.groupName, doc.id, e.target.files?.[0] ?? null, e.target)
                              }
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeDraftDoc(group.groupName, doc.id)}
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
                        addFilesToGroup(group.groupName, e.target.files)
                        e.target.value = ""
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-dashed border-border p-3">
            <p className="mb-2 text-sm font-medium text-foreground">Add a new document section</p>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <label htmlFor="newGroupName" className="text-xs font-medium text-muted-foreground">
                Document name:
              </label>
              <input
                id="newGroupName"
                list="new-app-doc-group-suggestions"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Passport, Offer Letter, Demand Letter"
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
              />
              <datalist id="new-app-doc-group-suggestions">
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
                ref={newGroupFileInputRef}
                type="file"
                multiple
                accept=".pdf,image/*"
                disabled={!newGroupName.trim()}
                className="hidden"
                onChange={(e) => handleNewGroupFiles(e.target.files)}
              />
            </label>
            {fileError && <p className="mt-2 text-xs text-destructive">{fileError}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              Max 4 MB per file. Section names are fully custom — rename or delete any section before
              creating the application, or edit them later from the application&apos;s details page.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
          {formError && <p className="text-xs text-destructive sm:mr-auto">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-9 px-4 text-sm">
              Cancel
            </Button>
            <Button type="submit" className="h-9 px-4 text-sm">
              Create Application
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
