import Link from "next/link"
import { BadgeCheck, ExternalLink, Globe2, Lock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react"

const columns = [
  {
    heading: "Our Services",
    links: [
      { label: "Work Permits & Visas", href: "/#services" },
      { label: "Destination Countries", href: "/#countries" },
      { label: "PR Points Calculator", href: "/calculator" },
      { label: "Immigration News", href: "/#news" },
    ],
  },
  {
    heading: "Client Portal",
    links: [
      { label: "Apply Now", href: "/apply" },
      { label: "Track Your Application", href: "/track" },
      { label: "Biometric Appointment", href: "/biometric" },
      { label: "Contact Us", href: "/#contact" },
    ],
  },
]

const trustPoints = [
  { icon: ShieldCheck, label: "Confidential consultations" },
  { icon: Lock, label: "Secure client portal" },
  { icon: Globe2, label: "Worldwide visa services" },
]

const registration = [
  { label: "Name on the register", value: "Andrew John Kerr" },
  { label: "MARN", value: "1069227" },
  { label: "Status", value: "Registered" },
  { label: "Business on the register", value: "Global Migration Hub, Australia" },
  { label: "Associated business on the register", value: "Cosmos Immigration, Dubai & Canada, UK, and USA" },
]

const OMARA_REGISTER_URL = "https://portal.mara.gov.au/search-the-register-of-migration-agents/"

export function SiteFooter() {
  return (
    <footer className="border-t-4 border-accent bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex size-11 items-center justify-center overflow-hidden rounded-sm bg-black ring-1 ring-white/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.png" alt="Global Migration Hub" className="size-full object-cover" />
              </span>
              <span className="text-lg font-bold text-white">Global Migration Hub</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/80">
              Registered migration agents helping individuals and businesses move
              across borders with confidence.
            </p>

            <ul className="mt-5 space-y-2.5">
              {trustPoints.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2.5 text-sm text-white">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-white/10 text-white">
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-bold uppercase tracking-wide text-white">{col.heading}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/85 underline-offset-2 transition-colors hover:text-white hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-white">Contact us</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/85">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-white" aria-hidden="true" />
                <span>Level 15, 100 Queen Street, Melbourne, VIC 3000, Australia</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-white" aria-hidden="true" />
                <span className="flex flex-col">
                  <a href="tel:+61468784227" className="underline-offset-2 transition-colors hover:text-white hover:underline">
                    +61 468 784 227
                  </a>
                  <a href="tel:+61468784238" className="underline-offset-2 transition-colors hover:text-white hover:underline">
                    +61 468 784 238
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-white" aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  <a
                    href="mailto:info@globalmigrationhub.com"
                    className="break-all underline-offset-2 transition-colors hover:text-white hover:underline"
                  >
                    info@globalmigrationhub.com
                  </a>
                  <a
                    href="mailto:support@globalmigrationhub.com"
                    className="break-all underline-offset-2 transition-colors hover:text-white hover:underline"
                  >
                    support@globalmigrationhub.com
                  </a>
                </span>
              </li>
            </ul>
          </div>
        </div>

        <section
          aria-labelledby="registration-heading"
          className="mt-12 rounded-sm border border-white/25 bg-white/5 p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-sm bg-white/10 text-white">
                <BadgeCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 id="registration-heading" className="text-sm font-bold text-white">
                  Registered Migration Agent
                </h3>
                <p className="text-xs text-white/75">
                  Office of the Migration Agents Registration Authority (OMARA), Australia
                </p>
              </div>
            </div>
            <a
              href={OMARA_REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white underline underline-offset-2 hover:text-white/80"
            >
              Verify on the OMARA register
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>

          <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {registration.map((item) => (
              <div key={item.label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-white/70">{item.label}</dt>
                <dd className="mt-1 text-sm font-semibold text-white">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-8 border-t border-white/25 pt-6">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-white/80">
              © {new Date().getFullYear()} Global Migration Hub. All rights reserved.
            </p>
            <p className="text-center text-xs text-white/80 sm:text-right">
              Registered Migration Agent · MARN 1069227
            </p>
          </div>
          <p className="mt-4 text-center text-xs leading-relaxed text-white/70 sm:text-left">
            Visa and immigration decisions are made solely by the relevant government authority.
            Global Migration Hub provides professional guidance and application support, and
            cannot guarantee any visa outcome. Your personal information is handled
            confidentially and is never shared without your consent.
          </p>
        </div>
      </div>
    </footer>
  )
}
