"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, ChevronDown, ExternalLink, Pencil, Pin, Trash2, Upload, X } from "lucide-react"
import { deleteCompany, getCompanies, saveCompany } from "@/lib/admin/companies"
import { uploadAdminFile } from "@/lib/admin/upload"
import {
  abrLookupUrl,
  digitsOnly,
  formatAbn,
  formatAcn,
  hasEmployerInfo,
  isValidAbn,
  matchCompany,
  normalizeCompanyName,
  pickEmployerInfo,
  sortCompanies,
  type Company,
  type EmployerInfo,
} from "@/lib/companies"

const MAX_LOGO_BYTES = 4 * 1024 * 1024 // 4 MB

export interface CompanyValue {
  name: string
  logoUrl: string
  info: EmployerInfo
}

const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"

/** Logo box + upload. The original file is stored and shown as-is (never cropped). */
function LogoUploader({ logoUrl, onChange }: { logoUrl: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  async function handleSelected(files: FileList | null) {
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
      onChange(await uploadAdminFile(file))
    } catch {
      setError("Could not upload that image. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  return (
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
              handleSelected(e.target.files)
              e.target.value = ""
            }}
          />
        </label>
        {logoUrl && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
          >
            <X className="size-3" aria-hidden="true" /> Remove logo
          </button>
        )}
        {error && (
          <p className="max-w-40 text-[11px] text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

/** ABN, ACN, address, contact details… */
function DetailsFields({ info, onChange }: { info: EmployerInfo; onChange: (next: EmployerInfo) => void }) {
  const set = (key: keyof EmployerInfo, value: string) => onChange({ ...info, [key]: value })
  const abnDigits = digitsOnly(info.abn)
  const abnUrl = abrLookupUrl(info.abn)

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Trading name</label>
        <input
          value={info.tradingName ?? ""}
          onChange={(e) => set("tradingName", e.target.value)}
          placeholder="e.g. Costa"
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Entity type</label>
        <input
          value={info.entityType ?? ""}
          onChange={(e) => set("entityType", e.target.value)}
          placeholder="e.g. Australian Private Company"
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">ABN (11 digits)</label>
        <input
          value={formatAbn(info.abn)}
          onChange={(e) => set("abn", digitsOnly(e.target.value).slice(0, 11))}
          inputMode="numeric"
          placeholder="00 000 000 000"
          className={INPUT_CLASS}
        />
        {abnDigits.length === 11 && !isValidAbn(abnDigits) && (
          <p className="mt-1 text-[11px] text-destructive">This ABN fails the official check — please re-check the number.</p>
        )}
        {abnDigits.length === 11 && isValidAbn(abnDigits) && abnUrl && (
          <a
            href={abnUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            Valid ABN ✓ — check on ABR <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        )}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">ACN (9 digits)</label>
        <input
          value={formatAcn(info.acn)}
          onChange={(e) => set("acn", digitsOnly(e.target.value).slice(0, 9))}
          inputMode="numeric"
          placeholder="000 000 000"
          className={INPUT_CLASS}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Address</label>
        <input
          value={info.address ?? ""}
          onChange={(e) => set("address", e.target.value)}
          placeholder="Street, suburb, state, postcode"
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone</label>
        <input
          value={info.phone ?? ""}
          onChange={(e) => set("phone", e.target.value)}
          inputMode="tel"
          placeholder="+61 …"
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
        <input
          value={info.email ?? ""}
          onChange={(e) => set("email", e.target.value)}
          inputMode="email"
          placeholder="info@company.com"
          className={INPUT_CLASS}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Website</label>
        <input
          value={info.website ?? ""}
          onChange={(e) => set("website", e.target.value)}
          inputMode="url"
          placeholder="https://"
          className={INPUT_CLASS}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">About the company (optional)</label>
        <textarea
          value={info.about ?? ""}
          onChange={(e) => set("about", e.target.value)}
          rows={2}
          maxLength={600}
          className={INPUT_CLASS}
        />
      </div>
    </div>
  )
}

/** Edits a saved company record itself (official name, aliases, logo, details, pin). */
function SavedCompanyEditor({
  company,
  onClose,
  onSaved,
}: {
  company: Company
  onClose: () => void
  onSaved: (company: Company) => void
}) {
  const [name, setName] = useState(company.name)
  const [aliases, setAliases] = useState((company.aliases ?? []).join(", "))
  const [logoUrl, setLogoUrl] = useState(company.logoUrl)
  const [info, setInfo] = useState<EmployerInfo>(pickEmployerInfo(company))
  const [pinned, setPinned] = useState(!!company.pinned)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    if (!name.trim()) {
      setError("Official company name is required.")
      return
    }
    setSaving(true)
    setError("")
    const saved = await saveCompany({
      id: company.id,
      name: name.trim(),
      logoUrl,
      info,
      pinned,
      aliases: aliases.split(",").map((a) => a.trim()).filter(Boolean),
    })
    setSaving(false)
    if (!saved) {
      setError("Could not save. Please try again.")
      return
    }
    onSaved(saved)
  }

  return (
    <div className="mb-4 rounded-xl border border-primary/40 bg-primary/5 p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Edit saved company</p>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Close editor">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <LogoUploader logoUrl={logoUrl} onChange={setLogoUrl} />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Full official name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={160} className={INPUT_CLASS} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Other names applicants may type (comma separated)
            </label>
            <input
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="e.g. Costa, Costa Group"
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </div>

      <div className="mt-3">
        <DetailsFields info={info} onChange={setInfo} />
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs text-foreground">
        <input
          type="checkbox"
          checked={pinned}
          disabled={!!company.locked}
          onChange={(e) => setPinned(e.target.checked)}
          className="size-4"
        />
        <Pin className="size-3.5" aria-hidden="true" />
        {company.locked ? "Permanently pinned at the top" : "Pin to the top of the list"}
      </label>

      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save company"}
        </button>
      </div>
    </div>
  )
}

/**
 * Company name + logo + details field for the admin panel.
 *
 * - Pinned companies (RTS, Costa) are always shown first as tappable cards; tapping fills the full
 *   official name, the original logo and the company details (ABN, address, contact…).
 * - Or type any name manually, upload a logo and fill in details.
 * - Parents call `rememberCompany()` when the application is saved, so every company ends up in the
 *   permanent saved list automatically.
 */
export function CompanyPicker({
  value,
  onChange,
  idPrefix = "company",
}: {
  value: CompanyValue
  onChange: (value: CompanyValue) => void
  idPrefix?: string
}) {
  const { name, logoUrl, info } = value
  const [companies, setCompanies] = useState<Company[]>([])
  const [focused, setFocused] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [error, setError] = useState("")

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
  const match = useMemo(() => matchCompany(companies, name), [companies, name])
  const pinned = useMemo(() => companies.filter((c) => c.pinned), [companies])

  const suggestions = useMemo(
    () =>
      companies
        .filter((c) => !c.pinned && c.id !== match?.id && (!query || normalizeCompanyName(c.name).includes(query)))
        .slice(0, 8),
    [companies, query, match],
  )

  // A saved company matches what was typed (its name or an alias), but the form is missing its
  // official name, logo or details.
  const canFillFromSaved =
    !!match &&
    (name.trim() !== match.name ||
      (!logoUrl && !!match.logoUrl) ||
      (!hasEmployerInfo(info) && hasEmployerInfo(match)))

  function pick(company: Company) {
    onChange({ name: company.name, logoUrl: company.logoUrl, info: pickEmployerInfo(company) })
    setFocused(false)
  }

  function handleNameChange(next: string) {
    // If the typed name moves away from the saved company that was matched, its logo and details no
    // longer belong to this name — drop them so a wrong ABN can never stay behind.
    const nextMatch = matchCompany(companies, next)
    if (match && nextMatch?.id !== match.id) {
      onChange({
        name: next,
        logoUrl: logoUrl === match.logoUrl ? "" : logoUrl,
        info: {},
      })
      return
    }
    onChange({ name: next, logoUrl, info })
  }

  async function handleDelete(company: Company) {
    if (!window.confirm(`Remove "${company.name}" from the saved company list?\n\nExisting applications keep their company name and logo.`)) {
      return
    }
    const ok = await deleteCompany(company.id)
    if (ok) setCompanies((list) => list.filter((c) => c.id !== company.id))
    else setError("Could not remove that company. Please try again.")
  }

  function handleSaved(saved: Company) {
    setCompanies((list) => sortCompanies([...list.filter((c) => c.id !== saved.id), saved]))
    setEditing(null)
  }

  const abnText = info.abn ? `ABN ${formatAbn(info.abn)}` : "No details yet"

  return (
    <div>
      {pinned.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Pin className="size-3.5" aria-hidden="true" /> Pinned companies
          </p>
          <ul className="space-y-1.5">
            {pinned.map((c) => {
              const selected = match?.id === c.id && name.trim() === c.name
              return (
                <li key={c.id} className="flex items-stretch gap-1">
                  <button
                    type="button"
                    onClick={() => pick(c)}
                    aria-pressed={selected}
                    className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition ${
                      selected ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white p-0.5">
                      {c.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.logoUrl} alt="" className="size-full object-contain" />
                      ) : (
                        <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block break-words text-sm font-medium leading-snug text-foreground">{c.name}</span>
                      {c.abn && <span className="block text-[11px] text-muted-foreground">ABN {formatAbn(c.abn)}</span>}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="shrink-0 rounded-lg border border-border bg-background px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Edit ${c.name}`}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {editing && <SavedCompanyEditor key={editing.id} company={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <LogoUploader logoUrl={logoUrl} onChange={(url) => onChange({ name, logoUrl: url, info })} />

        <div className="min-w-0 flex-1">
          <label htmlFor={`${idPrefix}-name`} className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Employer / Company Name
          </label>
          <input
            id={`${idPrefix}-name`}
            type="text"
            autoComplete="off"
            value={name}
            maxLength={160}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 180)}
            placeholder="Type a company name, or pick one above"
            className={INPUT_CLASS}
          />

          {canFillFromSaved && match && (
            <button
              type="button"
              onClick={() => pick(match)}
              className="mt-2 flex w-full items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-2.5 py-2 text-left text-xs text-foreground hover:bg-primary/10"
            >
              <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white p-0.5">
                {match.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={match.logoUrl} alt="" className="size-full object-contain" />
                ) : (
                  <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
                )}
              </span>
              <span>
                Use the saved official name, logo and details for <strong>{match.name}</strong>
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
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-foreground">{c.name}</span>
                      {c.abn && <span className="block text-[11px] text-muted-foreground">ABN {formatAbn(c.abn)}</span>}
                    </span>
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setEditing(c)}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Edit ${c.name}`}
                  >
                    <Pencil className="size-3.5" />
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

          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            aria-expanded={detailsOpen}
            className="mt-3 flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-left text-xs font-medium text-foreground hover:bg-muted"
          >
            <span>
              Company details <span className="font-normal text-muted-foreground">— {abnText}</span>
            </span>
            <ChevronDown className={`size-4 shrink-0 transition-transform ${detailsOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {detailsOpen && (
            <div className="mt-3">
              <DetailsFields info={info} onChange={(next) => onChange({ name, logoUrl, info: next })} />
            </div>
          )}

          <p className="mt-2 text-[11px] text-muted-foreground">
            Saved automatically to the permanent company list when you save. The company name, logo and details (ABN,
            address, contact) are shown on the applicant&apos;s tracking profile.
          </p>
          {error && (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
