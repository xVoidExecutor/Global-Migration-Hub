"use client"

import Link from "next/link"
import { ArrowRight, ChevronRight } from "lucide-react"
import { ALL_COUNTRIES, VISA_TYPES } from "@/lib/countries"
import { CountUp } from "@/components/count-up"

const quickLinks = [
  { label: "Track your application", href: "/track" },
  { label: "Start a visa application", href: "/apply" },
  { label: "Book a biometric appointment", href: "/biometric" },
  { label: "PR points calculator", href: "/calculator" },
  { label: "Read immigration news", href: "#news" },
]

const stats = [
  { value: `${ALL_COUNTRIES.length}+`, label: "Countries supported" },
  { value: `${VISA_TYPES.length}`, label: "Visa categories" },
  { value: "24/7", label: "Advisor support" },
]

export function Hero() {
  return (
    <section id="top" className="bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.4fr_1fr] lg:gap-14 lg:px-8">
        <div>
          <p style={{ animationDelay: "0ms" }} className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700 fill-mode-both text-sm font-semibold uppercase tracking-wider text-white/80">
            Licensed immigration &amp; visa consultancy
          </p>
          <h1 style={{ animationDelay: "120ms" }} className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700 fill-mode-both mt-3 text-balance text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            Visa and immigration help you can trust
          </h1>
          <p style={{ animationDelay: "240ms" }} className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700 fill-mode-both mt-4 max-w-xl text-pretty text-base leading-relaxed text-white/85 sm:text-lg">
            From work permits to permanent residency, Global Migration Hub guides individuals and businesses through
            every step of the visa process with clarity, speed, and complete transparency.
          </p>

          <div style={{ animationDelay: "360ms" }} className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700 fill-mode-both mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/apply"
              className="gmh-shine group inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-white px-7 text-base font-semibold text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary hover:shadow-lg active:translate-y-0"
            >
              Start application
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <a
              href="#services"
              className="inline-flex h-12 items-center justify-center rounded-sm border-2 border-white px-7 text-base font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-primary active:translate-y-0"
            >
              Explore services
            </a>
          </div>
        </div>

        <aside
          aria-labelledby="quick-links-heading"
          style={{ animationDelay: "300ms" }}
          className="animate-in fade-in-0 slide-in-from-right-8 duration-700 fill-mode-both rounded-sm border-t-4 border-accent bg-white text-foreground shadow-xl shadow-black/10"
        >
          <h2 id="quick-links-heading" className="border-b border-border px-5 py-4 text-lg font-bold text-primary">
            Quick links
          </h2>
          <ul>
            {quickLinks.map((item, i) => (
              <li
                key={item.label}
                style={{ animationDelay: `${520 + i * 90}ms` }}
                className="animate-in fade-in-0 slide-in-from-right-4 duration-500 fill-mode-both border-b border-border last:border-b-0"
              >
                <Link
                  href={item.href}
                  className="group flex items-center justify-between gap-3 px-5 py-3.5 text-base font-medium text-accent underline-offset-2 transition-colors hover:bg-secondary hover:text-primary hover:underline"
                >
                  {item.label}
                  <ChevronRight className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <dl className="border-t border-white/20 bg-[#001a47]">
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-4 px-4 py-5 sm:px-6 lg:px-8">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              style={{ animationDelay: `${700 + i * 120}ms` }}
              className="animate-in fade-in-0 slide-in-from-bottom-3 duration-700 fill-mode-both"
            >
              <dt className="text-xs text-white/75 sm:text-sm">{stat.label}</dt>
              <dd className="text-2xl font-bold sm:text-3xl">
                <CountUp value={stat.value} />
              </dd>
            </div>
          ))}
        </div>
      </dl>
    </section>
  )
}
