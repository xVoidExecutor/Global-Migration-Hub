"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

const navLinks = [
  { label: "Work Permits", href: "#services" },
  { label: "Biometric Appointment", href: "/biometric" },
  { label: "PR Calculator", href: "/calculator" },
  { label: "Immigration News", href: "#news" },
  { label: "Contact", href: "#contact" },
]

const linkClass =
  "block border-b-4 border-transparent px-1 py-3 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:text-primary"

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="z-50 md:sticky md:top-0">
      <div className="border-b-4 border-accent bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a href="#top" className="flex min-w-0 items-center gap-3" aria-label="Global Migration Hub home">
            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-black ring-1 ring-white/30">
              <img src="/icon.png" alt="Global Migration Hub" className="size-full object-cover" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="whitespace-nowrap text-xl font-bold tracking-tight sm:text-2xl">Global Migration Hub</span>
              <span className="whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.14em] text-white/80 sm:text-[11px] sm:tracking-[0.22em]">
                Visa &amp; Immigration Consultancy
              </span>
            </span>
          </a>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/track"
              className="rounded-sm border border-white/60 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-primary"
            >
              Track application
            </Link>
            <Link
              href="/apply"
              className="rounded-sm bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-secondary"
            >
              Apply now
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-sm border border-white/60 p-2 text-white md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      <nav className="hidden border-b border-border bg-white md:block" aria-label="Primary">
        <div className="mx-auto flex max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
          {navLinks.map((link) =>
            link.href.startsWith("/") ? (
              <Link key={link.href} href={link.href} className={linkClass}>
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href} className={linkClass}>
                {link.label}
              </a>
            ),
          )}
        </div>
      </nav>

      {open && (
        <nav className="border-b border-border bg-white md:hidden" aria-label="Mobile">
          <div className="mx-auto flex max-w-7xl flex-col px-4 py-2">
            {navLinks.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-border py-3 text-base font-semibold text-foreground hover:text-accent"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-border py-3 text-base font-semibold text-foreground hover:text-accent"
                >
                  {link.label}
                </a>
              ),
            )}
            <Link
              href="/track"
              onClick={() => setOpen(false)}
              className="border-b border-border py-3 text-base font-semibold text-foreground hover:text-accent"
            >
              Track application
            </Link>
            <Link
              href="/apply"
              onClick={() => setOpen(false)}
              className="my-3 rounded-sm bg-primary px-4 py-3 text-center text-base font-semibold text-primary-foreground hover:bg-accent"
            >
              Apply now
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
