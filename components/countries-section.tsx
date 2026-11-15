"use client"

import { useState } from "react"
import Image from "next/image"
import { ArrowRight, ChevronDown, ChevronUp, Globe2 } from "lucide-react"
import { DESTINATION_COUNTRIES, ALL_COUNTRIES, COUNTRY_FLAGS } from "@/lib/countries"
import { EnquireModal } from "@/components/enquire-modal"
import { Reveal } from "@/components/reveal"

const countryDetails: Record<string, { visaTypes: string; image: string; alt: string }> = {
  "United Kingdom": {
    visaTypes: "Skilled Worker · Student · Family",
    image: "/images/countries/united-kingdom.png",
    alt: "Big Ben and the Houses of Parliament beside the River Thames in London",
  },
  Canada: {
    visaTypes: "Express Entry · Study Permit · PNP",
    image: "/images/countries/canada.png",
    alt: "Turquoise Moraine Lake framed by the Canadian Rockies",
  },
  Australia: {
    visaTypes: "Skilled Independent · Work · Student",
    image: "/images/countries/australia.png",
    alt: "Sydney Opera House and Harbour Bridge at sunset",
  },
  "United States": {
    visaTypes: "H-1B · L-1 · Green Card",
    image: "/images/countries/united-states.png",
    alt: "Statue of Liberty with the Manhattan skyline behind it",
  },
  Germany: {
    visaTypes: "EU Blue Card · Job Seeker · Student",
    image: "/images/countries/germany.png",
    alt: "The Brandenburg Gate in Berlin at golden hour",
  },
  "United Arab Emirates": {
    visaTypes: "Golden Visa · Employment · Investor",
    image: "/images/countries/united-arab-emirates.png",
    alt: "Burj Khalifa and the Dubai skyline at dusk",
  },
  France: {
    visaTypes: "Talent Passport · Student · Work",
    image: "/images/countries/France.png",
    alt: "The Eiffel Tower in Paris",
  },
  Italy: {
    visaTypes: "Work Visa · Student · Elective Residency",
    image: "/images/countries/Italy.png",
    alt: "A scenic view of an Italian city",
  },
  Netherlands: {
    visaTypes: "Highly Skilled Migrant · Student · Orientation Year",
    image: "/images/countries/Netherlands.png",
    alt: "Canals and traditional houses in the Netherlands",
  },
  Sweden: {
    visaTypes: "Work Permit · Student · Family",
    image: "/images/countries/Sweden.png",
    alt: "A scenic view of a city in Sweden",
  },
  Portugal: {
    visaTypes: "D7 Visa · Golden Visa · Student",
    image: "/images/countries/Portugal.png",
    alt: "A scenic coastal view in Portugal",
  },
  Ireland: {
    visaTypes: "Critical Skills · Student · Work Permit",
    image: "/images/countries/Ireland.png",
    alt: "A scenic view of the Irish countryside",
  },
  "New Zealand": {
    visaTypes: "Skilled Migrant · Work · Student",
    image: "/images/countries/New Zealand.png",
    alt: "A scenic landscape view in New Zealand",
  },
  Japan: {
    visaTypes: "Engineer/Specialist · Student · Work",
    image: "/images/countries/Japan.png",
    alt: "A scenic view of a landmark in Japan",
  },
  "South Korea": {
    visaTypes: "E-7 Work Visa · Student · Skilled Worker",
    image: "/images/countries/South Korea.png",
    alt: "A scenic view of a landmark in South Korea",
  },
  Singapore: {
    visaTypes: "Employment Pass · Student · S Pass",
    image: "/images/countries/Singapore.png",
    alt: "The Singapore skyline",
  },
  "Saudi Arabia": {
    visaTypes: "Work Visa · Premium Residency · Business",
    image: "/images/countries/Saudi Arabia.png",
    alt: "A scenic view of a landmark in Saudi Arabia",
  },
  Malaysia: {
    visaTypes: "Employment Pass · Student · MM2H",
    image: "/images/countries/Malaysia.png",
    alt: "A scenic view of a landmark in Malaysia",
  },
  Qatar: {
    visaTypes: "Employment Pass · Student · Business",
    image: "/images/countries/Qatar.png",
    alt: "A scenic view of a landmark in Qatar",
  },
  Spain: {
    visaTypes: "Employment Pass · Student · MM2H",
    image: "/images/countries/Spain.png",
    alt: "A scenic view of a landmark in Spain",
  },
  Romania: {
    visaTypes: "Work Visa · Student · EU Long-Term Residence",
    image: "/images/countries/Romania.png",
    alt: "A scenic view of a landmark in Romania",
  },
  Bulgaria: {
    visaTypes: "Work Visa · Student · Long-Term Residence",
    image: "/images/countries/Bulgaria.png",
    alt: "A scenic view of a landmark in Bulgaria",
  },
  Croatia: {
    visaTypes: "Work Visa · Student · EU Long-Term Residence",
    image: "/images/countries/Croatia.png",
    alt: "A scenic view of a landmark in Croatia",
  },
}
const countries = DESTINATION_COUNTRIES.map((name) => ({
  name,
  ...countryDetails[name],
}))

