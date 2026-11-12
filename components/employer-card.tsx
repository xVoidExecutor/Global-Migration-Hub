"use client"

import { useState } from "react"
import { Building2, ChevronDown, ExternalLink, Globe, Mail, MapPin, Phone } from "lucide-react"
import { abrLookupUrl, formatAbn, formatAcn, hasEmployerInfo, type EmployerInfo } from "@/lib/companies"

/**
 * Employer / company dropdown on the applicant's visa-check (/track) profile.
 * Looks like the other detail cards. Tap it to expand the company's full name,
 * ABN, ACN, address, contact details etc.
 */
export function EmployerCard({
  name,
  logoUrl,
  info,
  className = "",
  style,
}: {
  name: string
  logoUrl?: string
  info: EmployerInfo
  className?: string
  style?: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const expandable = hasEmployerInfo(info)
  const abnUrl = abrLookupUrl(info.abn)
  const website = info.website?.trim()
  const websiteLabel = website?.replace(/^https?:\/\//i, "").replace(/\/$/, "")

  return (
    <section
      aria-label="Employer details"
      style={style}
      className={`min-w-0 overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm ${className}`}
    >
      <button
        type="button"
        onClick={() => expandable && setOpen((v) => !v)}
        aria-expanded={expandable ? open : undefined}
        className={`flex w-full items-center gap-2.5 p-3.5 text-left sm:gap-3 sm:p-4 ${expandable ? "cursor-pointer" : "cursor-default"}`}
      >
        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 ring-1 ring-border/60 sm:size-11">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={name} className="size-full object-contain" />
          ) : (
            <Building2 className="size-5 text-muted-foreground" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">
            Employer Company
          </span>
          <span className="block break-words text-xs font-medium text-foreground sm:text-sm">{name}</span>
        </span>
        {expandable && (
          <ChevronDown
            className={`size-5 shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        )}
      </button>

      {expandable && (
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-dashed border-border px-4 pb-4 pt-3">
              <p className="break-words font-serif text-base font-semibold leading-snug text-foreground">{name}</p>
              {info.tradingName && info.tradingName.trim().toLowerCase() !== name.trim().toLowerCase() && (
                <p className="text-xs text-muted-foreground">Trading as {info.tradingName}</p>
              )}

              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
                {info.abn && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">ABN</dt>
                    <dd className="font-medium text-foreground">
                      {formatAbn(info.abn)}
                      {abnUrl && (
                        <a
                          href={abnUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-primary hover:underline"
                        >
                          Verify on ABR <ExternalLink className="size-3" aria-hidden="true" />
                        </a>
                      )}
                    </dd>
                  </div>
                )}
                {info.acn && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">ACN</dt>
                    <dd className="font-medium text-foreground">{formatAcn(info.acn)}</dd>
                  </div>
                )}
                {info.entityType && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Entity type</dt>
                    <dd className="font-medium text-foreground">{info.entityType}</dd>
                  </div>
                )}
                {info.address && (
                  <div className="sm:col-span-2">
                    <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <MapPin className="size-3" aria-hidden="true" /> Address
                    </dt>
                    <dd className="font-medium text-foreground">{info.address}</dd>
                  </div>
                )}
                {info.phone && (
                  <div>
                    <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <Phone className="size-3" aria-hidden="true" /> Phone
                    </dt>
                    <dd className="font-medium text-foreground">
                      <a href={`tel:${info.phone.replace(/[^\d+]/g, "")}`} className="hover:text-primary hover:underline">
                        {info.phone}
                      </a>
                    </dd>
                  </div>
                )}
                {info.email && (
                  <div className="min-w-0">
                    <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <Mail className="size-3" aria-hidden="true" /> Email
                    </dt>
                    <dd className="break-all font-medium text-foreground">
                      <a href={`mailto:${info.email}`} className="hover:text-primary hover:underline">
                        {info.email}
                      </a>
                    </dd>
                  </div>
                )}
                {website && (
                  <div className="min-w-0">
                    <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <Globe className="size-3" aria-hidden="true" /> Website
                    </dt>
                    <dd className="break-all font-medium text-foreground">
                      <a href={website} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
                        {websiteLabel}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              {info.about && (
                <p className="mt-3 border-t border-dashed border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                  {info.about}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
