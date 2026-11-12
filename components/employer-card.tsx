import { Building2, ExternalLink, Globe, Mail, MapPin, Phone } from "lucide-react"
import { abrLookupUrl, formatAbn, formatAcn, type EmployerInfo } from "@/lib/companies"

/**
 * Employer / company details on the applicant's visa-check (/track) profile:
 * logo (shown uncropped), full official name, ABN with a link to the government ABN Lookup, and contact details.
 */
export function EmployerCard({
  name,
  logoUrl,
  info,
}: {
  name: string
  logoUrl?: string
  info: EmployerInfo
}) {
  const abnUrl = abrLookupUrl(info.abn)
  const website = info.website?.trim()
  const websiteLabel = website?.replace(/^https?:\/\//i, "").replace(/\/$/, "")

  return (
    <section
      aria-label="Employer details"
      className="mt-4 w-full max-w-full rounded-2xl border border-border bg-secondary/40 p-4 text-left shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 ring-1 ring-border/60">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={name} className="size-full object-contain" />
          ) : (
            <Building2 className="size-6 text-muted-foreground" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Employer</p>
          <h2 className="break-words text-base font-semibold leading-snug text-foreground sm:text-lg">{name}</h2>
          {info.tradingName && info.tradingName.trim().toLowerCase() !== name.trim().toLowerCase() && (
            <p className="text-xs text-muted-foreground">Trading as {info.tradingName}</p>
          )}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
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

      {info.about && <p className="mt-3 border-t border-dashed border-border pt-3 text-xs leading-relaxed text-muted-foreground">{info.about}</p>}
    </section>
  )
}