const remainingCountries = ALL_COUNTRIES.filter(
  (name) => !(DESTINATION_COUNTRIES as readonly string[]).includes(name),
)

export function CountriesSection() {
  const [showAll, setShowAll] = useState(false)
  const [enquireCountry, setEnquireCountry] = useState<string | null>(null)

  return (
    <section id="countries" className="scroll-mt-20 bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-accent-foreground">
            Where we work
          </span>
          <h2 className="mt-3 text-balance font-serif text-3xl font-semibold text-foreground sm:text-4xl">
            Popular Destinations
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
            Explore visa pathways across our most requested destinations. Our
            advisors guide you through every step of your relocation.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {countries.map((country, i) => (
            <Reveal
              as="article"
              key={country.name}
              delay={(i % 3) * 120}
              direction="zoom"
              className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
            >
              <Image
                src={country.image || "/placeholder.svg"}
                alt={country.alt}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/50 to-primary/10"
              />

              <div className="relative flex flex-col gap-4 p-6">
                <div>
                  <h3 className="text-balance font-serif text-2xl font-bold text-primary-foreground sm:text-3xl">
                    {country.name}
                  </h3>
                  <p className="mt-1.5 text-sm font-medium text-primary-foreground/80">
                    {country.visaTypes}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnquireCountry(country.name)}
                  className="group/btn inline-flex w-fit items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-all duration-200 hover:bg-accent/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                  aria-label={`Enquire now about visas for ${country.name}`}
                >
                  Enquire Now
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover/btn:translate-x-1" aria-hidden="true" />
                </button>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <Globe2 className="size-4" aria-hidden="true" />
            {showAll ? "Hide Countries" : "See More Countries"}
            {showAll ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
          </button>

          {showAll && (
            <div className="mt-8 w-full rounded-2xl border border-border bg-secondary/20 p-6 animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <p className="mb-6 text-center text-sm text-muted-foreground">
                We also help with applications for these destinations. Tap a country to start
                your application.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {remainingCountries.map((name, i) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setEnquireCountry(name)}
                    style={{ animationDelay: `${Math.min(i, 24) * 25}ms` }}
                    className="animate-in fade-in-0 zoom-in-95 duration-300 fill-mode-both group flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent/10 hover:shadow-md"
                  >
                    <span className="shrink-0 text-2xl leading-none transition-transform duration-200 group-hover:scale-125" aria-hidden="true">
                      {COUNTRY_FLAGS[name]}
                    </span>
                    <span className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-accent-foreground">
                      {name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <EnquireModal
        country={enquireCountry ?? undefined}
        open={enquireCountry !== null}
        onClose={() => setEnquireCountry(null)}
      />
    </section>
  )
}
