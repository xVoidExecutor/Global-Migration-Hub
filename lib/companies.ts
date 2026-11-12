"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Building2, Trash2, Upload, X } from "lucide-react"
import { deleteCompany, getCompanies } from "@/lib/admin/companies"
import { uploadAdminFile } from "@/lib/admin/upload"
import { normalizeCompanyName, type Company } from "@/lib/companies"

const MAX_LOGO_BYTES = 4 * 1024 * 1024 // 4 MB

export interface CompanyValue {
  name: string
  logoUrl: string
}

/**
 * Company name + logo field for the admin panel.
 *
 * - Pick a company from the permanent saved list (name AND its original logo are filled in), or
 * - type any name manually and upload a logo.
 * - The logo is shown exactly as uploaded (not cropped). Parents call `rememberCompany()` when
 *   the application is saved so every company ends up in the saved list automatically.
 */
export function CompanyPicker({
  name,
  logoUrl,
  onChange,
  idPrefix = "company",
}: {
  name: string
  logoUrl: string
  onChange: (value: CompanyValue) => void
  idPrefix?: string
}) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [focused, setFocused] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    getCompanies().then((list) => {
      if (!cancelled) setCompanies(list)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const query = normalizeCompanyName(name)

  const exactMatch = useMemo(
    () => (query ? companies.find((c) => normalizeCompanyName(c.name) === query) : undefined),
    [companies, query],
  )

  const suggestions = useMemo(() => {
    const list = query
      ? companies.filter((c) => normalizeCompanyName(c.name).includes(query) && c !== exactMatch)
      : companies
    return list.slice(0, 8)
  }, [companies, query, exactMatch])

  // A saved logo exists for this exact name, but the current form has no logo yet.
  const canUseSavedLogo = !!exactMatch?.logoUrl && !logoUrl

  function pick(company: Company) {
    onChange({ name: company.name, logoUrl: company.logoUrl || logoUrl })
    setFocused(false)
  }

  async function handleLogoSelected(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setError("")
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.")
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo is too large. Please use an image under 4 MB.")
      return
    }
    setUploading(true)
    try {
      // Uploaded as-is: the original file is stored, no resizing or cropping.
      const url = await uploadAdminFile(file)
      onChange({ name, logoUrl: url })
    } catch {
      setError("Could not upload that image. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(company: Company) {
    if (!window.confirm(`Remove "${company.name}" from the saved company list?\n\nExisting applications keep their company name and logo.`)) {
      return
    }
    const ok = await deleteCompany(company.id)
    if (ok) setCompanies((list) => list.filter((c) => c.id !== company.id))
    else setError("Could not remove that company. Please try again.")
  }

  function handleBlur() {
    // Delay so a tap on a suggestion registers before the list closes.
    blurTimer.current = setTimeout(() => setFocused(false), 180)
  }

  function handleFocus() {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setFocused(true)
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex items-center gap-3 sm:flex-col sm:items-center">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white p-1.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Company logo" className="size-full object-contain" />
          ) : (
            <Building2 className="size-7 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-center">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground hover:bg-muted">
            <Upload className="size-3.5" aria-hidden="true" />
            {uploading ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                handleLogoSelected(e.target.files)
                e.target.value = ""
              }}
            />
          </label>
          {logoUrl && (
            <button
              type="button"
              onClick={() => onChange({ name, logoUrl: "" })}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
            >
              <X className="size-3" aria-hidden="true" /> Remove logo
            </button>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <label htmlFor={`${idPrefix}-name`} className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Employer / Company Name
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          autoComplete="off"
          value={name}
          maxLength={120}
          onChange={(e) => onChange({ name: e.target.value, logoUrl })}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Type a name, or pick a saved company below"
          className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />

        {canUseSavedLogo && exactMatch && (
          <button
            type="button"
            onClick={() => pick(exactMatch)}
            className="mt-2 flex w-full items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-2.5 py-2 text-left text-xs text-foreground hover:bg-primary/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={exactMatch.logoUrl} alt="" className="size-8 shrink-0 rounded-md border border-border bg-white object-contain p-0.5" />
            <span>
              Use the saved logo for <strong>{exactMatch.name}</strong>
            </span>
          </button>
        )}

        {focused && suggestions.length > 0 && (
          <ul className="mt-2 max-h-52 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-background" aria-label="Saved companies">
            {suggestions.map((c) => (
              <li key={c.id} className="flex items-center gap-1 pr-1">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(c)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left hover:bg-muted"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white p-0.5">
                    {c.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logoUrl} alt="" className="size-full object-contain" />
                    ) : (
                      <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
                    )}
                  </span>
                  <span className="truncate text-sm text-foreground">{c.name}</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleDelete(c)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove ${c.name} from saved list`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Saved automatically to your company list when you save, so you can reuse the name and original logo next time.
          Shown next to the applicant&apos;s name on their tracking profile.
        </p>
        {error && (
          <p className="mt-1 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
