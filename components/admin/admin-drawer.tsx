"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BrandMark } from "@/components/brand-logo"
import {
  Calculator,
  CalendarClock,
  ExternalLink,
  FileStack,
  Globe,
  LayoutGrid,
  LogOut,
  Search,
  Wallet,
  X,
} from "lucide-react"
import { logout } from "@/lib/admin/auth"

type DrawerLink = {
  label: string
  href: string
  icon: typeof LayoutGrid
  external?: boolean
}

const SECTIONS: { title: string; links: DrawerLink[] }[] = [
  {
    title: "Overview",
    links: [{ label: "Dashboard & Applications", href: "/admin/dashboard", icon: LayoutGrid }],
  },
  {
    title: "Documents",
    links: [{ label: "Documents", href: "/admin/documents", icon: FileStack }],
  },
  {
    title: "Payments",
    links: [{ label: "Payments", href: "/admin/payments", icon: Wallet }],
  },
  {
    title: "Public site",
    links: [
      { label: "Website home", href: "/", icon: Globe },
      { label: "Visa status page", href: "/track", icon: Search },
      { label: "Biometric booking", href: "/biometric", icon: CalendarClock },
      { label: "PR calculator", href: "/calculator", icon: Calculator },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "USCIS forms & fees", href: "https://www.uscis.gov/forms", icon: ExternalLink, external: true },
      {
        label: "USCIS processing times",
        href: "https://egov.uscis.gov/processing-times/",
        icon: ExternalLink,
        external: true,
      },
      {
        label: "OMARA agent register",
        href: "https://portal.mara.gov.au/search-the-register-of-migration-agents/",
        icon: ExternalLink,
        external: true,
      },
    ],
  },
]

export function AdminDrawer({
  open,
  onClose,
  adminName = "Admin User",
}: {
  open: boolean
  onClose: () => void
  adminName?: string
}) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  function isActive(href: string) {
    if (href === "/") return false
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Admin menu"
        className={`absolute inset-y-0 left-0 flex w-[84%] max-w-xs flex-col bg-card shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-4">
          <BrandMark className="size-10" title="Global Migration Hub" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate font-serif text-sm font-bold text-foreground">Global Migration Hub</p>
            <p className="truncate text-xs text-muted-foreground">{adminName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Admin sections">
          {SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.links.map((link) => {
                  const active = !link.external && isActive(link.href)
                  const classes = `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-muted hover:text-foreground"
                  }`
                  return (
                    <li key={link.label}>
                      {link.external ? (
                        <a href={link.href} target="_blank" rel="noopener noreferrer" className={classes}>
                          <link.icon className="size-4.5 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{link.label}</span>
                          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                        </a>
                      ) : (
                        <Link href={link.href} onClick={onClose} className={classes}>
                          {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary" />}
                          <link.icon className="size-4.5 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{link.label}</span>
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={async () => {
              await logout()
              onClose()
              router.replace("/admin/login")
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-muted"
          >
            <LogOut className="size-4.5" /> Log out
          </button>
        </div>
      </aside>
    </div>
  )
}
