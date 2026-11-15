"use client"

import { useState, type FormEvent } from "react"
import { Mail, Phone, MapPin, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const details = [
  { icon: Mail, label: "Email", value: "ceo@globalmigrationhub.com", href: "mailto:ceo@globalmigrationhub.com" },
  { icon: Mail, label: "Email", value: "support@globalmigrationhub.com", href: "mailto:support@globalmigrationhub.com" },
  { icon: Mail, label: "Email", value: "info@globalmigrationhub.com", href: "mailto:info@globalmigrationhub.com" },
  { icon: Phone, label: "Phone", value: "+61 468 784 227", href: "tel:+61468784227" },
  { icon: Phone, label: "Phone", value: "+61 468 784 238", href: "tel:+61468784238" },
  { icon: MapPin, label: "Office", value: "Level 15, 100 Queen Street, Melbourne, VIC 3000, Australia", href: null },
]

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section id="contact" className="scroll-mt-20 bg-muted py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-accent">
              Get in touch
            </span>
            <h2 className="mt-3 text-balance font-serif text-3xl font-semibold text-foreground sm:text-4xl">
              Contact our advisors
            </h2>
            <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground">
              Have a question about your eligibility or application? Book a
              confidential consultation with an experienced immigration advisor today.
            </p>

            <ul className="mt-10 space-y-6">
              {details.map((detail) => (
                <li key={detail.label} className="flex items-start gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <detail.icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm text-muted-foreground">{detail.label}</p>
                    {detail.href ? (
                      <a href={detail.href} className="text-base font-medium text-foreground hover:text-primary hover:underline">
                        {detail.value}
                      </a>
                    ) : (
                      <p className="text-base font-medium text-foreground">{detail.value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl sm:p-8">
            {submitted ? (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="size-12 text-primary" aria-hidden="true" />
                <h3 className="mt-4 font-serif text-xl font-semibold">Message sent</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Thank you. One of our advisors will be in touch within one business day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="name" label="Full name" type="text" placeholder="Jane Doe" required />
                  <Field id="email" label="Email" type="email" placeholder="jane@email.com" required />
                </div>
                <Field id="subject" label="Subject" type="text" placeholder="Visa enquiry" />
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground">
                    How can we help?
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    required
                    placeholder="Tell us about your situation…"
                    className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <Button type="submit" size="lg" className="h-12 w-full text-base">
                  Send Message
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Field({
  id,
  label,
  type,
  placeholder,
  required,
}: {
  id: string
  label: string
  type: string
  placeholder: string
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
    </div>
  )
}
